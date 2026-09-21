import Braze from '@braze/react-native-sdk';
import { BrazePlugin } from './BrazePlugin';
import type {
  IdentifyEventType,
  TrackEventType,
} from '@segment/analytics-react-native';

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@braze/react-native-sdk');

const mockBraze = jest.mocked(Braze);

const makeTrackEvent = (
  event: string,
  properties?: Record<string, unknown>,
): TrackEventType =>
  ({
    type: 'track',
    event,
    properties,
    messageId: 'msg-1',
    timestamp: new Date().toISOString(),
  }) as unknown as TrackEventType;

const makeIdentifyEvent = (
  traits?: Record<string, unknown>,
): IdentifyEventType =>
  ({
    type: 'identify',
    userId: 'device-id',
    traits,
    messageId: 'msg-2',
    timestamp: new Date().toISOString(),
  }) as unknown as IdentifyEventType;

describe('BrazePlugin', () => {
  let plugin: BrazePlugin;

  beforeEach(() => {
    jest.clearAllMocks();
    plugin = new BrazePlugin();
  });

  describe('setBrazeProfileId', () => {
    it('returns true when Braze.changeUser runs for a new profile', () => {
      const didChangeUser = plugin.setBrazeProfileId('profile-123');

      expect(didChangeUser).toBe(true);
      expect(mockBraze.changeUser).toHaveBeenCalledWith('profile-123');
    });

    it('returns false when the same profileId is set again', () => {
      plugin.setBrazeProfileId('profile-123');

      const didChangeUser = plugin.setBrazeProfileId('profile-123');

      expect(didChangeUser).toBe(false);
    });

    it('does not call Braze.changeUser when profileId is undefined', () => {
      plugin.setBrazeProfileId(undefined);

      expect(mockBraze.changeUser).not.toHaveBeenCalled();
    });

    it('does not call Braze.changeUser when the same profileId is set again', () => {
      plugin.setBrazeProfileId('profile-123');
      mockBraze.changeUser.mockClear();

      plugin.setBrazeProfileId('profile-123');

      expect(mockBraze.changeUser).not.toHaveBeenCalled();
    });

    it('calls Braze.changeUser when a new plugin instance receives the same profileId', () => {
      plugin.setBrazeProfileId('profile-123');
      mockBraze.changeUser.mockClear();
      const secondPlugin = new BrazePlugin();

      secondPlugin.setBrazeProfileId('profile-123');

      expect(mockBraze.changeUser).toHaveBeenCalledWith('profile-123');
    });

    it('calls Braze.changeUser when the profileId changes', () => {
      plugin.setBrazeProfileId('profile-123');
      mockBraze.changeUser.mockClear();

      plugin.setBrazeProfileId('profile-456');

      expect(mockBraze.changeUser).toHaveBeenCalledWith('profile-456');
    });

    it('calls Braze.changeUser again after the profileId is cleared', () => {
      plugin.setBrazeProfileId('profile-123');
      plugin.setBrazeProfileId(undefined);
      mockBraze.changeUser.mockClear();

      plugin.setBrazeProfileId('profile-123');

      expect(mockBraze.changeUser).toHaveBeenCalledWith('profile-123');
    });

    it('flushes pending traits when profileId is set', () => {
      plugin.identify(makeIdentifyEvent({ trait1: 'a', trait2: 'b' }));
      expect(mockBraze.setCustomUserAttribute).not.toHaveBeenCalled();

      plugin.setBrazeProfileId('profile-123');

      expect(mockBraze.setCustomUserAttribute).toHaveBeenCalledWith(
        'trait1',
        'a',
      );
      expect(mockBraze.setCustomUserAttribute).toHaveBeenCalledWith(
        'trait2',
        'b',
      );
    });

    it('clears pending traits after flushing so they are not sent again', () => {
      plugin.identify(makeIdentifyEvent({ trait1: 'buffered' }));
      plugin.setBrazeProfileId('profile-123');

      expect(mockBraze.setCustomUserAttribute).toHaveBeenCalledTimes(1);
      mockBraze.setCustomUserAttribute.mockClear();

      plugin.setBrazeProfileId('profile-456');

      expect(mockBraze.setCustomUserAttribute).not.toHaveBeenCalled();
    });

    it('discards pending traits when profileId is cleared', () => {
      plugin.identify(makeIdentifyEvent({ trait1: 'buffered' }));
      plugin.setBrazeProfileId(undefined);

      expect(mockBraze.setCustomUserAttribute).not.toHaveBeenCalled();

      plugin.setBrazeProfileId('profile-123');

      expect(mockBraze.setCustomUserAttribute).not.toHaveBeenCalled();
    });
  });

  describe('track', () => {
    it('forwards events to Braze when profileId is set', () => {
      plugin.setBrazeProfileId('profile-123');
      const event = makeTrackEvent('Some Event', { screen: 'home' });

      const result = plugin.track(event);

      expect(mockBraze.logCustomEvent).toHaveBeenCalledWith('Some Event', {
        screen: 'home',
      });
      expect(result).toBe(event);
    });

    it('passes events through when profileId is not set', () => {
      const event = makeTrackEvent('Some Random Event');

      const result = plugin.track(event);

      expect(mockBraze.logCustomEvent).not.toHaveBeenCalled();
      expect(result).toBe(event);
    });

    it('stops forwarding after profileId is cleared', () => {
      plugin.setBrazeProfileId('profile-123');
      plugin.setBrazeProfileId(undefined);
      const event = makeTrackEvent('Some Event');

      const result = plugin.track(event);

      expect(mockBraze.logCustomEvent).not.toHaveBeenCalled();
      expect(result).toBe(event);
    });
  });

  describe('identify', () => {
    it('forwards all custom attributes to Braze when profileId is set', () => {
      plugin.setBrazeProfileId('profile-123');
      const event = makeIdentifyEvent({
        trait1: true,
        trait2: 'dark',
      });

      const result = plugin.identify(event);

      expect(mockBraze.setCustomUserAttribute).toHaveBeenCalledWith(
        'trait1',
        true,
      );
      expect(mockBraze.setCustomUserAttribute).toHaveBeenCalledWith(
        'trait2',
        'dark',
      );
      expect(result).toBe(event);
    });

    it('buffers traits when profileId is not set', () => {
      const event = makeIdentifyEvent({ trait1: true });

      const result = plugin.identify(event);

      expect(mockBraze.setCustomUserAttribute).not.toHaveBeenCalled();
      expect(result).toBe(event);
    });

    it('merges traits from multiple identify calls before profileId is set', () => {
      plugin.identify(makeIdentifyEvent({ trait1: 'value1' }));
      plugin.identify(makeIdentifyEvent({ trait2: 'value2' }));

      expect(mockBraze.setCustomUserAttribute).not.toHaveBeenCalled();

      plugin.setBrazeProfileId('profile-123');

      expect(mockBraze.setCustomUserAttribute).toHaveBeenCalledWith(
        'trait1',
        'value1',
      );
      expect(mockBraze.setCustomUserAttribute).toHaveBeenCalledWith(
        'trait2',
        'value2',
      );
    });

    it('uses last value when the same trait is identified multiple times before profileId', () => {
      plugin.identify(makeIdentifyEvent({ trait1: 'first' }));
      plugin.identify(makeIdentifyEvent({ trait1: 'second' }));

      plugin.setBrazeProfileId('profile-123');

      expect(mockBraze.setCustomUserAttribute).toHaveBeenCalledTimes(1);
      expect(mockBraze.setCustomUserAttribute).toHaveBeenCalledWith(
        'trait1',
        'second',
      );
    });

    it('skips traits when event has no traits', () => {
      plugin.setBrazeProfileId('profile-123');
      const event = makeIdentifyEvent(undefined);

      const result = plugin.identify(event);

      expect(mockBraze.setCustomUserAttribute).not.toHaveBeenCalled();
      expect(result).toBe(event);
    });

    it('skips undefined trait values', () => {
      plugin.setBrazeProfileId('profile-123');
      const event = makeIdentifyEvent({
        trait1: 'dark',
        undefinedField: undefined,
        trait2: 42,
      });

      plugin.identify(event);

      expect(mockBraze.setCustomUserAttribute).toHaveBeenCalledWith(
        'trait1',
        'dark',
      );
      expect(mockBraze.setCustomUserAttribute).toHaveBeenCalledWith(
        'trait2',
        42,
      );
      expect(mockBraze.setCustomUserAttribute).not.toHaveBeenCalledWith(
        'undefinedField',
        expect.anything(),
      );
    });

    it('does not resend traits that already have the same sanitized value', () => {
      plugin.setBrazeProfileId('profile-123');
      plugin.identify(
        makeIdentifyEvent({
          trait1: 'dark',
          chain_id_list: ['eip155:1', 'eip155:137'],
        }),
      );
      mockBraze.setCustomUserAttribute.mockClear();

      plugin.identify(
        makeIdentifyEvent({
          trait1: 'dark',
          chain_id_list: ['eip155:1', 'eip155:137'],
        }),
      );

      expect(mockBraze.setCustomUserAttribute).not.toHaveBeenCalled();
    });

    it('resends a trait when its sanitized value changes', () => {
      plugin.setBrazeProfileId('profile-123');
      plugin.identify(makeIdentifyEvent({ chain_id_list: ['eip155:1'] }));
      mockBraze.setCustomUserAttribute.mockClear();

      plugin.identify(
        makeIdentifyEvent({ chain_id_list: ['eip155:1', 'eip155:137'] }),
      );

      expect(mockBraze.setCustomUserAttribute).toHaveBeenCalledWith(
        'chain_id_list',
        ['eip155:1', 'eip155:137'],
      );
    });

    it('resends traits after the Braze user changes', () => {
      plugin.setBrazeProfileId('profile-123');
      plugin.identify(makeIdentifyEvent({ trait1: 'dark' }));
      mockBraze.setCustomUserAttribute.mockClear();

      plugin.setBrazeProfileId('profile-456');
      plugin.identify(makeIdentifyEvent({ trait1: 'dark' }));

      expect(mockBraze.setCustomUserAttribute).toHaveBeenCalledWith(
        'trait1',
        'dark',
      );
    });
  });

  describe('setLanguage', () => {
    it('sends language to Braze immediately when profileId is set', () => {
      plugin.setBrazeProfileId('profile-123');

      plugin.setLanguage('fr');

      expect(mockBraze.setLanguage).toHaveBeenCalledWith('fr');
    });

    it('does not send language when profileId is not set', () => {
      plugin.setLanguage('fr');

      expect(mockBraze.setLanguage).not.toHaveBeenCalled();
    });

    it('sends stored language when profileId is set later', () => {
      plugin.setLanguage('fr');
      expect(mockBraze.setLanguage).not.toHaveBeenCalled();

      plugin.setBrazeProfileId('profile-123');

      expect(mockBraze.setLanguage).toHaveBeenCalledWith('fr');
    });

    it('sends the latest language when profileId is set after multiple changes', () => {
      plugin.setLanguage('fr');
      plugin.setLanguage('ja');

      plugin.setBrazeProfileId('profile-123');

      expect(mockBraze.setLanguage).toHaveBeenCalledWith('ja');
      expect(mockBraze.setLanguage).not.toHaveBeenCalledWith('fr');
    });

    it('sends language on every profile change', () => {
      plugin.setLanguage('fr');
      plugin.setBrazeProfileId('profile-123');

      expect(mockBraze.setLanguage).toHaveBeenCalledWith('fr');
      mockBraze.setLanguage.mockClear();

      plugin.setBrazeProfileId('profile-456');

      expect(mockBraze.setLanguage).toHaveBeenCalledWith('fr');
    });

    it('does not resend language when the profileId is unchanged', () => {
      plugin.setLanguage('fr');
      plugin.setBrazeProfileId('profile-123');
      mockBraze.setLanguage.mockClear();

      plugin.setBrazeProfileId('profile-123');

      expect(mockBraze.setLanguage).not.toHaveBeenCalled();
    });

    it('does not resend language when setLanguage is called with the same locale', () => {
      plugin.setBrazeProfileId('profile-123');
      plugin.setLanguage('fr');
      mockBraze.setLanguage.mockClear();

      plugin.setLanguage('fr');

      expect(mockBraze.setLanguage).not.toHaveBeenCalled();
    });
  });

  describe('flush', () => {
    it('does not force an immediate Braze data flush', () => {
      plugin.setBrazeProfileId('profile-123');

      plugin.flush();

      expect(mockBraze.requestImmediateDataFlush).not.toHaveBeenCalled();
    });
  });

  describe('screen', () => {
    it('always passes the event through', () => {
      const event = {
        type: 'screen',
        name: 'Home',
      } as unknown as Parameters<BrazePlugin['screen']>[0];

      const result = plugin.screen(event);

      expect(result).toBe(event);
    });
  });
});
