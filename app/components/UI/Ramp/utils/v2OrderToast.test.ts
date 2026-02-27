import { lightTheme } from '@metamask/design-tokens';
import { FIAT_ORDER_STATES } from '../../../../constants/on-ramp';
import { ToastVariants } from '../../../../component-library/components/Toast/Toast.types';
import {
  buildV2OrderToastOptions,
  showV2OrderToast,
  V2OrderToastParams,
} from './v2OrderToast';
import ToastService from '../../../../core/ToastService';
import NavigationService from '../../../../core/NavigationService';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';

jest.mock('../../../../core/ToastService');
jest.mock('../../../../core/NavigationService', () => ({
  navigation: {
    navigate: jest.fn(),
  },
}));
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn(),
}));

describe('v2OrderToast', () => {
  const mockToastService = ToastService as jest.Mocked<typeof ToastService>;

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
        state: FIAT_ORDER_STATES.PENDING,
        colors: lightTheme.colors,
      };

      const result = buildV2OrderToastOptions(params);

      expect(result).not.toBeNull();
      expect(result?.variant).toBe(ToastVariants.Plain);
      expect(result?.hasNoTimeout).toBe(false);
      expect(result?.startAccessory).toBeDefined();
      expect(result?.labelOptions?.[0]?.label).toBe(
        'Processing your purchase of ETH',
      );
      expect(result?.labelOptions?.[0]?.isBold).toBe(true);
      expect(result?.descriptionOptions?.description).toBe(
        'This should only take a few minutes...',
      );
      expect(result?.linkButtonOptions?.label).toBe('Track');
      expect(result?.linkButtonOptions?.onPress).toBeDefined();
    });

    it('navigates to order details when Track button is pressed', () => {
      (strings as jest.Mock)
        .mockReturnValueOnce('Processing your purchase of ETH')
        .mockReturnValueOnce('This should only take a few minutes...')
        .mockReturnValueOnce('Track');

      const params: V2OrderToastParams = {
        orderId: 'test-order-id',
        cryptocurrency: 'ETH',
        state: FIAT_ORDER_STATES.PENDING,
        colors: lightTheme.colors,
      };

      const result = buildV2OrderToastOptions(params);
      result?.linkButtonOptions?.onPress();

      expect(mockToastService.closeToast).toHaveBeenCalled();
      expect(NavigationService.navigation.navigate).toHaveBeenCalledWith(
        Routes.RAMP.RAMPS_ORDER_DETAILS,
        { orderId: 'test-order-id', showCloseButton: true },
      );
    });

    it('returns toast options for COMPLETED state with success icon', () => {
      (strings as jest.Mock)
        .mockReturnValueOnce('Your purchase of 100.5 USDC was successful!')
        .mockReturnValueOnce('Your USDC is now available');

      const params: V2OrderToastParams = {
        orderId: 'test-order-id',
        cryptocurrency: 'USDC',
        cryptoAmount: 100.5,
        state: FIAT_ORDER_STATES.COMPLETED,
        colors: lightTheme.colors,
      };

      const result = buildV2OrderToastOptions(params);

      expect(result).not.toBeNull();
      expect(result?.variant).toBe(ToastVariants.Plain);
      expect(result?.hasNoTimeout).toBe(false);
      expect(result?.startAccessory).toBeDefined();
      expect(result?.labelOptions?.[0]?.label).toBe(
        'Your purchase of 100.5 USDC was successful!',
      );
      expect(result?.labelOptions?.[0]?.isBold).toBe(true);
      expect(result?.descriptionOptions?.description).toBe(
        'Your USDC is now available',
      );
      expect(result?.linkButtonOptions).toBeUndefined();
    });

    it('returns toast options for FAILED state with error icon', () => {
      (strings as jest.Mock)
        .mockReturnValueOnce('Purchase of BTC failed')
        .mockReturnValueOnce('Please try again momentarily');

      const params: V2OrderToastParams = {
        orderId: 'test-order-id',
        cryptocurrency: 'BTC',
        state: FIAT_ORDER_STATES.FAILED,
        colors: lightTheme.colors,
      };

      const result = buildV2OrderToastOptions(params);

      expect(result).not.toBeNull();
      expect(result?.variant).toBe(ToastVariants.Plain);
      expect(result?.hasNoTimeout).toBe(false);
      expect(result?.startAccessory).toBeDefined();
      expect(result?.labelOptions?.[0]?.label).toBe('Purchase of BTC failed');
      expect(result?.labelOptions?.[0]?.isBold).toBe(true);
      expect(result?.descriptionOptions?.description).toBe(
        'Please try again momentarily',
      );
    });

    it('returns toast options for CANCELLED state with warning icon', () => {
      (strings as jest.Mock)
        .mockReturnValueOnce('Your purchase was cancelled')
        .mockReturnValueOnce('Your purchase of DAI has been cancelled');

      const params: V2OrderToastParams = {
        orderId: 'test-order-id',
        cryptocurrency: 'DAI',
        state: FIAT_ORDER_STATES.CANCELLED,
        colors: lightTheme.colors,
      };

      const result = buildV2OrderToastOptions(params);

      expect(result).not.toBeNull();
      expect(result?.variant).toBe(ToastVariants.Plain);
      expect(result?.hasNoTimeout).toBe(false);
      expect(result?.startAccessory).toBeDefined();
      expect(result?.labelOptions?.[0]?.label).toBe(
        'Your purchase was cancelled',
      );
      expect(result?.labelOptions?.[0]?.isBold).toBe(true);
      expect(result?.descriptionOptions?.description).toBe(
        'Your purchase of DAI has been cancelled',
      );
    });

    it('returns null for CREATED state', () => {
      const params: V2OrderToastParams = {
        orderId: 'test-order-id',
        cryptocurrency: 'ETH',
        state: FIAT_ORDER_STATES.CREATED,
        colors: lightTheme.colors,
      };

      const result = buildV2OrderToastOptions(params);

      expect(result).toBeNull();
    });

    it('handles missing cryptoAmount for COMPLETED state', () => {
      (strings as jest.Mock)
        .mockReturnValueOnce('Your purchase of  ETH was successful!')
        .mockReturnValueOnce('Your ETH is now available');

      const params: V2OrderToastParams = {
        orderId: 'test-order-id',
        cryptocurrency: 'ETH',
        state: FIAT_ORDER_STATES.COMPLETED,
        colors: lightTheme.colors,
      };

      const result = buildV2OrderToastOptions(params);

      expect(result).not.toBeNull();
      expect(result?.labelOptions?.[0]?.label).toBe(
        'Your purchase of  ETH was successful!',
      );
    });
  });

  describe('showV2OrderToast', () => {
    it('calls ToastService.showToast with valid toast options', () => {
      (strings as jest.Mock)
        .mockReturnValueOnce('Your purchase of 1.5 ETH was successful!')
        .mockReturnValueOnce('Your ETH is now available');

      const params: V2OrderToastParams = {
        orderId: 'test-order-id',
        cryptocurrency: 'ETH',
        cryptoAmount: 1.5,
        state: FIAT_ORDER_STATES.COMPLETED,
        colors: lightTheme.colors,
      };

      showV2OrderToast(params);

      expect(mockToastService.showToast).toHaveBeenCalledTimes(1);
      const callArg = mockToastService.showToast.mock.calls[0][0];
      expect(callArg.variant).toBe(ToastVariants.Plain);
      expect(callArg.startAccessory).toBeDefined();
    });

    it('does not call ToastService.showToast for CREATED state', () => {
      const params: V2OrderToastParams = {
        orderId: 'test-order-id',
        cryptocurrency: 'ETH',
        state: FIAT_ORDER_STATES.CREATED,
        colors: lightTheme.colors,
      };

      showV2OrderToast(params);

      expect(mockToastService.showToast).not.toHaveBeenCalled();
    });
  });
});
