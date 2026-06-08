import {
  trackExternalLinkClicked,
  ExternalLinkClickedProperties,
} from './externalLinkTracking';
import { MetaMetricsEvents } from '../../core/Analytics';
import { ITrackingEvent } from './analytics.types';

jest.mock('../../core/Analytics');

describe('externalLinkTracking', () => {
  const mockTrackEvent = jest.fn();
  const mockCreateEventBuilder = jest.fn();
  const mockAddProperties = jest.fn();
  const mockBuild = jest.fn();

  const mockProperties: ExternalLinkClickedProperties = {
    location: 'account_actions',
    text: 'View on Etherscan',
    url_domain: 'https://etherscan.io/address/0x123',
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
      name: 'External Link Clicked',
      properties: mockProperties,
      sensitiveProperties: {},
      saveDataRecording: false,
      isAnonymous: false,
      hasProperties: true,
    } as ITrackingEvent);
  });

  it('creates event with EXTERNAL_LINK_CLICKED', () => {
    trackExternalLinkClicked(
      mockTrackEvent,
      mockCreateEventBuilder,
      mockProperties,
    );

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.EXTERNAL_LINK_CLICKED,
    );
  });

  it('adds link properties to the event builder', () => {
    trackExternalLinkClicked(
      mockTrackEvent,
      mockCreateEventBuilder,
      mockProperties,
    );

    expect(mockAddProperties).toHaveBeenCalledWith(mockProperties);
  });

  it('builds and tracks the event', () => {
    trackExternalLinkClicked(
      mockTrackEvent,
      mockCreateEventBuilder,
      mockProperties,
    );

    expect(mockBuild).toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'External Link Clicked',
      }),
    );
  });
});
