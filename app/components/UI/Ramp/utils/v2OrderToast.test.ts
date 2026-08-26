import { RampsOrderStatus } from '@metamask/ramps-controller';
import { toast, ToastSeverity } from '@metamask/design-system-react-native';
import {
  buildV2OrderToastOptions,
  showV2OrderToast,
  V2OrderToastParams,
} from './v2OrderToast';
import NavigationService from '../../../../core/NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return {
    ...actual,
    toast: Object.assign(jest.fn(), { dismiss: jest.fn() }),
  };
});

jest.mock('../../../../core/NavigationService', () => ({
  navigation: {
    navigate: jest.fn(),
  },
}));
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn(),
}));

describe('v2OrderToast', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('buildV2OrderToastOptions', () => {
    it('returns toast options for PENDING state with spinner and Track button', () => {
      (strings as jest.Mock)
        .mockReturnValueOnce('Processing your purchase of ETH')
        .mockReturnValueOnce('This should only take a few minutes...')
        .mockReturnValueOnce('Track');

      const params: V2OrderToastParams = {
        orderId: 'test-order-id',
        cryptocurrency: 'ETH',
        cryptoAmount: 1.5,
        status: RampsOrderStatus.Pending,
      };

      const result = buildV2OrderToastOptions(params);

      expect(result).not.toBeNull();
      expect(result?.hasNoTimeout).toBe(false);
      expect(result?.startAccessory).toBeDefined();
      expect(result?.title).toBe('Processing your purchase of ETH');
      expect(result?.description).toBe(
        'This should only take a few minutes...',
      );
      expect(result?.actionButtonLabel).toBe('Track');
      expect(result?.actionButtonOnPress).toBeDefined();
    });

    it('navigates to order details when Track button is pressed', () => {
      (strings as jest.Mock)
        .mockReturnValueOnce('Processing your purchase of ETH')
        .mockReturnValueOnce('This should only take a few minutes...')
        .mockReturnValueOnce('Track');

      const params: V2OrderToastParams = {
        orderId: 'test-order-id',
        cryptocurrency: 'ETH',
        status: RampsOrderStatus.Pending,
      };

      const result = buildV2OrderToastOptions(params);
      result?.actionButtonOnPress?.();

      expect(toast.dismiss).toHaveBeenCalled();
      expect(NavigationService.navigation.navigate).toHaveBeenCalledWith(
        Routes.RAMP.RAMPS_ORDER_DETAILS,
        { orderId: 'test-order-id', showCloseButton: true },
      );
    });

    it('returns toast options for COMPLETED state with success severity', () => {
      (strings as jest.Mock)
        .mockReturnValueOnce('Your purchase of 100.5 USDC was successful')
        .mockReturnValueOnce('Your USDC is now available');

      const params: V2OrderToastParams = {
        orderId: 'test-order-id',
        cryptocurrency: 'USDC',
        cryptoAmount: 100.5,
        status: RampsOrderStatus.Completed,
      };

      const result = buildV2OrderToastOptions(params);

      expect(result).not.toBeNull();
      expect(result?.severity).toBe(ToastSeverity.Success);
      expect(result?.hasNoTimeout).toBe(false);
      expect(result?.title).toBe('Your purchase of 100.5 USDC was successful');
      expect(result?.description).toBe('Your USDC is now available');
      expect(result?.actionButtonLabel).toBeUndefined();
    });

    it('returns toast options for Failed status with danger severity', () => {
      (strings as jest.Mock)
        .mockReturnValueOnce('Purchase of BTC failed')
        .mockReturnValueOnce('Please try again momentarily');

      const params: V2OrderToastParams = {
        orderId: 'test-order-id',
        cryptocurrency: 'BTC',
        status: RampsOrderStatus.Failed,
      };

      const result = buildV2OrderToastOptions(params);

      expect(result).not.toBeNull();
      expect(result?.severity).toBe(ToastSeverity.Danger);
      expect(result?.hasNoTimeout).toBe(false);
      expect(result?.title).toBe('Purchase of BTC failed');
      expect(result?.description).toBe('Please try again momentarily');
    });

    it('returns toast options for Cancelled status with warning severity', () => {
      (strings as jest.Mock)
        .mockReturnValueOnce('Your purchase was cancelled')
        .mockReturnValueOnce('Your purchase of DAI has been cancelled');

      const params: V2OrderToastParams = {
        orderId: 'test-order-id',
        cryptocurrency: 'DAI',
        status: RampsOrderStatus.Cancelled,
      };

      const result = buildV2OrderToastOptions(params);

      expect(result).not.toBeNull();
      expect(result?.severity).toBe(ToastSeverity.Warning);
      expect(result?.hasNoTimeout).toBe(false);
      expect(result?.title).toBe('Your purchase was cancelled');
      expect(result?.description).toBe(
        'Your purchase of DAI has been cancelled',
      );
    });

    it('returns null for Created status', () => {
      const params: V2OrderToastParams = {
        orderId: 'test-order-id',
        cryptocurrency: 'ETH',
        status: RampsOrderStatus.Created,
      };

      const result = buildV2OrderToastOptions(params);

      expect(result).toBeNull();
    });

    it('handles missing cryptoAmount for Completed status', () => {
      (strings as jest.Mock)
        .mockReturnValueOnce('Your purchase of  ETH was successful')
        .mockReturnValueOnce('Your ETH is now available');

      const params: V2OrderToastParams = {
        orderId: 'test-order-id',
        cryptocurrency: 'ETH',
        status: RampsOrderStatus.Completed,
      };

      const result = buildV2OrderToastOptions(params);

      expect(result).not.toBeNull();
      expect(result?.title).toBe('Your purchase of  ETH was successful');
    });
  });

  describe('showV2OrderToast', () => {
    it('calls toast with valid toast options', () => {
      (strings as jest.Mock)
        .mockReturnValueOnce('Your purchase of 1.5 ETH was successful')
        .mockReturnValueOnce('Your ETH is now available');

      const params: V2OrderToastParams = {
        orderId: 'test-order-id',
        cryptocurrency: 'ETH',
        cryptoAmount: 1.5,
        status: RampsOrderStatus.Completed,
      };

      showV2OrderToast(params);

      expect(toast).toHaveBeenCalledTimes(1);
      const callArg = jest.mocked(toast).mock.calls[0][0];
      expect(callArg.severity).toBe(ToastSeverity.Success);
      expect(callArg.title).toBe('Your purchase of 1.5 ETH was successful');
    });

    it('does not call toast for Created status', () => {
      const params: V2OrderToastParams = {
        orderId: 'test-order-id',
        cryptocurrency: 'ETH',
        status: RampsOrderStatus.Created,
      };

      showV2OrderToast(params);

      expect(toast).not.toHaveBeenCalled();
    });
  });
});
