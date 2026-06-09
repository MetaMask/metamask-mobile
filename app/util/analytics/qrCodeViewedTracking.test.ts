import {
  trackQrCodeViewed,
  QrCodeViewedProperties,
} from './qrCodeViewedTracking';
import { MetaMetricsEvents } from '../../core/Analytics';
import { ITrackingEvent } from './analytics.types';

jest.mock('../../core/Analytics');

describe('qrCodeViewedTracking', () => {
  const mockTrackEvent = jest.fn();
  const mockCreateEventBuilder = jest.fn();
  const mockAddProperties = jest.fn();
  const mockBuild = jest.fn();

  const mockProperties: QrCodeViewedProperties = {
    location: 'address-list',
    account_type: 'MetaMask',
    chain_id_caip: 'eip155:1',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockCreateEventBuilder.mockReturnValue({
      addProperties: mockAddProperties,
      build: mockBuild,
    });
    mockAddProperties.mockReturnValue({
      addProperties: mockAddProperties,
      build: mockBuild,
    });
    mockBuild.mockReturnValue({
      name: 'QR Code Viewed',
      properties: mockProperties,
      sensitiveProperties: {},
      saveDataRecording: false,
      isAnonymous: false,
      hasProperties: true,
    } as ITrackingEvent);
  });

  describe('trackQrCodeViewed', () => {
    it('creates event with QR_CODE_VIEWED', () => {
      trackQrCodeViewed(mockTrackEvent, mockCreateEventBuilder, mockProperties);

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.QR_CODE_VIEWED,
      );
    });

    it('adds link properties to the event builder', () => {
      trackQrCodeViewed(mockTrackEvent, mockCreateEventBuilder, mockProperties);

      expect(mockAddProperties).toHaveBeenCalledWith(mockProperties);
    });

    it('omits chain_id_caip when not provided', () => {
      trackQrCodeViewed(mockTrackEvent, mockCreateEventBuilder, {
        location: 'account-details',
        account_type: 'MetaMask',
      });

      expect(mockAddProperties).toHaveBeenCalledWith({
        location: 'account-details',
        account_type: 'MetaMask',
      });
    });

    it('builds and tracks the event', () => {
      trackQrCodeViewed(mockTrackEvent, mockCreateEventBuilder, mockProperties);

      expect(mockBuild).toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'QR Code Viewed',
        }),
      );
    });
  });
});
