import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Routes from '../../../../../constants/navigation/Routes';
import PerpsTutorialCarousel, {
  PERPS_RIVE_ARTBOARD_NAMES,
} from './PerpsTutorialCarousel';
import { strings } from '../../../../../../locales/i18n';
import { PerpsTutorialSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';

// Mock .riv file to prevent Jest parsing binary data
jest.mock(
  '../../animations/perps-onboarding-carousel-light.riv',
  () => 'mocked-riv-file',
);

jest.mock(
  '../../animations/perps-onboarding-carousel-dark.riv',
  () => 'mocked-riv-file',
);

// Mock Rive component
jest.mock('rive-react-native', () => {
  const MockRive = ({
    artboardName,
    testID,
  }: {
    artboardName?: string;
    testID?: string;
  }) => {
    const { View, Text } = jest.requireActual('react-native');
    return (
      <View testID={testID || 'mock-rive-animation'}>
        <Text testID="mock-rive-artboard">
          {artboardName || 'default-artboard'}
        </Text>
      </View>
    );
  };

  return {
    __esModule: true,
    default: MockRive,
    Fit: {
      Cover: 'cover',
      Contain: 'contain',
    },
    Alignment: {
      Center: 'center',
      TopCenter: 'topCenter',
      BottomCenter: 'bottomCenter',
    },
  };
});

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useRoute: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(),
}));

// Mock NavigationService
const mockNavigationServiceMethods = {
  navigate: jest.fn(),
  setParams: jest.fn(),
};

jest.mock('../../../../../core/NavigationService', () => ({
  __esModule: true,
  default: {
    get navigation() {
      return mockNavigationServiceMethods;
    },
  },
}));

// Mock hooks
const mockMarkTutorialCompleted = jest.fn();
const mockTrack = jest.fn();

// Mock the selector module first
jest.mock('../../selectors/perpsController', () => ({
  selectPerpsEligibility: jest.fn(),
}));

// Mock react-redux
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('../../hooks', () => ({
  usePerpsFirstTimeUser: () => ({
    markTutorialCompleted: mockMarkTutorialCompleted,
  }),
}));

jest.mock('../../hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: () => ({
    track: mockTrack,
  }),
}));

jest.mock('@tommasini/react-native-scrollable-tab-view', () => {
  const MockReact = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: MockReact.forwardRef(
      (
        {
          children,
          onChangeTab,
          initialPage,
        }: {
          children: React.ReactNode;
          onChangeTab?: (obj: { i: number }) => void;
          initialPage?: number;
        },
        ref: React.Ref<{ goToPage: (page: number) => void }>,
      ) => {
        const [currentPage, setCurrentPage] = MockReact.useState(
          initialPage || 0,
        );

        MockReact.useImperativeHandle(ref, () => ({
          goToPage: (page: number) => {
            setCurrentPage(page);
            if (onChangeTab) {
              onChangeTab({ i: page });
            }
          },
        }));

        // Only render the current page's child
        const childrenArray = MockReact.Children.toArray(children);
        return <View>{childrenArray[currentPage]}</View>;
      },
    ),
  };
});

