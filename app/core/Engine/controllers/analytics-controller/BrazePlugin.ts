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
  private lastSentLanguage: string | undefined;
  private readonly sentTraitFingerprints = new Map<string, string>();

  /**
   * Set the Braze profile ID used for `Braze.changeUser()`.
   *
   * When provided and different from the in-memory profile, calls
   * `Braze.changeUser()` so subsequent track calls are attributed to the
   * correct user. Repeating the same ID on this plugin instance is a no-op
   * for `changeUser`. Native Braze already ignores a same-ID `changeUser`
   * after a cold start, so we do not persist the ID ourselves.
   *
   * When `undefined`, the plugin stops forwarding to Braze.
   *
   * @returns Whether `Braze.changeUser()` ran for a new profile ID.
   */
  setBrazeProfileId(canonicalProfileId: string | undefined): boolean {
    if (canonicalProfileId === undefined) {
      this.brazeProfileId = undefined;
      this.pendingIdentifyTraits = undefined;
      this.lastSentLanguage = undefined;
      this.sentTraitFingerprints.clear();
      return false;
    }

    const isSameUser = canonicalProfileId === this.brazeProfileId;
    this.brazeProfileId = canonicalProfileId;

    if (!isSameUser) {
      this.sentTraitFingerprints.clear();
      this.lastSentLanguage = undefined;
      try {
        Braze.changeUser(canonicalProfileId);
        Logger.log(
          '[BrazePlugin] Identified Braze user with canonicalProfileId',
        );
      } catch (error) {
        captureException(error as Error, {
          tags: {
            plugin: 'BrazePlugin',
            context: 'Failed to identify Braze user',
          },
        });
      }
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

    return !isSameUser;
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

  /**
   * Segment calls this on its flush policies (event count / timer). Braze
   * already batches `/data` uploads on its own interval; forcing
   * `requestImmediateDataFlush()` here split the same payload across extra
   * SDK requests and burned rate-limit tokens. Banner dismiss still flushes
   * explicitly.
   */
  flush(): void {
    // Intentionally empty — see method JSDoc.
  }

  private sendLanguageToBraze(locale: string): void {
    if (this.lastSentLanguage === locale) {
      return;
    }

    try {
      Braze.setLanguage(locale);
      this.lastSentLanguage = locale;
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
      if (sanitized === undefined) {
        continue;
      }

      const fingerprint = JSON.stringify(sanitized);
      if (this.sentTraitFingerprints.get(key) === fingerprint) {
        continue;
      }

      Braze.setCustomUserAttribute(key, sanitized);
      this.sentTraitFingerprints.set(key, fingerprint);
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
