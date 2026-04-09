import { handleSignatureAction } from './signatureUtils';
import { analytics } from '../analytics/analytics';
import { AnalyticsEventBuilder } from '../analytics/AnalyticsEventBuilder';
import { MetaMetricsEvents } from '../../core/Analytics/MetaMetrics.events';

jest.mock('../analytics/analytics', () => ({
  analytics: { trackEvent: jest.fn() },
}));

const mockBuiltEvent = { name: 'test_event' };
const mockEventBuilder = {
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue(mockBuiltEvent),
};

jest.mock('../analytics/AnalyticsEventBuilder', () => ({
  AnalyticsEventBuilder: {
    createEventBuilder: jest.fn(() => mockEventBuilder),
  },
}));

jest.mock('../../core/Analytics/MetaMetrics.events', () => ({
  MetaMetricsEvents: {
    SIGNATURE_APPROVED: 'SIGNATURE_APPROVED',
    SIGNATURE_REJECTED: 'SIGNATURE_REJECTED',
  },
}));

jest.mock('../address', () => ({
  getAddressAccountType: jest.fn(() => 'MetaMask'),
}));

jest.mock('../../selectors/networkController', () => ({
  selectEvmChainId: jest.fn(() => '0x1'),
}));

jest.mock('../../store', () => ({
  store: { getState: jest.fn(() => ({})) },
}));

jest.mock('../networks', () => ({
  getDecimalChainId: jest.fn(() => '1'),
}));

jest.mock('../blockaid', () => ({
  getBlockaidMetricsParams: jest.fn(() => ({})),
}));

jest.mock('react-native', () => ({
  InteractionManager: { runAfterInteractions: jest.fn() },
}));

jest.mock('../../core/NotificationManager', () => ({
  showSimpleNotification: jest.fn(),
}));

jest.mock('../Logger');

describe('handleSignatureAction', () => {
  const mockMessageParams = {
    from: '0x123',
    origin: 'https://example.com',
    currentPageInformation: { url: 'https://example.com' },
    meta: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tracks SIGNATURE_APPROVED event on confirmation', async () => {
    const onAction = jest.fn().mockResolvedValue(undefined);

    await handleSignatureAction(
      onAction,
      mockMessageParams,
      'eth_signTypedData_v4',
      null,
      true,
    );

    expect(onAction).toHaveBeenCalled();
    expect(AnalyticsEventBuilder.createEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.SIGNATURE_APPROVED,
    );
    expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        account_type: 'MetaMask',
        signature_type: 'eth_signTypedData_v4',
      }),
    );
    expect(analytics.trackEvent).toHaveBeenCalledWith(mockBuiltEvent);
  });

  it('tracks SIGNATURE_REJECTED event on rejection', async () => {
    const onAction = jest.fn().mockResolvedValue(undefined);

    await handleSignatureAction(
      onAction,
      mockMessageParams,
      'eth_signTypedData_v4',
      null,
      false,
    );

    expect(AnalyticsEventBuilder.createEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.SIGNATURE_REJECTED,
    );
    expect(analytics.trackEvent).toHaveBeenCalledWith(mockBuiltEvent);
  });
});
