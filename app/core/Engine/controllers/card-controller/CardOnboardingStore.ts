import SecureKeychain from '../../../SecureKeychain';
import Logger from '../../../../util/Logger';

const KEYCHAIN_PREFIX = 'com.metamask.CARD_ONBOARDING';

/**
 * Onboarding session data stored in SecureKeychain, keyed by provider ID.
 */
export interface CardOnboardingData {
  onboardingId: string | null;
  contactVerificationId: string | null;
  consentSetId: string | null;
  selectedCountry: string | null;
}

export function emptyOnboardingData(): CardOnboardingData {
  return {
    onboardingId: null,
    contactVerificationId: null,
    consentSetId: null,
    selectedCountry: null,
  };
}

function scopeOptions(providerId: string) {
  return {
    service: `${KEYCHAIN_PREFIX}_${providerId}`,
    accessible: SecureKeychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  };
}

/**
 * SecureKeychain wrapper for Card onboarding session data.
 */
export const CardOnboardingStore = {
  /**
   * Retrieves onboarding data for a provider.
   * @returns The onboarding data, or null if no data exists.
   * @throws If a keychain read error occurs (to prevent silent data loss in set()).
   */
  async get(providerId: string): Promise<CardOnboardingData | null> {
    const item = await SecureKeychain.getSecureItem(scopeOptions(providerId));
    if (!item) return null;

    try {
      const data: Partial<CardOnboardingData> = JSON.parse(item.value);
      return {
        ...emptyOnboardingData(),
        ...data,
      };
    } catch (parseError) {
      Logger.error(parseError as Error, {
        tags: { feature: 'card', provider: providerId },
        context: {
          name: 'CardOnboardingStore',
          data: { method: 'get', reason: 'JSON parse failed' },
        },
      });
      return null;
    }
  },

  async set(
    providerId: string,
    data: Partial<CardOnboardingData>,
  ): Promise<boolean> {
    try {
      const current =
        (await CardOnboardingStore.get(providerId)) ?? emptyOnboardingData();
      const merged = { ...current, ...data };

      const result = await SecureKeychain.setSecureItem(
        `CARD_ONBOARDING_${providerId}`,
        JSON.stringify(merged),
        scopeOptions(providerId),
      );
      return result !== false;
    } catch (error) {
      Logger.error(error as Error, {
        tags: { feature: 'card', provider: providerId },
        context: {
          name: 'CardOnboardingStore',
          data: { method: 'set' },
        },
      });
      return false;
    }
  },

  async remove(providerId: string): Promise<boolean> {
    try {
      const result = await SecureKeychain.clearSecureScope(
        scopeOptions(providerId),
      );
      return result !== false;
    } catch (error) {
      Logger.error(error as Error, {
        tags: { feature: 'card', provider: providerId },
        context: {
          name: 'CardOnboardingStore',
          data: { method: 'remove' },
        },
      });
      return false;
    }
  },
};
