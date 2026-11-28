import AsyncStorage from '@react-native-async-storage/async-storage';
import StorageWrapper from '../../store/storage-wrapper';
import AppConstants from '../AppConstants';
import {
  WALLET_CONNECT_STATE_KEY_PATTERN,
  hasPersistedWalletConnectState,
} from './wc-persisted-state';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getAllKeys: jest.fn(), multiGet: jest.fn() },
}));

jest.mock('../../store/storage-wrapper', () => ({
  __esModule: true,
  default: { getItem: jest.fn() },
}));

const mockGetAllKeys = AsyncStorage.getAllKeys as jest.Mock;
const mockMultiGet = AsyncStorage.multiGet as jest.Mock;
const mockGetItem = StorageWrapper.getItem as jest.Mock;

/** Backs the AsyncStorage mock with a plain object of key → raw string. */
const givenAsyncStorage = (items: Record<string, string>) => {
  mockGetAllKeys.mockResolvedValue(Object.keys(items));
  mockMultiGet.mockImplementation(async (keys: string[]) =>
    keys.map((key) => [key, items[key] ?? null]),
  );
};

const SESSION = 'wc@2:client:0.3//session';
const PAIRING = 'wc@2:core:0.3//pairing';

describe('hasPersistedWalletConnectState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetItem.mockResolvedValue(undefined);
  });

  it('is true when a session is stored', async () => {
    givenAsyncStorage({ [SESSION]: JSON.stringify([{ topic: 'abc' }]) });
    expect(await hasPersistedWalletConnectState()).toBe(true);
  });

  it('is true when only a pairing is stored (session not settled yet)', async () => {
    givenAsyncStorage({
      [SESSION]: '[]',
      [PAIRING]: JSON.stringify([{ topic: 'p' }]),
    });
    expect(await hasPersistedWalletConnectState()).toBe(true);
  });

  it('is true when only a pending proposal is stored', async () => {
    givenAsyncStorage({
      'wc@2:client:0.3//proposal': JSON.stringify([{ id: 1 }]),
    });
    expect(await hasPersistedWalletConnectState()).toBe(true);
  });

  it('is false when nothing WalletConnect-related is stored', async () => {
    givenAsyncStorage({ 'some-other-key': 'value' });
    expect(await hasPersistedWalletConnectState()).toBe(false);
    expect(mockMultiGet).not.toHaveBeenCalled();
  });

  it('is false when the stores exist but are empty (all sessions removed)', async () => {
    givenAsyncStorage({
      [SESSION]: '[]',
      [PAIRING]: '[]',
      'wc@2:core:0.3//subscription': '[]',
    });
    expect(await hasPersistedWalletConnectState()).toBe(false);
  });

  it('ignores WalletConnect keys that are not sessions, pairings, proposals or subscriptions', async () => {
    givenAsyncStorage({
      'wc@2:core:0.3//keychain': JSON.stringify({ a: 'b' }),
      'wc@2:core:0.3//messages': JSON.stringify([{ topic: 't' }]),
      'wc@2:core:0.3//expirer': JSON.stringify([{ target: 'x' }]),
    });
    expect(await hasPersistedWalletConnectState()).toBe(false);
  });

  it('is true when a store value is not valid JSON (fails open)', async () => {
    givenAsyncStorage({ [SESSION]: '{not json' });
    expect(await hasPersistedWalletConnectState()).toBe(true);
  });

  it('is true when a store value has an unexpected shape (fails open)', async () => {
    givenAsyncStorage({ [SESSION]: '"a string"' });
    expect(await hasPersistedWalletConnectState()).toBe(true);
  });

  it('is true when storage cannot be read (fails open)', async () => {
    mockGetAllKeys.mockRejectedValue(new Error('storage unavailable'));
    expect(await hasPersistedWalletConnectState()).toBe(true);
  });

  it('is true when the app has deeplink sessions stored', async () => {
    givenAsyncStorage({});
    mockGetItem.mockResolvedValue(
      JSON.stringify({ topic: { redirectUrl: 'x' } }),
    );
    expect(await hasPersistedWalletConnectState()).toBe(true);
    expect(mockGetItem).toHaveBeenCalledWith(
      AppConstants.WALLET_CONNECT.DEEPLINK_SESSIONS,
    );
  });

  it('is false when the deeplink sessions entry is an empty object', async () => {
    givenAsyncStorage({});
    mockGetItem.mockResolvedValue('{}');
    expect(await hasPersistedWalletConnectState()).toBe(false);
  });
});

describe('WALLET_CONNECT_STATE_KEY_PATTERN', () => {
  it.each([
    'wc@2:client:0.3//session',
    'wc@2:client:0.3//proposal',
    'wc@2:core:0.3//pairing',
    'wc@2:core:0.3//subscription',
    // a future store version or a customStoragePrefix must still match
    'wc@2:client:0.4//session',
    'wc@2:core:0.3:myapp//pairing',
  ])('matches %s', (key) => {
    expect(WALLET_CONNECT_STATE_KEY_PATTERN.test(key)).toBe(true);
  });

  it.each([
    'wc@2:core:0.3//keychain',
    'wc@2:core:0.3//messages',
    'wc@2:client:0.3//session_extra',
    'wc@1:client:0.3//session',
    'session',
  ])('does not match %s', (key) => {
    expect(WALLET_CONNECT_STATE_KEY_PATTERN.test(key)).toBe(false);
  });
});
