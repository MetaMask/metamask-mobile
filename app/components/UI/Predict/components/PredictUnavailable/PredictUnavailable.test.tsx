import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { InteractionManager } from 'react-native';
import PredictUnavailable, {
  PredictUnavailableRef,
} from './PredictUnavailable';

const mockNavigate = jest.fn();
const runAfterInteractionsCallbacks: (() => void)[] = [];
const mockRunAfterInteractions = jest.spyOn(
  InteractionManager,
  'runAfterInteractions',
);
const runAfterInteractionsMockImpl: typeof InteractionManager.runAfterInteractions =
  (task) => {
    if (typeof task === 'function') {
      runAfterInteractionsCallbacks.push(task as () => void);
    }

    return {
      then: jest.fn(),
      done: jest.fn(),
      cancel: jest.fn(),
    } as ReturnType<typeof InteractionManager.runAfterInteractions>;
  };

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const mockStrings: Record<string, string> = {
      'predict.unavailable.title': 'Unavailable in your region',
      'predict.unavailable.description':
        "Predictions aren't available in your region due to legal restrictions.",
      'predict.unavailable.link': 'See Polymarket terms',
      'predict.unavailable.webview_title': 'Polymarket Terms',
      'predict.unavailable.button': 'Got it',
    };
    return mockStrings[key] || key;
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaFrame: () => ({ x: 0, y: 0, width: 375, height: 812 }),
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: jest.fn(),
    canGoBack: jest.fn(() => true),
  }),
  useRoute: () => ({
    params: {},
  }),
}));

describe('PredictUnavailable', () => {
  const mockOnDismiss = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    runAfterInteractionsCallbacks.length = 0;
    mockRunAfterInteractions.mockImplementation(runAfterInteractionsMockImpl);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  afterAll(() => {
    mockRunAfterInteractions.mockRestore();
  });

  describe('rendering', () => {
    it('hides sheet elements when not opened', () => {
      const ref = React.createRef<PredictUnavailableRef>();

      render(<PredictUnavailable ref={ref} onDismiss={mockOnDismiss} />);

      expect(screen.queryByTestId('header')).not.toBeOnTheScreen();
    });

    it('displays sheet with header, terms link, and footer when opened', () => {
      const ref = React.createRef<PredictUnavailableRef>();

      render(<PredictUnavailable ref={ref} onDismiss={mockOnDismiss} />);

      act(() => {
        ref.current?.onOpenBottomSheet();
      });

      expect(screen.getByTestId('polymarket-terms-link')).toBeOnTheScreen();
      expect(screen.getByTestId('bottomsheetfooter')).toBeOnTheScreen();
    });
  });

  describe('interactions', () => {
    it('calls onDismiss when footer button is pressed', () => {
      const ref = React.createRef<PredictUnavailableRef>();

      render(<PredictUnavailable ref={ref} onDismiss={mockOnDismiss} />);
      act(() => {
        ref.current?.onOpenBottomSheet();
      });

      fireEvent.press(screen.getByTestId('bottomsheetfooter-button'));

      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });

    it('navigates to Polymarket terms webview when terms link is pressed', () => {
      const ref = React.createRef<PredictUnavailableRef>();

      render(<PredictUnavailable ref={ref} onDismiss={mockOnDismiss} />);
      act(() => {
        ref.current?.onOpenBottomSheet();
      });

      fireEvent.press(screen.getByTestId('polymarket-terms-link'));
      act(() => {
        runAfterInteractionsCallbacks.forEach((callback) => callback());
      });

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(
        'Webview',
        expect.objectContaining({
          screen: 'SimpleWebview',
          params: expect.objectContaining({
            url: 'https://polymarket.com/tos',
          }),
        }),
      );
    });
  });

  describe('ref methods', () => {
    it('opens sheet when onOpenBottomSheet is called', () => {
      const ref = React.createRef<PredictUnavailableRef>();

      render(<PredictUnavailable ref={ref} onDismiss={mockOnDismiss} />);

      act(() => {
        ref.current?.onOpenBottomSheet();
      });

      expect(screen.getByTestId('polymarket-terms-link')).toBeOnTheScreen();
    });

    it('closes sheet and calls onDismiss when onCloseBottomSheet is called', () => {
      const ref = React.createRef<PredictUnavailableRef>();

      render(<PredictUnavailable ref={ref} onDismiss={mockOnDismiss} />);
      act(() => {
        ref.current?.onOpenBottomSheet();
      });

      act(() => {
        ref.current?.onCloseBottomSheet();
      });

      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
    });
  });
});
