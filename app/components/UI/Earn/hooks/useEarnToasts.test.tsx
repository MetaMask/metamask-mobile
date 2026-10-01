import { renderHook } from '@testing-library/react-hooks';
import { toast, ToastSeverity } from '@metamask/design-system-react-native';
import { playNotification, NotificationMoment } from '../../../../util/haptics';
import useEarnToasts from './useEarnToasts';

jest.mock('../../../../util/haptics');

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return {
    ...actual,
    toast: Object.assign(jest.fn(), { dismiss: jest.fn() }),
  };
});

const mockToast = jest.mocked(toast);
const mockPlayNotification = jest.mocked(playNotification);

describe('useEarnToasts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('showToast', () => {
    it('calls toast with success options excluding hapticsType', () => {
      const { result } = renderHook(() => useEarnToasts());
      const testConfig = {
        ...result.current.EarnToastOptions.mUsdConversion.success,
      };

      result.current.showToast(testConfig);

      expect(mockToast).toHaveBeenCalledTimes(1);
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: ToastSeverity.Success,
          title: 'mUSD conversion successful',
        }),
      );
      expect(mockToast.mock.calls[0][0]).not.toHaveProperty('hapticsType');
    });

    it('triggers haptics with the config type', () => {
      const { result } = renderHook(() => useEarnToasts());

      result.current.showToast(
        result.current.EarnToastOptions.mUsdConversion.success,
      );

      expect(mockPlayNotification).toHaveBeenCalledTimes(1);
      expect(mockPlayNotification).toHaveBeenCalledWith(
        NotificationMoment.Success,
      );
    });
  });

  describe('EarnToastOptions structure', () => {
    it('includes mUsdConversion with inProgress, success, and failed options', () => {
      const { result } = renderHook(() => useEarnToasts());

      expect(result.current.EarnToastOptions.mUsdConversion).toBeDefined();
      expect(
        result.current.EarnToastOptions.mUsdConversion.inProgress,
      ).toBeDefined();
      expect(
        result.current.EarnToastOptions.mUsdConversion.success,
      ).toBeDefined();
      expect(
        result.current.EarnToastOptions.mUsdConversion.failed,
      ).toBeDefined();
    });

    it('configures success toast with Success severity', () => {
      const { result } = renderHook(() => useEarnToasts());

      const successToast =
        result.current.EarnToastOptions.mUsdConversion.success;

      expect(successToast.severity).toBe(ToastSeverity.Success);
      expect(successToast.hapticsType).toBe(NotificationMoment.Success);
      expect(successToast.hasNoTimeout).toBe(false);
    });

    it('configures inProgress toast with a spinner and no timeout', () => {
      const { result } = renderHook(() => useEarnToasts());

      const inProgressToast =
        result.current.EarnToastOptions.mUsdConversion.inProgress({
          tokenSymbol: 'ETH',
        });

      expect(inProgressToast.hapticsType).toBe(NotificationMoment.Warning);
      expect(inProgressToast.hasNoTimeout).toBe(true);
      expect(inProgressToast.startAccessory).toBeDefined();
    });

    it('configures failed toast with Danger severity', () => {
      const { result } = renderHook(() => useEarnToasts());

      const failedToast = result.current.EarnToastOptions.mUsdConversion.failed;

      expect(failedToast.severity).toBe(ToastSeverity.Danger);
      expect(failedToast.hapticsType).toBe(NotificationMoment.Error);
    });
  });

  describe('toast copy', () => {
    it('sets inProgress title from the token symbol', () => {
      const { result } = renderHook(() => useEarnToasts());

      const inProgressToast =
        result.current.EarnToastOptions.mUsdConversion.inProgress({
          tokenSymbol: 'ETH',
        });

      expect(inProgressToast.title).toEqual(expect.any(String));
      expect(inProgressToast.description).toBeUndefined();
    });

    it('sets success title and description', () => {
      const { result } = renderHook(() => useEarnToasts());

      const successToast =
        result.current.EarnToastOptions.mUsdConversion.success;

      expect(successToast.title).toEqual(expect.any(String));
      expect(successToast.description).toEqual(expect.any(String));
    });

    it('sets failed title without a description', () => {
      const { result } = renderHook(() => useEarnToasts());

      const failedToast = result.current.EarnToastOptions.mUsdConversion.failed;

      expect(failedToast.title).toEqual(expect.any(String));
      expect(failedToast.description).toBeUndefined();
    });
  });

  describe('haptics types', () => {
    it('triggers warning haptics for inProgress toast', () => {
      const { result } = renderHook(() => useEarnToasts());

      result.current.showToast(
        result.current.EarnToastOptions.mUsdConversion.inProgress({
          tokenSymbol: 'ETH',
        }),
      );

      expect(mockPlayNotification).toHaveBeenCalledWith(
        NotificationMoment.Warning,
      );
    });

    it('triggers error haptics for failed toast', () => {
      const { result } = renderHook(() => useEarnToasts());

      result.current.showToast(
        result.current.EarnToastOptions.mUsdConversion.failed,
      );

      expect(mockPlayNotification).toHaveBeenCalledWith(
        NotificationMoment.Error,
      );
    });
  });

  describe('tronWithdrawal', () => {
    it('includes bullet descriptions when errors are provided', () => {
      const { result } = renderHook(() => useEarnToasts());

      const failedToast = result.current.EarnToastOptions.tronWithdrawal.failed(
        ['Network error', 'Insufficient balance'],
      );

      expect(failedToast.severity).toBe(ToastSeverity.Danger);
      expect(failedToast.description).toBe(
        '\u2022 Network error\n\u2022 Insufficient balance',
      );
    });

    it('omits description when there are no errors', () => {
      const { result } = renderHook(() => useEarnToasts());

      const failedToast = result.current.EarnToastOptions.tronWithdrawal.failed(
        [],
      );

      expect(failedToast.description).toBeUndefined();
    });
  });
});
