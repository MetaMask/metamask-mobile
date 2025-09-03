import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Routes from '../../../../../constants/navigation/Routes';
import PerpsTutorialCarousel, {
  PERPS_RIVE_ARTBOARD_NAMES,
} from './PerpsTutorialCarousel';
import { strings } from '../../../../../../locales/i18n';
import { PERFORMANCE_CONFIG } from '../../constants/perpsConfig';

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

// Mock hooks
const mockMarkTutorialCompleted = jest.fn();
const mockTrack = jest.fn();
const mockDepositWithConfirmation = jest.fn().mockResolvedValue(undefined);

jest.mock('../../hooks', () => ({
  usePerpsFirstTimeUser: () => ({
    markTutorialCompleted: mockMarkTutorialCompleted,
  }),
  usePerpsTrading: () => ({
    depositWithConfirmation: mockDepositWithConfirmation,
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

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockMarkTutorialCompleted.mockClear();
    mockTrack.mockClear();
    mockDepositWithConfirmation.mockClear();
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
    (useRoute as jest.Mock).mockReturnValue({ params: {} });
    (useSafeAreaInsets as jest.Mock).mockReturnValue({ top: 0, bottom: 0 });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Component Rendering', () => {
    it('renders correct artboard names for each tutorial screen', async () => {
      const expectedArtboards = [
        PERPS_RIVE_ARTBOARD_NAMES.INTRO,
        PERPS_RIVE_ARTBOARD_NAMES.SHORT_LONG,
        PERPS_RIVE_ARTBOARD_NAMES.LEVERAGE,
        PERPS_RIVE_ARTBOARD_NAMES.LIQUIDATION,
        PERPS_RIVE_ARTBOARD_NAMES.CLOSE,
        PERPS_RIVE_ARTBOARD_NAMES.READY,
      ];

      // Render component once
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

        // Check that the correct artboard is rendered for current screen
        expect(screen.getByTestId('mock-rive-animation')).toBeOnTheScreen();
        expect(screen.getByTestId('mock-rive-artboard')).toHaveTextContent(
          expectedArtboards[i],
        );
      }
    });
  });

  describe('Navigation', () => {
    it('should navigate to deposit screen when on last screen and pressing continue', async () => {
      render(<PerpsTutorialCarousel />);

      // Navigate through all screens by pressing Continue 5 times (6 screens total)
      for (let i = 0; i < 5; i++) {
        const continueButton = screen.getByText(
          strings('perps.tutorial.continue'),
        );
        await act(async () => {
          fireEvent.press(continueButton);
        });
      }

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

    it('should go back when pressing Skip on first screen', () => {
      render(<PerpsTutorialCarousel />);

      act(() => {
        fireEvent.press(screen.getByText(strings('perps.tutorial.skip')));
      });

      expect(mockNavigation.goBack).toHaveBeenCalled();
      expect(mockMarkTutorialCompleted).not.toHaveBeenCalled();
      expect(mockDepositWithConfirmation).not.toHaveBeenCalled();
    });

    it('should mark tutorial as completed and go back when pressing Skip on last screen', async () => {
      render(<PerpsTutorialCarousel />);

      // Navigate to the last screen
      for (let i = 0; i < 5; i++) {
        const continueButton = screen.getByText(
          strings('perps.tutorial.continue'),
        );
        fireEvent.press(continueButton);
      }

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

      // Should mark tutorial as completed and go back, but NOT initialize deposit
      expect(mockMarkTutorialCompleted).toHaveBeenCalled();
      expect(mockNavigation.goBack).toHaveBeenCalled();
      expect(mockDepositWithConfirmation).not.toHaveBeenCalled();
    });

    it('should mark tutorial as completed when finishing tutorial', async () => {
      render(<PerpsTutorialCarousel />);

      // Navigate through all screens by pressing Continue 5 times to get to last screen
      for (let i = 0; i < 5; i++) {
        const continueButton = screen.getByText(
          strings('perps.tutorial.continue'),
        );
        await act(async () => {
          fireEvent.press(continueButton);
        });
      }

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
      for (let i = 0; i < 5; i++) {
        const continueButton = screen.getByText(
          strings('perps.tutorial.continue'),
        );
        await act(async () => {
          fireEvent.press(continueButton);
        });
      }

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

  describe('Deeplink Navigation', () => {
    it('should navigate to wallet home with Perps tab when skipping from deeplink', () => {
      // Mock route params to indicate deeplink origin
      (useRoute as jest.Mock).mockReturnValue({
        params: {
          isFromDeeplink: true,
        },
      });

      render(<PerpsTutorialCarousel />);

      // Press skip button
      act(() => {
        fireEvent.press(screen.getByText(strings('perps.tutorial.skip')));
      });

      // Should navigate to wallet home instead of goBack
      expect(mockNavigation.navigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
      expect(mockNavigation.goBack).not.toHaveBeenCalled();

      // Fast-forward timer to trigger setParams
      jest.advanceTimersByTime(PERFORMANCE_CONFIG.NAVIGATION_PARAMS_DELAY_MS);

      // Should set params to select Perps tab
      expect(mockNavigation.setParams).toHaveBeenCalledWith({
        initialTab: 'perps',
        shouldSelectPerpsTab: true,
      });
    });

    it('should navigate to wallet home with Perps tab when skipping from last screen with deeplink', async () => {
      // Mock route params to indicate deeplink origin
      (useRoute as jest.Mock).mockReturnValue({
        params: {
          isFromDeeplink: true,
        },
      });

      render(<PerpsTutorialCarousel />);

      // Navigate to the last screen
      for (let i = 0; i < 5; i++) {
        const continueButton = screen.getByText(
          strings('perps.tutorial.continue'),
        );
        fireEvent.press(continueButton);
      }

      // Press "Got it" button on last screen
      act(() => {
        fireEvent.press(screen.getByText(strings('perps.tutorial.got_it')));
      });

      // Should mark tutorial as completed
      expect(mockMarkTutorialCompleted).toHaveBeenCalled();

      // Should navigate to wallet home with Perps tab
      expect(mockNavigation.navigate).toHaveBeenCalledWith(Routes.WALLET.HOME);
      expect(mockNavigation.goBack).not.toHaveBeenCalled();

      // Fast-forward timer to trigger setParams
      jest.advanceTimersByTime(PERFORMANCE_CONFIG.NAVIGATION_PARAMS_DELAY_MS);

      // Should set params to select Perps tab
      expect(mockNavigation.setParams).toHaveBeenCalledWith({
        initialTab: 'perps',
        shouldSelectPerpsTab: true,
      });
    });

    it('should use goBack when not from deeplink', () => {
      // Default params (not from deeplink)
      (useRoute as jest.Mock).mockReturnValue({
        params: {},
      });

      render(<PerpsTutorialCarousel />);

      // Press skip button
      act(() => {
        fireEvent.press(screen.getByText(strings('perps.tutorial.skip')));
      });

      // Should use goBack instead of navigate
      expect(mockNavigation.goBack).toHaveBeenCalled();
      expect(mockNavigation.navigate).not.toHaveBeenCalled();
    });

    it('should handle undefined route params gracefully', () => {
      // Mock route without params
      (useRoute as jest.Mock).mockReturnValue({
        params: undefined,
      });

      render(<PerpsTutorialCarousel />);

      // Press skip button
      act(() => {
        fireEvent.press(screen.getByText(strings('perps.tutorial.skip')));
      });

      // Should default to goBack behavior
      expect(mockNavigation.goBack).toHaveBeenCalled();
      expect(mockNavigation.navigate).not.toHaveBeenCalled();
    });

    it('should handle deposit confirmation error gracefully', async () => {
      // Mock deposit failure
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockDepositWithConfirmation.mockRejectedValue(
        new Error('Deposit failed'),
      );

      render(<PerpsTutorialCarousel />);

      // Navigate to last screen and press Add funds
      for (let i = 0; i < 5; i++) {
        const continueButton = screen.getByText(
          strings('perps.tutorial.continue'),
        );
        fireEvent.press(continueButton);
      }

      // Press Add funds button
      fireEvent.press(screen.getByText(strings('perps.tutorial.add_funds')));

      // The depositWithConfirmation is called asynchronously
      // We need to wait for the next tick for the promise to reject
      await Promise.resolve();

      // Should log error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to initialize deposit:',
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
