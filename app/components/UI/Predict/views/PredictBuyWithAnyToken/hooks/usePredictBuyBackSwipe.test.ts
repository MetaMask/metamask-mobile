import { renderHook } from '@testing-library/react-native';
import { BackHandler } from 'react-native';
import Device from '../../../../../../util/device';
import usePredictBuyBackSwipe from './usePredictBuyBackSwipe';

const mockAddListener = jest.fn();
const mockUnsubscribe = jest.fn();
const mockRemove = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    addListener: mockAddListener,
  }),
}));

jest.mock('../../../../../../util/device', () => ({
  __esModule: true,
  default: { isAndroid: jest.fn() },
}));

jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return {
    ...actual,
    BackHandler: {
      addEventListener: jest.fn(() => ({ remove: mockRemove })),
    },
  };
});

describe('usePredictBuyBackSwipe', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddListener.mockReturnValue(mockUnsubscribe);
  });

  describe('gestureEnd listener', () => {
    it('registers gestureEnd listener on navigation', () => {
      const onBack = jest.fn();

      renderHook(() => usePredictBuyBackSwipe({ onBack }));

      expect(mockAddListener).toHaveBeenCalledWith(
        'gestureEnd',
        expect.any(Function),
      );
    });

    it('calls onBack when gestureEnd fires', () => {
      const onBack = jest.fn();
      mockAddListener.mockImplementation(
        (event: string, callback: () => void) => {
          if (event === 'gestureEnd') {
            callback();
          }
          return mockUnsubscribe;
        },
      );

      renderHook(() => usePredictBuyBackSwipe({ onBack }));

      expect(onBack).toHaveBeenCalled();
    });

    it('unsubscribes gestureEnd listener on unmount', () => {
      const onBack = jest.fn();

      const { unmount } = renderHook(() => usePredictBuyBackSwipe({ onBack }));

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('BackHandler on Android', () => {
    beforeEach(() => {
      (Device.isAndroid as jest.Mock).mockReturnValue(true);
    });

    it('registers BackHandler on Android', () => {
      const onBack = jest.fn();
      const addEventListenerSpy = jest.spyOn(BackHandler, 'addEventListener');

      renderHook(() => usePredictBuyBackSwipe({ onBack }));

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'hardwareBackPress',
        expect.any(Function),
      );
    });

    it('calls onBack when hardware back pressed on Android', () => {
      const onBack = jest.fn();
      let capturedCallback: (() => boolean | null | undefined) | null = null;

      jest
        .spyOn(BackHandler, 'addEventListener')
        .mockImplementation((_eventName, handler) => {
          capturedCallback = handler;
          return { remove: mockRemove };
        });

      renderHook(() => usePredictBuyBackSwipe({ onBack }));

      if (capturedCallback) {
        (capturedCallback as () => boolean)();
      }

      expect(onBack).toHaveBeenCalled();
    });

    it('returns true from hardware back handler to prevent default', () => {
      const onBack = jest.fn();
      let capturedCallback: (() => boolean | null | undefined) | null = null;

      jest
        .spyOn(BackHandler, 'addEventListener')
        .mockImplementation((_eventName, handler) => {
          capturedCallback = handler;
          return { remove: mockRemove };
        });

      renderHook(() => usePredictBuyBackSwipe({ onBack }));

      let result = false;
      if (capturedCallback) {
        result = (capturedCallback as () => boolean)();
      }

      expect(result).toBe(true);
    });

    it('removes BackHandler subscription on unmount', () => {
      const onBack = jest.fn();

      jest.spyOn(BackHandler, 'addEventListener').mockImplementation(() => ({ remove: mockRemove }));

      const { unmount } = renderHook(() => usePredictBuyBackSwipe({ onBack }));

      unmount();

      expect(mockRemove).toHaveBeenCalled();
    });
  });

  describe('BackHandler on iOS', () => {
    beforeEach(() => {
      (Device.isAndroid as jest.Mock).mockReturnValue(false);
    });

    it('does not register BackHandler on iOS', () => {
      const onBack = jest.fn();
      const addEventListenerSpy = jest.spyOn(BackHandler, 'addEventListener');

      renderHook(() => usePredictBuyBackSwipe({ onBack }));

      expect(addEventListenerSpy).not.toHaveBeenCalled();
    });
  });
});
