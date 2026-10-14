import { NativeModules, Platform } from 'react-native';
import SecureKeychain from '../../../SecureKeychain';
import Logger from '../../../../util/Logger';

const KEYCHAIN_PREFIX = 'com.metamask.CARD_TOKENS';
const LEGACY_BAANX_KEY = 'CARD_BAANX_TOKENS';

/**
 * Auth token set stored in SecureKeychain, keyed by provider ID.
 */
export interface CardTokenSet {
  accessToken: string;
  refreshToken?: string;
  accessTokenExpiresAt: number;
  refreshTokenExpiresAt?: number;
  location: string;
  providerUserId?: string;
  cardholderAccountId?: string;
  accountAddress?: string;
  keyringId?: string;
}

function keychainKey(providerId: string): string {
  return providerId === 'baanx'
    ? LEGACY_BAANX_KEY
    : `CARD_TOKENS_${providerId}`;
}

interface CardKeychainGroups {
  cardKeychainAccessGroup?: string;
  defaultKeychainAccessGroup?: string;
}

function keychainGroups(): CardKeychainGroups {
  if (Platform.OS !== 'ios') {
    return {};
  }
  return (NativeModules.CardWalletExtensionStore ?? {}) as CardKeychainGroups;
}

function scopeOptions(providerId: string, accessGroup?: string) {
  return {
    service:
      providerId === 'baanx'
        ? `com.metamask.${LEGACY_BAANX_KEY}`
        : `${KEYCHAIN_PREFIX}_${providerId}`,
    accessible: SecureKeychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    ...(accessGroup ? { accessGroup } : {}),
  };
}

function parseTokenSet(value: string): CardTokenSet | null {
  const data: Partial<CardTokenSet> = JSON.parse(value);
  if (!data.accessToken || !data.accessTokenExpiresAt || !data.location) {
    return null;
  }
  return data as CardTokenSet;
}

/**
 * SecureKeychain wrapper for Card provider auth tokens.
 */
export const CardTokenStore = {
  async get(providerId: string): Promise<CardTokenSet | null> {
    try {
      const groups = keychainGroups();
      const item = await SecureKeychain.getSecureItem(
        scopeOptions(providerId, groups.cardKeychainAccessGroup),
      );
      if (item) {
        return parseTokenSet(item.value);
      }

      const legacyGroup = groups.defaultKeychainAccessGroup;
      if (!legacyGroup || legacyGroup === groups.cardKeychainAccessGroup) {
        return null;
      }

      const legacy = await SecureKeychain.getSecureItem(
        scopeOptions(providerId, legacyGroup),
      );
      if (!legacy) return null;
      const parsed = parseTokenSet(legacy.value);
      if (!parsed) return null;

      const stored = await CardTokenStore.set(providerId, parsed);
      if (!stored) return parsed;

      // A delete without an access group also removes the item just written to the card group.
      await SecureKeychain.clearSecureScope(
        scopeOptions(providerId, legacyGroup),
      );
      return parsed;
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
        keychainKey(providerId),
        JSON.stringify(tokenSet),
        scopeOptions(providerId, keychainGroups().cardKeychainAccessGroup),
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
      const groups = keychainGroups();
      const result = await SecureKeychain.clearSecureScope(
        scopeOptions(providerId, groups.cardKeychainAccessGroup),
      );
      if (
        groups.defaultKeychainAccessGroup &&
        groups.defaultKeychainAccessGroup !== groups.cardKeychainAccessGroup
      ) {
        await SecureKeychain.clearSecureScope(
          scopeOptions(providerId, groups.defaultKeychainAccessGroup),
        );
      }
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
