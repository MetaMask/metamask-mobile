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
 * When no profileId is set the plugin is a no-op — nothing is sent to Braze.
 */
export class BrazePlugin extends EventPlugin {
  type = PluginType.destination;

  private brazeProfileId: string | undefined;
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
   * Set the app language on Braze using the native setLanguage API.
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
      Braze.setLanguage(locale);
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
