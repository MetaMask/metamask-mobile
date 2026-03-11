import { Linking } from 'react-native';
import InAppBrowser from 'react-native-inappbrowser-reborn';
import Device from '../../../../util/device';
import { RampsOrderStatus } from '@metamask/ramps-controller';
import { openExternalBrowserAndNavigate } from './openExternalBrowserCheckout';

jest.mock('../../../../util/device', () => ({
  isAndroid: jest.fn(() => false),
}));

jest.mock('react-native-inappbrowser-reborn', () => ({
  openAuth: jest.fn(),
  isAvailable: jest.fn(() => Promise.resolve(true)),
  closeAuth: jest.fn(),
}));

jest.mock('./extractOrderCode', () => ({
  extractOrderCode: (id: string) =>
    id.includes('/orders/') ? (id.split('/orders/')[1] ?? id) : id,
}));

const createParams = (overrides = {}) => ({
  buyWidgetUrl: 'https://pay.example.com/buy',
  deeplinkRedirectUrl: 'metamask://on-ramp/providers/paypal',
  effectiveOrderId: '/providers/paypal/orders/ord-1',
  effectiveWallet: '0x123',
  providerCode: 'paypal',
  network: '1',
  addPrecreatedOrder: jest.fn(),
  getOrderFromCallback: jest.fn(),
  addOrder: jest.fn(),
  navigateAfterBrowser: jest.fn(),
  ...overrides,
});

describe('openExternalBrowserAndNavigate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Device.isAndroid as jest.Mock).mockReturnValue(false);
    (InAppBrowser.isAvailable as jest.Mock).mockResolvedValue(true);
  });

  describe('when InAppBrowser is available', () => {
    it('calls addPrecreatedOrder when effectiveOrderId and effectiveWallet present', async () => {
      const params = createParams();
      (InAppBrowser.openAuth as jest.Mock).mockResolvedValue({
        type: 'success',
        url: 'metamask://on-ramp/providers/paypal?orderId=ord-1',
      });
      (params.getOrderFromCallback as jest.Mock).mockResolvedValue({
        providerOrderId: 'ord-1',
        status: RampsOrderStatus.Pending,
      });

      await openExternalBrowserAndNavigate(params);

      expect(params.addPrecreatedOrder).toHaveBeenCalledWith({
        orderId: params.effectiveOrderId,
        providerCode: 'paypal',
        walletAddress: '0x123',
        chainId: '1',
      });
    });

    it('navigates to buildQuote when openAuth result is not success', async () => {
      const params = createParams();
      (InAppBrowser.openAuth as jest.Mock).mockResolvedValue({
        type: 'cancel',
        url: null,
      });

      await openExternalBrowserAndNavigate(params);

      expect(params.getOrderFromCallback).not.toHaveBeenCalled();
      expect(params.navigateAfterBrowser).toHaveBeenCalledWith({
        type: 'buildQuote',
      });
    });

    it('navigates to buildQuote when result.url is missing', async () => {
      const params = createParams();
      (InAppBrowser.openAuth as jest.Mock).mockResolvedValue({
        type: 'success',
        url: null,
      });

      await openExternalBrowserAndNavigate(params);

      expect(params.navigateAfterBrowser).toHaveBeenCalledWith({
        type: 'buildQuote',
      });
    });

    it('navigates to buildQuote when order status is PRECREATED', async () => {
      const params = createParams();
      (InAppBrowser.openAuth as jest.Mock).mockResolvedValue({
        type: 'success',
        url: 'metamask://on-ramp/providers/paypal',
      });
      (params.getOrderFromCallback as jest.Mock).mockResolvedValue({
        providerOrderId: 'ord-1',
        status: RampsOrderStatus.Precreated,
      });

      await openExternalBrowserAndNavigate(params);

      expect(params.addOrder).not.toHaveBeenCalled();
      expect(params.navigateAfterBrowser).toHaveBeenCalledWith({
        type: 'buildQuote',
      });
    });

    it('navigates to buildQuote when order status is IdExpired', async () => {
      const params = createParams();
      (InAppBrowser.openAuth as jest.Mock).mockResolvedValue({
        type: 'success',
        url: 'metamask://on-ramp/providers/paypal',
      });
      (params.getOrderFromCallback as jest.Mock).mockResolvedValue({
        providerOrderId: 'ord-1',
        status: RampsOrderStatus.IdExpired,
      });

      await openExternalBrowserAndNavigate(params);

      expect(params.navigateAfterBrowser).toHaveBeenCalledWith({
        type: 'buildQuote',
      });
    });

    it('navigates to order details when order has valid status', async () => {
      const params = createParams();
      const order = {
        providerOrderId: 'ord-1',
        status: RampsOrderStatus.Pending,
      };
      (InAppBrowser.openAuth as jest.Mock).mockResolvedValue({
        type: 'success',
        url: 'metamask://on-ramp/providers/paypal?orderId=ord-1',
      });
      (params.getOrderFromCallback as jest.Mock).mockResolvedValue(order);

      await openExternalBrowserAndNavigate(params);

      expect(params.addOrder).toHaveBeenCalledWith(order);
      expect(params.navigateAfterBrowser).toHaveBeenCalledWith({
        type: 'order',
        orderCode: 'ord-1',
        providerCode: 'paypal',
        walletAddress: '0x123',
      });
    });

    it('navigates to buildQuote when getOrderFromCallback throws', async () => {
      const params = createParams();
      (InAppBrowser.openAuth as jest.Mock).mockResolvedValue({
        type: 'success',
        url: 'metamask://on-ramp/providers/paypal',
      });
      (params.getOrderFromCallback as jest.Mock).mockRejectedValue(
        new Error('API error'),
      );

      await openExternalBrowserAndNavigate(params);

      expect(params.navigateAfterBrowser).toHaveBeenCalledWith({
        type: 'buildQuote',
      });
    });

    it('calls closeAuth in finally', async () => {
      const params = createParams();
      (InAppBrowser.openAuth as jest.Mock).mockResolvedValue({
        type: 'success',
        url: 'x',
      });
      (params.getOrderFromCallback as jest.Mock).mockRejectedValue(new Error());

      await openExternalBrowserAndNavigate(params);

      expect(InAppBrowser.closeAuth).toHaveBeenCalled();
    });
  });

  describe('when Android or InAppBrowser unavailable', () => {
    it('uses Linking.openURL and navigates to buildQuote', async () => {
      (Device.isAndroid as jest.Mock).mockReturnValue(true);
      const params = createParams();

      await openExternalBrowserAndNavigate(params);

      expect(Linking.openURL).toHaveBeenCalledWith(params.buyWidgetUrl);
      expect(InAppBrowser.openAuth).not.toHaveBeenCalled();
      expect(params.navigateAfterBrowser).toHaveBeenCalledWith({
        type: 'buildQuote',
      });
    });

    it('uses Linking.openURL when InAppBrowser is not available', async () => {
      (InAppBrowser.isAvailable as jest.Mock).mockResolvedValue(false);
      const params = createParams();

      await openExternalBrowserAndNavigate(params);

      expect(Linking.openURL).toHaveBeenCalledWith(params.buyWidgetUrl);
      expect(params.navigateAfterBrowser).toHaveBeenCalledWith({
        type: 'buildQuote',
      });
    });
  });
});
