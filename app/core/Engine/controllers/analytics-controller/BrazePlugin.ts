import {
  EventPlugin,
  PluginType,
  type IdentifyEventType,
  type TrackEventType,
  type ScreenEventType,
} from '@segment/analytics-react-native';
import Braze from '@braze/react-native-sdk';
import Logger from '../../../../util/Logger';
import { captureException } from '@sentry/react-native';

/**
 * Segment destination plugin that forwards events to the native Braze SDK
 * using a MetaMask profile ID rather than Segment's default userId.
 *
 * Only track events whose name appears in the allowlist are forwarded.
 * The allowlist is loaded from a local JSON file by default and can be
 * replaced at runtime (e.g. from a CDN) via {@link setAllowedEvents}.
 *
 * When no profileId is set the plugin is a no-op — nothing is sent to Braze.
 */
export class BrazePlugin extends EventPlugin {
  type = PluginType.destination;

  private brazeProfileId: string | undefined;
  private allowedEvents: Set<string> = new Set();
  private allowedTraits: Set<string> = new Set();
  private pendingIdentifyTraits: Record<string, unknown> | undefined;
  private currentLanguage: string | undefined;

  /**
   * Set the Braze profile ID used for `Braze.changeUser()`.
   *
   * When provided, calls `Braze.changeUser()` immediately so subsequent
   * track calls are attributed to the correct user.
   *
   * When `undefined`, the plugin stops forwarding to Braze.
   */
  setBrazeProfileId(profileId: string | undefined): void {
    this.brazeProfileId = profileId;
    if (profileId !== undefined) {
      try {
        Braze.changeUser(profileId);
        Logger.log('[BrazePlugin] Identified Braze user with profileId');
      } catch (error) {
        captureException(error as Error, {
          tags: {
            plugin: 'BrazePlugin',
            context: 'Failed to identify Braze user',
          },
        });
      }

      if (this.pendingIdentifyTraits) {
        try {
          this.setUserTraits(this.pendingIdentifyTraits);
        } catch (error) {
          captureException(error as Error, {
            tags: {
              plugin: 'BrazePlugin',
              context: 'Failed to set pending user traits on Braze',
            },
          });
        }
        this.pendingIdentifyTraits = undefined;
      }

      if (this.currentLanguage) {
        this.sendLanguageToBraze(this.currentLanguage);
      }
    } else {
      this.pendingIdentifyTraits = undefined;
    }
  }

  /**
   * Replace the event-name allowlist at runtime.
   * Pass the full list of event names that should be forwarded to Braze.
   */
  setAllowedEvents(eventNames: string[]): void {
    this.allowedEvents = new Set(eventNames);
    Logger.log(
      `[BrazePlugin] Updated allowed events (${eventNames.length} events)`,
    );
  }

  /**
   * Replace the trait-name allowlist at runtime.
   * Pass the full list of trait keys that should be forwarded to Braze.
   */
  setAllowedTraits(traitNames: string[]): void {
    this.allowedTraits = new Set(traitNames);
    Logger.log(
      `[BrazePlugin] Updated allowed traits (${traitNames.length} traits)`,
    );
  }

  /**
   * Set the app language as a custom user attribute on Braze.
   *
   * Always stores the value so it can be sent when a profileId becomes
   * available. If a profileId is already set, sends immediately.
   */
  setLanguage(locale: string): void {
    this.currentLanguage = locale;
    if (this.brazeProfileId !== undefined) {
      this.sendLanguageToBraze(locale);
    }
  }

  identify(event: IdentifyEventType): IdentifyEventType {
    if (!event.traits) {
      return event;
    }

    // If we don't have a profileId yet, we buffer the traits and send them later when the profileId is set
    if (this.brazeProfileId === undefined) {
      this.pendingIdentifyTraits = {
        ...this.pendingIdentifyTraits,
        ...event.traits,
      };
      return event;
    }

    try {
      this.setUserTraits(event.traits);
    } catch (error) {
      captureException(error as Error, {
        tags: {
          plugin: 'BrazePlugin',
          context: 'Failed to set user traits on Braze',
        },
      });
    }
    return event;
  }

  track(event: TrackEventType): TrackEventType | undefined {
    if (this.brazeProfileId === undefined) {
      return event;
    }

    if (!this.allowedEvents.has(event.event)) {
      return undefined;
    }

    try {
      Braze.logCustomEvent(event.event, event.properties);
    } catch (error) {
      captureException(error as Error, {
        tags: {
          plugin: 'BrazePlugin',
          context: 'Failed to log custom event',
        },
      });
    }
    return event;
  }

  screen(event: ScreenEventType): ScreenEventType {
    return event;
  }

  flush(): void {
    if (this.brazeProfileId !== undefined) {
      try {
        Braze.requestImmediateDataFlush();
      } catch (error) {
        captureException(error as Error, {
          tags: {
            plugin: 'BrazePlugin',
            context: 'Failed to flush Braze data',
          },
        });
      }
    }
  }

  private sendLanguageToBraze(locale: string): void {
    try {
      Braze.setCustomUserAttribute('currentLanguage', locale);
      Logger.log(`[BrazePlugin] Sent language to Braze: ${locale}`);
    } catch (error) {
      captureException(error as Error, {
        tags: {
          plugin: 'BrazePlugin',
          context: 'Failed to set language on Braze',
        },
      });
    }
  }

  private setUserTraits(traits: Record<string, unknown>): void {
    // Set all traits as custom user attributes
    // MetaMask Mobile only uses custom attributes (UserProfileProperty enum values)
    // and never uses standard Braze profile fields like email/firstName/etc
    for (const [key, value] of Object.entries(traits)) {
      if (value === undefined) continue;
      if (!this.allowedTraits.has(key)) continue;

      const sanitized = this.sanitizeAttribute(value);
      if (sanitized !== undefined) {
        Braze.setCustomUserAttribute(key, sanitized);
      }
    }
  }

  private sanitizeAttribute(
    value: unknown,
  ): string | number | boolean | string[] | null | undefined {
    if (
      value === null ||
      typeof value === 'number' ||
      typeof value === 'string' ||
      typeof value === 'boolean'
    ) {
      return value;
    }
    if (Array.isArray(value)) {
      return value.map((v) =>
        typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v),
      );
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return undefined;
  }
}