describe('PerpsTutorialCarousel', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    setParams: jest.fn(),
  };

  // Helper function to navigate through screens
  const navigateToScreen = async (screenIndex: number) => {
    for (let i = 0; i < screenIndex; i++) {
      const continueButton = screen.getByText(
        strings('perps.tutorial.continue'),
      );
      await act(async () => {
        fireEvent.press(continueButton);
      });
      // Advance timers to clear the debounce
      act(() => {
        jest.advanceTimersByTime(100);
      });
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockMarkTutorialCompleted.mockClear();
    mockTrack.mockClear();
    mockNavigationServiceMethods.navigate.mockClear();
    mockNavigationServiceMethods.setParams.mockClear();
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
    (useRoute as jest.Mock).mockReturnValue({ params: {} });
    (useSafeAreaInsets as jest.Mock).mockReturnValue({ top: 0, bottom: 0 });

    // Default to eligible user
    const { useSelector } = jest.requireMock('react-redux');
    const mockSelectPerpsEligibility = jest.requireMock(
      '../../selectors/perpsController',
    ).selectPerpsEligibility;
    useSelector.mockImplementation((selector: unknown) => {
      if (selector === mockSelectPerpsEligibility) {
        return true;
      }
      return undefined;
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Component Rendering', () => {
    it('renders tutorial screens correctly', () => {
      render(<PerpsTutorialCarousel />);

      // Check that first screen renders with image
      expect(
        screen.getByTestId(PerpsTutorialSelectorsIDs.CHARACTER_IMAGE),
      ).toBeOnTheScreen();
      expect(screen.queryByTestId('mock-rive-animation')).toBeNull();

      // Check that tutorial content is rendered
      expect(
        screen.getByText(strings('perps.tutorial.what_are_perps.title')),
      ).toBeOnTheScreen();
    });
  });

  describe('Navigation', () => {
    it('should navigate to perps home when on last screen and pressing continue', async () => {
      render(<PerpsTutorialCarousel />);

      // Navigate through all screens by pressing Continue 5 times (6 screens total)
      await navigateToScreen(5);

      // Verify we're on the last screen
      expect(
        screen.getByText(strings('perps.tutorial.ready_to_trade.title')),
      ).toBeOnTheScreen();

      // Button should say "Got it" on last screen
      const continueButton = screen.getByTestId(
        'perps-tutorial-continue-button',
      );
      expect(continueButton).toBeOnTheScreen();

      // Press the "Got it" button
      await act(async () => {
        fireEvent.press(continueButton);
      });

      // Should mark tutorial as completed and navigate to perps home screen
      expect(mockMarkTutorialCompleted).toHaveBeenCalled();
      expect(mockNavigationServiceMethods.navigate).toHaveBeenCalledWith(
        Routes.PERPS.ROOT,
        {
          screen: Routes.PERPS.PERPS_HOME,
        },
      );
    });

    it('should navigate to markets list when pressing Skip on first screen', () => {
      render(<PerpsTutorialCarousel />);

      act(() => {
        fireEvent.press(screen.getByText(strings('perps.tutorial.skip')));
      });

      expect(mockNavigationServiceMethods.navigate).toHaveBeenCalledWith(
        Routes.PERPS.ROOT,
        {
          screen: Routes.PERPS.PERPS_HOME,
        },
      );
      expect(mockMarkTutorialCompleted).toHaveBeenCalled();
    });

    it("shows Learn more and Let's go buttons on last screen", async () => {
      render(<PerpsTutorialCarousel />);

      // Navigate to the last screen
      await navigateToScreen(5);

      // Verify we're on the last screen
      expect(
        screen.getByText(strings('perps.tutorial.ready_to_trade.title')),
      ).toBeOnTheScreen();

      // Skip button is hidden on last screen
      expect(screen.queryByTestId('perps-tutorial-skip-button')).toBeNull();

      // Learn more button should be visible on last screen
      const learnMoreButton = screen.getByTestId(
        'perps-tutorial-learn-more-button',
      );
      expect(learnMoreButton).toBeOnTheScreen();

      // Main "Let's go" button should be visible
      const continueButton = screen.getByTestId(
        'perps-tutorial-continue-button',
      );
      expect(continueButton).toBeOnTheScreen();
    });

    it('should mark tutorial as completed when finishing tutorial', async () => {
      render(<PerpsTutorialCarousel />);

      // Navigate through all screens by pressing Continue 5 times to get to last screen
      await navigateToScreen(5);

      // Press Got it button on last screen
      await act(async () => {
        fireEvent.press(screen.getByTestId('perps-tutorial-continue-button'));
      });

      // Should mark tutorial as completed and navigate to perps home
      expect(mockMarkTutorialCompleted).toHaveBeenCalled();
    });

    it('should navigate to perps home screen when on last screen', async () => {
      render(<PerpsTutorialCarousel />);

      // Navigate through all screens by pressing Continue 5 times
      await navigateToScreen(5);

      // Press Got it button on last screen
      await act(async () => {
        fireEvent.press(screen.getByTestId('perps-tutorial-continue-button'));
      });

      // Should navigate to perps home screen
      expect(mockNavigationServiceMethods.navigate).toHaveBeenCalledWith(
        Routes.PERPS.ROOT,
        {
          screen: Routes.PERPS.PERPS_HOME,
        },
      );
    });
  });

  describe('Eligibility-based Rendering', () => {
    describe('Eligible Users', () => {
      beforeEach(() => {
        const { useSelector } = jest.requireMock('react-redux');
        const mockSelectPerpsEligibility = jest.requireMock(
          '../../selectors/perpsController',
        ).selectPerpsEligibility;
        useSelector.mockImplementation((selector: unknown) => {
          if (selector === mockSelectPerpsEligibility) {
            return true;
          }
          return undefined;
        });
      });

      it('renders 5 screens with animations including ready_to_trade screen for eligible users', async () => {
        const expectedArtboards = [
          PERPS_RIVE_ARTBOARD_NAMES.SHORT_LONG,
          PERPS_RIVE_ARTBOARD_NAMES.LEVERAGE,
          PERPS_RIVE_ARTBOARD_NAMES.LIQUIDATION,
          PERPS_RIVE_ARTBOARD_NAMES.CLOSE,
          PERPS_RIVE_ARTBOARD_NAMES.READY,
        ];

        render(<PerpsTutorialCarousel />);

        // First screen has no animation, only static image
        expect(
          screen.getByTestId(PerpsTutorialSelectorsIDs.CHARACTER_IMAGE),
        ).toBeOnTheScreen();
        expect(
          screen.queryByTestId('mock-rive-animation'),
        ).not.toBeOnTheScreen();

        // Navigate through each screen sequentially and verify artboards
        for (const board of expectedArtboards) {
          const continueButton = screen.getByText(
            strings('perps.tutorial.continue'),
          );
          await act(async () => {
            fireEvent.press(continueButton);
          });
          // Advance timers to clear the debounce
          act(() => {
            jest.advanceTimersByTime(100);
          });

          // Check that the correct artboard is rendered for current screen
          expect(screen.getByTestId('mock-rive-animation')).toBeOnTheScreen();
          expect(screen.getByTestId('mock-rive-artboard')).toHaveTextContent(
            board,
          );
        }
      });

      it('shows "Let\'s go" and "Learn more" buttons on last screen for eligible users', async () => {
        render(<PerpsTutorialCarousel />);

        // Navigate through all screens to get to last screen
        await navigateToScreen(5);

        // Verify we're on the ready_to_trade screen
        expect(
          screen.getByText(strings('perps.tutorial.ready_to_trade.title')),
        ).toBeOnTheScreen();

        // Button should say "Let's go" on last screen for eligible users
        const continueButton = screen.getByTestId(
          'perps-tutorial-continue-button',
        );
        expect(continueButton).toBeOnTheScreen();

        // Learn more button should be visible on last screen
        const learnMoreButton = screen.getByTestId(
          'perps-tutorial-learn-more-button',
        );
        expect(learnMoreButton).toBeOnTheScreen();

        // Skip button is hidden on last screen
        expect(screen.queryByTestId('perps-tutorial-skip-button')).toBeNull();
      });

      it('navigates to perps home when eligible user completes tutorial', async () => {
        render(<PerpsTutorialCarousel />);

        // Navigate through all screens by pressing Continue 5 times
        await navigateToScreen(5);

        // Press the "Got it" button
        await act(async () => {
          fireEvent.press(screen.getByTestId('perps-tutorial-continue-button'));
        });

        // Should mark tutorial as completed and navigate to perps home
        expect(mockMarkTutorialCompleted).toHaveBeenCalled();
        expect(mockNavigationServiceMethods.navigate).toHaveBeenCalledWith(
          Routes.PERPS.ROOT,
          {
            screen: Routes.PERPS.PERPS_HOME,
          },
        );
      });

      it('shows skip button for eligible users on non-last screens', () => {
        render(<PerpsTutorialCarousel />);

        // Skip button should be visible and enabled for eligible users on first screen
        const skipButton = screen.getByTestId('perps-tutorial-skip-button');
        expect(skipButton).toBeOnTheScreen();
      });

      it('allows eligible users to skip tutorial', () => {
        render(<PerpsTutorialCarousel />);

        // Press skip button
        act(() => {
          fireEvent.press(screen.getByTestId('perps-tutorial-skip-button'));
        });

        // Should mark tutorial as completed and navigate to markets list
        expect(mockMarkTutorialCompleted).toHaveBeenCalled();
        expect(mockNavigationServiceMethods.navigate).toHaveBeenCalledWith(
          Routes.PERPS.ROOT,
          {
            screen: Routes.PERPS.PERPS_HOME,
          },
        );
      });
    });

    describe('Non-eligible Users', () => {
      beforeEach(() => {
        const { useSelector } = jest.requireMock('react-redux');
        const mockSelectPerpsEligibility = jest.requireMock(
          '../../selectors/perpsController',
        ).selectPerpsEligibility;
        useSelector.mockImplementation((selector: unknown) => {
          if (selector === mockSelectPerpsEligibility) {
            return false;
          }
          return undefined;
        });
      });

      it('renders 4 screens without ready_to_trade screen for non-eligible users', async () => {
        const expectedArtboards = [
          PERPS_RIVE_ARTBOARD_NAMES.SHORT_LONG,
          PERPS_RIVE_ARTBOARD_NAMES.LEVERAGE,
          PERPS_RIVE_ARTBOARD_NAMES.LIQUIDATION,
          PERPS_RIVE_ARTBOARD_NAMES.CLOSE,
          // No READY screen for non-eligible users
        ];

        render(<PerpsTutorialCarousel />);

        // First screen has no animation, only static image
        expect(
          screen.getByTestId(PerpsTutorialSelectorsIDs.CHARACTER_IMAGE),
        ).toBeOnTheScreen();
        expect(
          screen.queryByTestId('mock-rive-animation'),
        ).not.toBeOnTheScreen();

        // Navigate through each screen sequentially and verify artboards
        for (const board of expectedArtboards) {
          const continueButton = screen.getByText(
            strings('perps.tutorial.continue'),
          );
          await act(async () => {
            fireEvent.press(continueButton);
          });
          // Advance timers to clear the debounce
          act(() => {
            jest.advanceTimersByTime(100);
          });

          // Check that the correct artboard is rendered for current screen
          expect(screen.getByTestId('mock-rive-animation')).toBeOnTheScreen();
          expect(screen.getByTestId('mock-rive-artboard')).toHaveTextContent(
            board,
          );
        }

        // Verify we're on the close_anytime screen (last screen for non-eligible users)
        expect(
          screen.getByText(strings('perps.tutorial.close_anytime.title')),
        ).toBeOnTheScreen();

        // Should NOT show ready_to_trade screen
        expect(
          screen.queryByText(strings('perps.tutorial.ready_to_trade.title')),
        ).not.toBeOnTheScreen();
      });

      it('shows "Let\'s go" button and hides skip button on last screen for non-eligible users', async () => {
        render(<PerpsTutorialCarousel />);

        // Navigate through all screens to get to last screen (4 clicks for 5 screens)
        await navigateToScreen(4);

        // Verify we're on the close_anytime screen (last for non-eligible)
        expect(
          screen.getByText(strings('perps.tutorial.close_anytime.title')),
        ).toBeOnTheScreen();

        // Should show "Let's go" button
        const continueButton = screen.getByTestId(
          'perps-tutorial-continue-button',
        );
        expect(continueButton).toBeOnTheScreen();

        // Skip button is hidden on last screen (for both eligible and non-eligible users)
        expect(screen.queryByTestId('perps-tutorial-skip-button')).toBeNull();
      });

      it('shows skip button for non-eligible users on non-last screens', () => {
        render(<PerpsTutorialCarousel />);

        // Skip button should be visible for non-eligible users on first screen
        const skipButton = screen.getByTestId('perps-tutorial-skip-button');
        expect(skipButton).toBeOnTheScreen();
      });

      it('navigates to markets list when non-eligible user completes tutorial', async () => {
        render(<PerpsTutorialCarousel />);

        // Navigate through all screens by pressing Continue 4 times (5 screens total)
        await navigateToScreen(4);

        // Press the main "Got it" button (use the continue button testID to be specific)
        await act(async () => {
          fireEvent.press(screen.getByTestId('perps-tutorial-continue-button'));
        });

        // Should mark tutorial as completed and navigate to markets list
        expect(mockMarkTutorialCompleted).toHaveBeenCalled();
        expect(mockNavigationServiceMethods.navigate).toHaveBeenCalledWith(
          Routes.PERPS.ROOT,
          {
            screen: Routes.PERPS.PERPS_HOME,
          },
        );
        // Should NOT navigate using the mocked navigation (uses NavigationService instead)
        expect(mockNavigation.navigate).not.toHaveBeenCalled();
      });
    });
  });
});
