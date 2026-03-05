import SecureKeychain from '../../../SecureKeychain';
import Logger from '../../../../util/Logger';

const KEYCHAIN_PREFIX = 'com.metamask.CARD_TOKENS';

/**
 * Auth token set stored in SecureKeychain, keyed by provider ID.
 */
export interface CardTokenSet {
  accessToken: string;
  refreshToken?: string;
  accessTokenExpiresAt: number;
  refreshTokenExpiresAt?: number;
  location?: string;
}

function scopeOptions(providerId: string) {
  return {
    service:
      providerId === 'baanx'
        ? 'com.metamask.CARD_BAANX_TOKENS'
        : `${KEYCHAIN_PREFIX}_${providerId}`,
    accessible: SecureKeychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  };
}

/**
 * SecureKeychain wrapper for Card provider auth tokens.
 */
export const CardTokenStore = {
  async get(providerId: string): Promise<CardTokenSet | null> {
    try {
      const item = await SecureKeychain.getSecureItem(scopeOptions(providerId));
      if (!item) return null;

      const data: Partial<CardTokenSet> = JSON.parse(item.value);
      if (!data.accessToken || !data.accessTokenExpiresAt) return null;

      return data as CardTokenSet;
    } catch (error) {
      Logger.error(error as Error, {
        tags: { feature: 'card', provider: providerId },
        context: {
          name: 'CardTokenStore',
          data: { method: 'get' },
        },
      });
      return null;
    }
  },

  async set(providerId: string, tokenSet: CardTokenSet): Promise<boolean> {
    try {
      const result = await SecureKeychain.setSecureItem(
        `CARD_TOKENS_${providerId}`,
        JSON.stringify(tokenSet),
        scopeOptions(providerId),
      );
      return result !== false;
    } catch (error) {
      Logger.error(error as Error, {
        tags: { feature: 'card', provider: providerId },
        context: {
          name: 'CardTokenStore',
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
          name: 'CardTokenStore',
          data: { method: 'remove' },
        },
      });
      return false;
    }
  },
};
