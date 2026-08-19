import {
  trackExternalLinkClicked,
  trackBlockExplorerLinkClicked,
  getExternalLinkHostname,
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
      isAnonymous: false,
      hasProperties: true,
    } as ITrackingEvent);
  });

  describe('getExternalLinkHostname', () => {
    it('returns hostname from a valid HTTPS URL', () => {
      expect(
        getExternalLinkHostname('https://etherscan.io/address/0x123'),
      ).toBe('etherscan.io');
    });

    it('returns hostname from a valid HTTP URL', () => {
      expect(getExternalLinkHostname('http://explorer.example/tx/0xabc')).toBe(
        'explorer.example',
      );
    });

    it('extracts hostname from protocol-less explorer URLs', () => {
      expect(getExternalLinkHostname('etherscan.io/tx/0x123')).toBe(
        'etherscan.io',
      );
    });

    it('falls back to regex extraction when URL parsing fails', () => {
      expect(
        getExternalLinkHostname('https://blockexplorer.com/tx/0x123'),
      ).toBe('blockexplorer.com');
    });

    it('returns empty string for empty input', () => {
      expect(getExternalLinkHostname('')).toBe('');
    });

    it('returns the original string when hostname cannot be extracted', () => {
      expect(getExternalLinkHostname('not-a-valid-url')).toBe(
        'not-a-valid-url',
      );
    });
  });

  describe('trackExternalLinkClicked', () => {
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

  describe('trackBlockExplorerLinkClicked', () => {
    it('sends url_domain as hostname only', () => {
      trackBlockExplorerLinkClicked(mockTrackEvent, mockCreateEventBuilder, {
        location: 'account_actions',
        text: 'View on Etherscan',
        url: 'https://etherscan.io/address/0x123',
      });

      expect(mockAddProperties).toHaveBeenCalledWith({
        location: 'account_actions',
        text: 'View on Etherscan',
        url_domain: 'etherscan.io',
      });
    });
  });
});
