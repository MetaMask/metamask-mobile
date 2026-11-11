import {
  SentinelChainNotSupportedError,
  type SentinelNetwork,
} from '@metamask/sentinel-api-service';
import { Hex } from '@metamask/utils';
import {
  SentinelApiMessenger,
  getSendBundleSupportedChains,
  getSentinelNetworkFlags,
  getSentinelSigners,
  isSendBundleSupported,
  setSentinelApiMessenger,
} from './sentinel-api';

const CHAIN_ID_MAINNET: Hex = '0x1';
const CHAIN_ID_POLYGON: Hex = '0x89';

const MAINNET_NETWORK_MOCK: SentinelNetwork = {
  chainID: 1,
  confirmations: true,
  network: 'ethereum-mainnet',
  relayTransactions: true,
  sendBundle: true,
  smartTransactions: true,
};

const POLYGON_NETWORK_MOCK: SentinelNetwork = {
  chainID: 137,
  confirmations: true,
  network: 'polygon-mainnet',
  relayTransactions: false,
  sendBundle: false,
  smartTransactions: false,
};

const SIGNERS_MOCK: Hex[] = [
  '0xB01caEa8c6C47bbf4F4b4c5080Ca642043359C2E',
  '0xB42F812A44c22cc6b861478900401ee759EbEAD6',
];

describe('Sentinel API', () => {
  const getNetworkMock = jest.fn();
  const getNetworksMock = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();

    setSentinelApiMessenger({
      call: (action: string, ...args: unknown[]) => {
        if (action === 'SentinelApiService:getNetwork') {
          return getNetworkMock(...args);
        }

        return getNetworksMock(...args);
      },
    } as SentinelApiMessenger);

    getNetworkMock.mockResolvedValue(MAINNET_NETWORK_MOCK);
    getNetworksMock.mockResolvedValue({
      '1': MAINNET_NETWORK_MOCK,
      '137': POLYGON_NETWORK_MOCK,
    });
  });

  afterAll(() => {
    setSentinelApiMessenger(undefined);
  });

  describe('getSentinelNetworkFlags', () => {
    it('returns network from service', async () => {
      const result = await getSentinelNetworkFlags(CHAIN_ID_MAINNET);

      expect(getNetworkMock).toHaveBeenCalledWith(CHAIN_ID_MAINNET);
      expect(result).toStrictEqual(MAINNET_NETWORK_MOCK);
    });

    it('returns undefined if chain not supported', async () => {
      getNetworkMock.mockRejectedValueOnce(
        new SentinelChainNotSupportedError('0xFAFA'),
      );

      expect(await getSentinelNetworkFlags('0xFAFA')).toBeUndefined();
    });

    it('prefixes errors if service throws', async () => {
      getNetworkMock.mockRejectedValueOnce(new Error('API connection error'));

      await expect(getSentinelNetworkFlags(CHAIN_ID_MAINNET)).rejects.toThrow(
        'Sentinel: API connection error',
      );
    });

    it('throws if messenger not set', async () => {
      setSentinelApiMessenger(undefined);

      await expect(getSentinelNetworkFlags(CHAIN_ID_MAINNET)).rejects.toThrow(
        'Sentinel: Messenger not initialized',
      );
    });
  });

  describe('getSentinelSigners', () => {
    it('returns the cubist signers for the chain', async () => {
      getNetworkMock.mockResolvedValueOnce({
        ...MAINNET_NETWORK_MOCK,
        cubistSigners: SIGNERS_MOCK,
      });

      expect(await getSentinelSigners(CHAIN_ID_MAINNET)).toStrictEqual(
        SIGNERS_MOCK,
      );
    });

    it('returns an empty array if cubist signers are missing', async () => {
      expect(await getSentinelSigners(CHAIN_ID_MAINNET)).toStrictEqual([]);
    });

    it('returns an empty array if cubist signers is not an array', async () => {
      getNetworkMock.mockResolvedValueOnce({
        ...MAINNET_NETWORK_MOCK,
        cubistSigners: 'invalid',
      });

      expect(await getSentinelSigners(CHAIN_ID_MAINNET)).toStrictEqual([]);
    });

    it('returns an empty array if the chain is not supported', async () => {
      getNetworkMock.mockRejectedValueOnce(
        new SentinelChainNotSupportedError('0xfafa'),
      );

      expect(await getSentinelSigners('0xfafa')).toStrictEqual([]);
    });
  });

  describe('isSendBundleSupported', () => {
    it('returns true if network supports sendBundle', async () => {
      expect(await isSendBundleSupported(CHAIN_ID_MAINNET)).toBe(true);
    });

    it('returns false if sendBundle is false', async () => {
      getNetworkMock.mockResolvedValueOnce(POLYGON_NETWORK_MOCK);

      expect(await isSendBundleSupported(CHAIN_ID_POLYGON)).toBe(false);
    });

    it('returns false if chain not supported', async () => {
      getNetworkMock.mockRejectedValueOnce(
        new SentinelChainNotSupportedError('0xFAFA'),
      );

      expect(await isSendBundleSupported('0xFAFA')).toBe(false);
    });
  });

  describe('getSendBundleSupportedChains', () => {
    it('returns a map of chain IDs to sendBundle support status', async () => {
      const result = await getSendBundleSupportedChains([
        CHAIN_ID_MAINNET,
        CHAIN_ID_POLYGON,
        '0xFAFA',
      ]);

      expect(getNetworksMock).toHaveBeenCalledTimes(1);
      expect(result).toStrictEqual({
        [CHAIN_ID_MAINNET]: true,
        [CHAIN_ID_POLYGON]: false,
        '0xFAFA': false,
      });
    });

    it('prefixes errors if service throws', async () => {
      getNetworksMock.mockRejectedValueOnce(new Error('API connection error'));

      await expect(
        getSendBundleSupportedChains([CHAIN_ID_MAINNET]),
      ).rejects.toThrow('Sentinel: API connection error');
    });
  });
});
