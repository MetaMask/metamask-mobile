import Braze from '@braze/react-native-sdk';
import { BrazePlugin } from './BrazePlugin';
import type {
  IdentifyEventType,
  TrackEventType,
} from '@segment/analytics-react-native';
import defaultAllowedEvents from './braze-allowed-events.json';

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    log: jest.fn(),
    error: jest.fn(),
  },
}));

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
    it('calls Braze.changeUser when a profileId is provided', () => {
      plugin.setBrazeProfileId('profile-123');

      expect(mockBraze.changeUser).toHaveBeenCalledWith('profile-123');
    });

    it('does not call Braze.changeUser when profileId is undefined', () => {
      plugin.setBrazeProfileId(undefined);

      expect(mockBraze.changeUser).not.toHaveBeenCalled();
    });
  });

  describe('track', () => {
    it('forwards allowed events to Braze when profileId is set', () => {
      plugin.setBrazeProfileId('profile-123');
      const allowedName = defaultAllowedEvents.allowedEvents[0];
      const event = makeTrackEvent(allowedName, { screen: 'home' });

      const result = plugin.track(event);

      expect(mockBraze.logCustomEvent).toHaveBeenCalledWith(allowedName, {
        screen: 'home',
      });
      expect(result).toBe(event);
    });

    it('blocks events not in the allowlist', () => {
      plugin.setBrazeProfileId('profile-123');
      const event = makeTrackEvent('Some Random Event');

      const result = plugin.track(event);

      expect(mockBraze.logCustomEvent).not.toHaveBeenCalled();
      expect(result).toBeUndefined();
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
      const allowedName = defaultAllowedEvents.allowedEvents[0];
      const event = makeTrackEvent(allowedName);

      const result = plugin.track(event);

      expect(mockBraze.logCustomEvent).not.toHaveBeenCalled();
      expect(result).toBe(event);
    });
  });

  describe('setAllowedEvents', () => {
    it('replaces the allowlist at runtime', () => {
      plugin.setBrazeProfileId('profile-123');
      plugin.setAllowedEvents(['Custom Event A', 'Custom Event B']);

      const allowed = makeTrackEvent('Custom Event A');
      const blocked = makeTrackEvent(defaultAllowedEvents.allowedEvents[0]);

      expect(plugin.track(allowed)).toBe(allowed);
      expect(plugin.track(blocked)).toBeUndefined();

      expect(mockBraze.logCustomEvent).toHaveBeenCalledTimes(1);
      expect(mockBraze.logCustomEvent).toHaveBeenCalledWith(
        'Custom Event A',
        undefined,
      );
    });

    it('can set an empty allowlist to block everything', () => {
      plugin.setBrazeProfileId('profile-123');
      plugin.setAllowedEvents([]);

      const event = makeTrackEvent(defaultAllowedEvents.allowedEvents[0]);

      expect(plugin.track(event)).toBeUndefined();
      expect(mockBraze.logCustomEvent).not.toHaveBeenCalled();
    });
  });

  describe('identify', () => {
    it('forwards allowed custom attributes to Braze when profileId is set', () => {
      plugin.setBrazeProfileId('profile-123');
      const allowedTrait1 = defaultAllowedEvents.allowedTraits[0];
      const allowedTrait2 = defaultAllowedEvents.allowedTraits[1];
      const event = makeIdentifyEvent({
        [allowedTrait1]: true,
        [allowedTrait2]: 'dark',
        blocked_trait: 'should_not_be_sent',
      });

      const result = plugin.identify(event);

      expect(mockBraze.setCustomUserAttribute).toHaveBeenCalledWith(
        allowedTrait1,
        true,
      );
      expect(mockBraze.setCustomUserAttribute).toHaveBeenCalledWith(
        allowedTrait2,
        'dark',
      );
      expect(mockBraze.setCustomUserAttribute).not.toHaveBeenCalledWith(
        'blocked_trait',
        expect.anything(),
      );
      expect(result).toBe(event);
    });

    it('does not set traits when profileId is not set', () => {
      const allowedTrait = defaultAllowedEvents.allowedTraits[0];
      const event = makeIdentifyEvent({ [allowedTrait]: true });

      const result = plugin.identify(event);

      expect(mockBraze.setCustomUserAttribute).not.toHaveBeenCalled();
      expect(result).toBe(event);
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
      const allowedTrait1 = defaultAllowedEvents.allowedTraits[0];
      const allowedTrait2 = defaultAllowedEvents.allowedTraits[1];
      const event = makeIdentifyEvent({
        [allowedTrait1]: 'dark',
        undefinedField: undefined,
        [allowedTrait2]: 42,
      });

      plugin.identify(event);

      expect(mockBraze.setCustomUserAttribute).toHaveBeenCalledWith(
        allowedTrait1,
        'dark',
      );
      expect(mockBraze.setCustomUserAttribute).toHaveBeenCalledWith(
        allowedTrait2,
        42,
      );
      expect(mockBraze.setCustomUserAttribute).not.toHaveBeenCalledWith(
        'undefinedField',
        expect.anything(),
      );
    });

    it('blocks traits not in the allowlist', () => {
      plugin.setBrazeProfileId('profile-123');
      const event = makeIdentifyEvent({
        random_trait: 'value',
        another_blocked: 123,
      });

      const result = plugin.identify(event);

      expect(mockBraze.setCustomUserAttribute).not.toHaveBeenCalled();
      expect(result).toBe(event);
    });
  });

  describe('setAllowedTraits', () => {
    it('replaces the trait allowlist at runtime', () => {
      plugin.setBrazeProfileId('profile-123');
      plugin.setAllowedTraits(['custom_trait_a', 'custom_trait_b']);

      const event = makeIdentifyEvent({
        custom_trait_a: 'allowed',
        [defaultAllowedEvents.allowedTraits[0]]: 'blocked',
      });

      plugin.identify(event);

      expect(mockBraze.setCustomUserAttribute).toHaveBeenCalledTimes(1);
      expect(mockBraze.setCustomUserAttribute).toHaveBeenCalledWith(
        'custom_trait_a',
        'allowed',
      );
      expect(mockBraze.setCustomUserAttribute).not.toHaveBeenCalledWith(
        defaultAllowedEvents.allowedTraits[0],
        expect.anything(),
      );
    });

    it('can set an empty trait allowlist to block everything', () => {
      plugin.setBrazeProfileId('profile-123');
      plugin.setAllowedTraits([]);

      const event = makeIdentifyEvent({
        [defaultAllowedEvents.allowedTraits[0]]: 'value',
      });

      plugin.identify(event);

      expect(mockBraze.setCustomUserAttribute).not.toHaveBeenCalled();
    });
  });

  describe('flush', () => {
    it('flushes Braze data when profileId is set', () => {
      plugin.setBrazeProfileId('profile-123');

      plugin.flush();

      expect(mockBraze.requestImmediateDataFlush).toHaveBeenCalled();
    });

    it('does not flush when profileId is not set', () => {
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
