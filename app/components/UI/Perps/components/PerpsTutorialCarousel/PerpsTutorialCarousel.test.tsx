import React from 'react';
import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
} from '@testing-library/react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Routes from '../../../../../constants/navigation/Routes';
import PerpsTutorialCarousel, {
  PERPS_RIVE_ARTBOARD_NAMES,
} from './PerpsTutorialCarousel';
import { strings } from '../../../../../../locales/i18n';

// Mock .riv file to prevent Jest parsing binary data
jest.mock(
  '../../animations/perps-onboarding-carousel-v4.riv',
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

// Mock dependencies
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
const mockDepositWithConfirmation = jest.fn().mockResolvedValue(undefined);

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
  usePerpsTrading: () => ({
    depositWithConfirmation: mockDepositWithConfirmation,
  }),
  usePerpsNetworkManagement: () => ({
    ensureArbitrumNetworkExists: jest.fn().mockResolvedValue(undefined),
  }),
}));

jest.mock('../../hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: () => ({
    track: mockTrack,
  }),
}));

jest.mock('react-native-scrollable-tab-view', () => {
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
    mockDepositWithConfirmation.mockClear();
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

      // Check that first screen renders with animation
      expect(screen.getByTestId('mock-rive-animation')).toBeOnTheScreen();
      expect(screen.getByTestId('mock-rive-artboard')).toHaveTextContent(
        PERPS_RIVE_ARTBOARD_NAMES.INTRO,
      );

      // Check that tutorial content is rendered
      expect(
        screen.getByText(strings('perps.tutorial.what_are_perps.title')),
      ).toBeOnTheScreen();
    });
  });

  describe('Navigation', () => {
    it('should navigate to deposit screen when on last screen and pressing continue', async () => {
      render(<PerpsTutorialCarousel />);

      // Navigate through all screens by pressing Continue 5 times (6 screens total)
      await navigateToScreen(5);

      // Verify we're on the last screen
      expect(
        screen.getByText(strings('perps.tutorial.ready_to_trade.title')),
      ).toBeOnTheScreen();

      // Button should say "Add funds" on last screen
      expect(
        screen.getByText(strings('perps.tutorial.add_funds')),
      ).toBeOnTheScreen();

      // Press the "Add funds" button
      await act(async () => {
        fireEvent.press(screen.getByText(strings('perps.tutorial.add_funds')));
      });

      // Should mark tutorial as completed and navigate to add funds screen
      expect(mockMarkTutorialCompleted).toHaveBeenCalled();
      expect(mockNavigation.navigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
      });
      expect(mockDepositWithConfirmation).toHaveBeenCalled();
    });

    it('should navigate to markets list when pressing Skip on first screen', () => {
      render(<PerpsTutorialCarousel />);

      act(() => {
        fireEvent.press(screen.getByText(strings('perps.tutorial.skip')));
      });

      expect(mockNavigationServiceMethods.navigate).toHaveBeenCalledWith(
        Routes.PERPS.ROOT,
        {
          screen: Routes.PERPS.MARKETS,
        },
      );
      expect(mockMarkTutorialCompleted).toHaveBeenCalled();
      expect(mockDepositWithConfirmation).not.toHaveBeenCalled();
    });

    it('should mark tutorial as completed and navigate to markets list when pressing Skip on last screen', async () => {
      render(<PerpsTutorialCarousel />);

      // Navigate to the last screen
      await navigateToScreen(5);

      // Verify we're on the last screen
      expect(
        screen.getByText(strings('perps.tutorial.ready_to_trade.title')),
      ).toBeOnTheScreen();

      // Skip button should say "Got it" on last screen
      expect(
        screen.getByText(strings('perps.tutorial.got_it')),
      ).toBeOnTheScreen();

      // Press the "Got it" button
      act(() => {
        fireEvent.press(screen.getByText(strings('perps.tutorial.got_it')));
      });

      // Should mark tutorial as completed and navigate to markets list, but NOT initialize deposit
      expect(mockMarkTutorialCompleted).toHaveBeenCalled();
      expect(mockNavigationServiceMethods.navigate).toHaveBeenCalledWith(
        Routes.PERPS.ROOT,
        {
          screen: Routes.PERPS.MARKETS,
        },
      );
      expect(mockDepositWithConfirmation).not.toHaveBeenCalled();
    });

    it('should mark tutorial as completed when finishing tutorial', async () => {
      render(<PerpsTutorialCarousel />);

      // Navigate through all screens by pressing Continue 5 times to get to last screen
      await navigateToScreen(5);

      // Press Add funds button on last screen
      await act(async () => {
        fireEvent.press(screen.getByText(strings('perps.tutorial.add_funds')));
      });

      // Should mark tutorial as completed and initialize deposit
      expect(mockMarkTutorialCompleted).toHaveBeenCalled();
      expect(mockDepositWithConfirmation).toHaveBeenCalled();
    });

    it('should navigate to add funds screen when on last screen', async () => {
      render(<PerpsTutorialCarousel />);

      // Navigate through all screens by pressing Continue 5 times
      await navigateToScreen(5);

      // Press Add funds button on last screen
      await act(async () => {
        fireEvent.press(screen.getByText(strings('perps.tutorial.add_funds')));
      });

      // Should navigate to add funds screen and initialize deposit
      expect(mockNavigation.navigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
      });
      expect(mockDepositWithConfirmation).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle deposit confirmation error gracefully', async () => {
      // Mock deposit failure
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockDepositWithConfirmation.mockRejectedValue(
        new Error('Deposit failed'),
      );

      render(<PerpsTutorialCarousel />);

      // Navigate to last screen and press Add funds
      await navigateToScreen(5);

      // Press Add funds button
      await act(async () => {
        fireEvent.press(screen.getByText(strings('perps.tutorial.add_funds')));
      });

      // Wait for the async operation to complete and error to be logged
      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to initialize deposit:',
          expect.any(Error),
        );
      });

      consoleErrorSpy.mockRestore();
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

      it('renders 6 screens including ready_to_trade screen for eligible users', async () => {
        const expectedArtboards = [
          PERPS_RIVE_ARTBOARD_NAMES.INTRO,
          PERPS_RIVE_ARTBOARD_NAMES.SHORT_LONG,
          PERPS_RIVE_ARTBOARD_NAMES.LEVERAGE,
          PERPS_RIVE_ARTBOARD_NAMES.LIQUIDATION,
          PERPS_RIVE_ARTBOARD_NAMES.CLOSE,
          PERPS_RIVE_ARTBOARD_NAMES.READY,
        ];

        render(<PerpsTutorialCarousel />);

        // Check first screen artboard
        expect(screen.getByTestId('mock-rive-animation')).toBeOnTheScreen();
        expect(screen.getByTestId('mock-rive-artboard')).toHaveTextContent(
          expectedArtboards[0],
        );

        // Navigate through each screen sequentially and verify artboards
        for (let i = 1; i < expectedArtboards.length; i++) {
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
            expectedArtboards[i],
          );
        }
      });

      it('shows "Add funds" button on last screen for eligible users', async () => {
        render(<PerpsTutorialCarousel />);

        // Navigate through all screens to get to last screen
        await navigateToScreen(5);

        // Verify we're on the ready_to_trade screen
        expect(
          screen.getByText(strings('perps.tutorial.ready_to_trade.title')),
        ).toBeOnTheScreen();

        // Button should say "Add funds" on last screen for eligible users
        expect(
          screen.getByText(strings('perps.tutorial.add_funds')),
        ).toBeOnTheScreen();
      });

      it('navigates to deposit screen when eligible user completes tutorial', async () => {
        render(<PerpsTutorialCarousel />);

        // Navigate through all screens by pressing Continue 5 times
        await navigateToScreen(5);

        // Press the "Add funds" button
        await act(async () => {
          fireEvent.press(
            screen.getByText(strings('perps.tutorial.add_funds')),
          );
        });

        // Should mark tutorial as completed and navigate to add funds screen
        expect(mockMarkTutorialCompleted).toHaveBeenCalled();
        expect(mockNavigation.navigate).toHaveBeenCalledWith(
          Routes.PERPS.ROOT,
          {
            screen: Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
          },
        );
        expect(mockDepositWithConfirmation).toHaveBeenCalled();
      });

      it('enables skip button for eligible users', () => {
        render(<PerpsTutorialCarousel />);

        // Skip button should be enabled for eligible users
        const skipButton = screen.getByTestId('perps-tutorial-skip-button');
        expect(skipButton.props.disabled).toBe(false);
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
            screen: Routes.PERPS.MARKETS,
          },
        );
        expect(mockDepositWithConfirmation).not.toHaveBeenCalled();
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

      it('renders 5 screens without ready_to_trade screen for non-eligible users', async () => {
        const expectedArtboards = [
          PERPS_RIVE_ARTBOARD_NAMES.INTRO,
          PERPS_RIVE_ARTBOARD_NAMES.SHORT_LONG,
          PERPS_RIVE_ARTBOARD_NAMES.LEVERAGE,
          PERPS_RIVE_ARTBOARD_NAMES.LIQUIDATION,
          PERPS_RIVE_ARTBOARD_NAMES.CLOSE,
          // No READY screen for non-eligible users
        ];

        render(<PerpsTutorialCarousel />);

        // Check first screen artboard
        expect(screen.getByTestId('mock-rive-animation')).toBeOnTheScreen();
        expect(screen.getByTestId('mock-rive-artboard')).toHaveTextContent(
          expectedArtboards[0],
        );

        // Navigate through each screen sequentially and verify artboards
        for (let i = 1; i < expectedArtboards.length; i++) {
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
            expectedArtboards[i],
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

      it('shows "Got it" button on last screen for non-eligible users', async () => {
        render(<PerpsTutorialCarousel />);

        // Navigate through all screens to get to last screen (4 clicks for 5 screens)
        await navigateToScreen(4);

        // Verify we're on the close_anytime screen (last for non-eligible)
        expect(
          screen.getByText(strings('perps.tutorial.close_anytime.title')),
        ).toBeOnTheScreen();

        // Should show "Got it" buttons (both main button and skip button show this text)
        const gotItButtons = screen.getAllByText(
          strings('perps.tutorial.got_it'),
        );
        expect(gotItButtons).toHaveLength(2); // Main button and skip button

        // Should NOT show "Add funds" button
        expect(
          screen.queryByText(strings('perps.tutorial.add_funds')),
        ).not.toBeOnTheScreen();
      });

      it('shows skip button for non-eligible users on non-last screens', () => {
        render(<PerpsTutorialCarousel />);

        // Skip button should be visible and enabled for non-eligible users on first screen
        const skipButton = screen.getByTestId('perps-tutorial-skip-button');
        expect(skipButton).toBeOnTheScreen();
        expect(skipButton.props.disabled).toBe(false);
      });

      it('disables skip button for non-eligible users on last screen', async () => {
        render(<PerpsTutorialCarousel />);

        // Navigate through all screens to get to last screen (4 clicks for 5 screens)
        await navigateToScreen(4);

        // Verify we're on the last screen (close_anytime screen for non-eligible users)
        expect(
          screen.getByText(strings('perps.tutorial.close_anytime.title')),
        ).toBeOnTheScreen();

        // Skip button should be present but disabled for non-eligible users on last screen
        const skipButton = screen.getByTestId('perps-tutorial-skip-button');
        expect(skipButton).toBeOnTheScreen();

        // The button should be disabled for non-eligible users on last screen
        expect(skipButton.props.disabled).toBe(true);
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
            screen: Routes.PERPS.MARKETS,
          },
        );
        // Should NOT navigate to deposit screen or call deposit
        expect(mockNavigation.navigate).not.toHaveBeenCalled();
        expect(mockDepositWithConfirmation).not.toHaveBeenCalled();
      });
    });
  });
});
