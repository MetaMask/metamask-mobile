import { ethers } from 'ethers';
import { BaanxProvider } from './BaanxProvider';
import { CardApiError, type BaanxService } from '../services/BaanxService';
import {
  CardStatus,
  CardType,
  FundingAssetStatus,
  CardProviderErrorCode,
  type CardAuthTokens,
} from '../provider-types';
import Logger from '../../../../../util/Logger';
import type { CardFeatureFlag } from '../../../../../selectors/featureFlagController/card';

jest.mock('../../../../../util/Logger');
jest.mock('../../../../../components/UI/Card/util/pkceHelpers', () => ({
  generateState: () => 'mock-state-123',
  generatePKCEPair: () =>
    Promise.resolve({
      codeVerifier: 'mock-verifier',
      codeChallenge: 'mock-challenge',
    }),
}));

const AUTH_TOKENS: CardAuthTokens = {
  accessToken: 'test-access',
  refreshToken: 'test-refresh',
  accessTokenExpiresAt: Date.now() + 3600000,
  refreshTokenExpiresAt: Date.now() + 86400000,
  location: 'us',
};

/** Unsigned JWT payload segment only — enough for `app_id` decoding in provider. */
function buildAccessTokenJwt(appId: 'FOX' | 'FOX_US'): string {
  const json = JSON.stringify({ app_id: appId });
  const payload = base64UrlEncodeUtf8(json);

  return `h.${payload}.s`;
}

interface BufferFromUtf8 {
  from(
    data: string,
    encoding: 'utf8',
  ): { toString(encoding: 'base64'): string };
}

function base64UrlEncodeUtf8(input: string): string {
  const BufferCtor = (globalThis as { Buffer?: BufferFromUtf8 }).Buffer;
  if (!BufferCtor) {
    throw new Error('Buffer is not available in this test environment');
  }
  return BufferCtor.from(input, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/[=]/g, '');
}

function createMockService(): jest.Mocked<BaanxService> {
  return {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    request: jest.fn(),
    setLocation: jest.fn(),
    location: 'international',
    apiKey: 'test-api-key',
  } as unknown as jest.Mocked<BaanxService>;
}

describe('BaanxProvider', () => {
  let service: jest.Mocked<BaanxService>;
  let provider: BaanxProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    service = createMockService();
    provider = new BaanxProvider({ service });
  });

  describe('capabilities', () => {
    it('exposes id as baanx', () => {
      expect(provider.id).toBe('baanx');
    });

    it('declares oauth2 auth method', () => {
      expect(provider.capabilities.authMethod).toBe('oauth2');
    });

    it('supports funding approval on linea and base', () => {
      expect(provider.capabilities.fundingChains).toStrictEqual([
        'eip155:59144',
        'eip155:8453',
      ]);
    });

    it('supports freeze', () => {
      expect(provider.capabilities.supportsFreeze).toBe(true);
    });

    it('does not support OTP', () => {
      expect(provider.capabilities.supportsOTP).toBe(false);
    });
  });

  describe('validateTokens', () => {
    it('returns valid when tokens are not expired', () => {
      expect(provider.validateTokens(AUTH_TOKENS)).toBe('valid');
    });

    it('returns needs_refresh when access token is near expiry', () => {
      const nearExpiry = {
        ...AUTH_TOKENS,
        accessTokenExpiresAt: Date.now() + 60_000,
      };

      expect(provider.validateTokens(nearExpiry)).toBe('needs_refresh');
    });

    it('returns expired when access-only token is near expiry', () => {
      const accessOnly = {
        ...AUTH_TOKENS,
        refreshToken: undefined,
        refreshTokenExpiresAt: undefined,
        accessTokenExpiresAt: Date.now() + 60_000,
      };

      expect(provider.validateTokens(accessOnly)).toBe('expired');
    });

    it('returns valid when access token is valid even if refresh is near expiry', () => {
      const refreshNearExpiry = {
        ...AUTH_TOKENS,
        refreshTokenExpiresAt: Date.now() + 30 * 60_000,
      };

      expect(provider.validateTokens(refreshNearExpiry)).toBe('valid');
    });

    it('returns expired when access token needs refresh but refresh token is near expiry', () => {
      const bothNearExpiry = {
        ...AUTH_TOKENS,
        accessTokenExpiresAt: Date.now() + 60_000,
        refreshTokenExpiresAt: Date.now() + 30 * 60_000,
      };

      expect(provider.validateTokens(bothNearExpiry)).toBe('expired');
    });
  });

  describe('getCardHomeData', () => {
    it('returns populated home data with assets and card', async () => {
      service.get.mockImplementation((path: string) => {
        if (path === '/v1/delegation/chain/config') {
          return Promise.resolve({
            networks: [
              {
                network: 'linea',
                chainId: '59144',
                delegationContract: '0xabc',
                tokens: { USDC: { address: '0x1', decimals: 6 } },
              },
            ],
          });
        }
        if (path === '/v1/card/status') {
          return Promise.resolve({
            id: 'card-1',
            status: CardStatus.ACTIVE,
            type: CardType.VIRTUAL,
            panLast4: '1234',
            holderName: 'Test User',
            isFreezable: true,
          });
        }
        if (path === '/v1/user') {
          return Promise.resolve({
            id: 'user-1',
            firstName: 'Test',
            lastName: 'User',
            verificationState: 'VERIFIED',
          });
        }
        if (path === '/v1/wallet/external') {
          return Promise.resolve([
            {
              id: 1,
              walletAddress: '0xwallet',
              currency: 'USDC',
              balance: '100',
              allowance: '999999999999',
              priority: 1,
              tokenDetails: {
                address: '0x1',
                decimals: 6,
                symbol: 'USDC',
                name: 'USD Coin',
              },
              caipChainId: 'eip155:59144',
              network: 'linea',
            },
          ]);
        }
        if (path === '/v1/wallet/external/priority') {
          return Promise.resolve([
            {
              id: 1,
              address: '0xwallet',
              currency: 'USDC',
              network: 'linea',
              priority: 1,
            },
          ]);
        }
        return Promise.resolve({});
      });

      const result = await provider.getCardHomeData('0xaddress', AUTH_TOKENS);

      expect(result.primaryFundingAsset).not.toBeNull();
      expect(result.primaryFundingAsset?.symbol).toBe('USDC');
      expect(result.primaryFundingAsset?.status).toBe(
        FundingAssetStatus.Active,
      );
      expect(result.primaryFundingAsset?.spendingCap).toBe('999999999999');
      expect(result.fundingAssets).toHaveLength(1);
      expect(result.card?.id).toBe('card-1');
      expect(result.card?.status).toBe(CardStatus.ACTIVE);
      expect(result.account?.verificationStatus).toBe('VERIFIED');
      expect(result.actions.length).toBeGreaterThan(0);
    });

    it('returns empty home data when all API calls fail', async () => {
      service.get.mockRejectedValue(new Error('Network error'));

      const result = await provider.getCardHomeData('0xaddress', AUTH_TOKENS);

      expect(result.primaryFundingAsset).toBeNull();
      expect(result.fundingAssets).toHaveLength(0);
      expect(result.card).toBeNull();
    });

    it('builds kyc_pending alert for pending verification', async () => {
      service.get.mockImplementation((path: string) => {
        if (path === '/v1/delegation/chain/config') {
          return Promise.resolve({ networks: [] });
        }
        if (path === '/v1/card/status') {
          return Promise.resolve({
            id: 'card-1',
            status: CardStatus.ACTIVE,
            type: CardType.VIRTUAL,
            panLast4: '1234',
            holderName: 'Test',
            isFreezable: true,
          });
        }
        if (path === '/v1/user') {
          return Promise.resolve({
            id: 'user-1',
            verificationState: 'PENDING',
          });
        }
        return Promise.resolve([]);
      });

      const result = await provider.getCardHomeData('0xaddr', AUTH_TOKENS);

      expect(result.alerts).toContainEqual(
        expect.objectContaining({ type: 'kyc_pending' }),
      );
    });

    it('builds kyc_pending alert for UNVERIFIED verification', async () => {
      service.get.mockImplementation((path: string) => {
        if (path === '/v1/delegation/chain/config') {
          return Promise.resolve({ networks: [] });
        }
        if (path === '/v1/card/status') {
          return Promise.resolve({
            id: 'card-1',
            status: CardStatus.ACTIVE,
            type: CardType.VIRTUAL,
            panLast4: '1234',
            holderName: 'Test',
            isFreezable: true,
          });
        }
        if (path === '/v1/user') {
          return Promise.resolve({
            id: 'user-1',
            verificationState: 'UNVERIFIED',
          });
        }
        return Promise.resolve([]);
      });

      const result = await provider.getCardHomeData('0xaddr', AUTH_TOKENS);

      expect(result.alerts).toContainEqual(
        expect.objectContaining({ type: 'kyc_pending' }),
      );
    });

    it('builds card_provisioning alert when verified with no card but has assets', async () => {
      service.get.mockImplementation((path: string) => {
        if (path === '/v1/delegation/chain/config') {
          return Promise.resolve({
            networks: [
              { network: 'linea', chainId: '59144', tokens: { USDC: {} } },
            ],
          });
        }
        if (path === '/v1/card/status') {
          return Promise.reject(new Error('no card'));
        }
        if (path === '/v1/user') {
          return Promise.resolve({
            id: 'user-1',
            verificationState: 'VERIFIED',
          });
        }
        if (path === '/v1/wallet/external') {
          return Promise.resolve([
            {
              id: 1,
              walletAddress: '0xwallet',
              currency: 'USDC',
              balance: '100',
              allowance: '500',
              priority: 1,
              tokenDetails: {
                address: '0x1',
                decimals: 6,
                symbol: 'USDC',
                name: 'USDC',
              },
              caipChainId: 'eip155:59144',
              network: 'linea',
            },
          ]);
        }
        if (path === '/v1/wallet/external/priority') {
          return Promise.resolve([
            {
              id: 1,
              address: '0xwallet',
              currency: 'USDC',
              network: 'linea',
              priority: 1,
            },
          ]);
        }
        return Promise.resolve({});
      });

      const result = await provider.getCardHomeData('0xaddr', AUTH_TOKENS);

      expect(result.card).toBeNull();
      expect(result.alerts).toContainEqual(
        expect.objectContaining({ type: 'card_provisioning' }),
      );
      expect(result.actions).toHaveLength(0);
    });

    it('returns no actions when verified with no card but has assets (provisioning)', async () => {
      service.get.mockImplementation((path: string) => {
        if (path === '/v1/delegation/chain/config') {
          return Promise.resolve({
            networks: [
              { network: 'linea', chainId: '59144', tokens: { USDC: {} } },
            ],
          });
        }
        if (path === '/v1/card/status') {
          return Promise.reject(new Error('no card'));
        }
        if (path === '/v1/user') {
          return Promise.resolve({
            id: 'user-1',
            verificationState: 'VERIFIED',
          });
        }
        if (path === '/v1/wallet/external') {
          return Promise.resolve([
            {
              id: 1,
              walletAddress: '0xwallet',
              currency: 'USDC',
              balance: '100',
              allowance: '500',
              priority: 1,
              tokenDetails: {
                address: '0x1',
                decimals: 6,
                symbol: 'USDC',
                name: 'USDC',
              },
              caipChainId: 'eip155:59144',
              network: 'linea',
            },
          ]);
        }
        if (path === '/v1/wallet/external/priority') {
          return Promise.resolve([
            {
              id: 1,
              address: '0xwallet',
              currency: 'USDC',
              network: 'linea',
              priority: 1,
            },
          ]);
        }
        return Promise.resolve({});
      });

      const result = await provider.getCardHomeData('0xaddr', AUTH_TOKENS);

      expect(result.card).toBeNull();
      expect(result.actions).toHaveLength(0);
    });

    it('builds enable_card action when verified but funding inactive', async () => {
      service.get.mockImplementation((path: string) => {
        if (path === '/v1/delegation/chain/config') {
          return Promise.resolve({ networks: [] });
        }
        if (path === '/v1/card/status') {
          return Promise.resolve({
            id: 'card-1',
            status: CardStatus.ACTIVE,
            type: CardType.VIRTUAL,
            panLast4: '1234',
            holderName: 'Test',
            isFreezable: true,
          });
        }
        if (path === '/v1/user') {
          return Promise.resolve({
            id: 'user-1',
            verificationState: 'VERIFIED',
          });
        }
        if (path === '/v1/wallet/external') {
          return Promise.resolve([
            {
              id: 1,
              walletAddress: '0xwallet',
              currency: 'USDC',
              balance: '0',
              allowance: '0',
              priority: 1,
              tokenDetails: {
                address: '0x1',
                decimals: 6,
                symbol: 'USDC',
                name: 'USDC',
              },
              caipChainId: 'eip155:59144',
              network: 'linea',
            },
          ]);
        }
        if (path === '/v1/wallet/external/priority') {
          return Promise.resolve([
            {
              id: 1,
              address: '0xwallet',
              currency: 'USDC',
              network: 'linea',
              priority: 1,
            },
          ]);
        }
        return Promise.resolve({});
      });

      const result = await provider.getCardHomeData('0xaddr', AUTH_TOKENS);

      expect(result.actions).toContainEqual(
        expect.objectContaining({ type: 'enable_card' }),
      );
    });

    it('returns enable_card when verified with card but no assets', async () => {
      service.get.mockImplementation((path: string) => {
        if (path === '/v1/delegation/chain/config') {
          return Promise.resolve({ networks: [] });
        }
        if (path === '/v1/card/status') {
          return Promise.resolve({
            id: 'card-1',
            status: CardStatus.ACTIVE,
            type: CardType.VIRTUAL,
            panLast4: '1234',
            holderName: 'Test',
            isFreezable: true,
          });
        }
        if (path === '/v1/user') {
          return Promise.resolve({
            id: 'user-1',
            verificationState: 'VERIFIED',
          });
        }
        return Promise.resolve([]);
      });

      const result = await provider.getCardHomeData('0xaddr', AUTH_TOKENS);

      expect(result.card).not.toBeNull();
      expect(result.primaryFundingAsset).toBeNull();
      expect(result.actions).toContainEqual(
        expect.objectContaining({ type: 'enable_card' }),
      );
    });
  });

  describe('getCardDetails', () => {
    it('returns mapped card details', async () => {
      service.get.mockResolvedValue({
        id: 'card-1',
        status: CardStatus.ACTIVE,
        type: CardType.VIRTUAL,
        panLast4: '5678',
        holderName: 'User',
        isFreezable: true,
      });

      const result = await provider.getCardDetails(AUTH_TOKENS);

      expect(result.id).toBe('card-1');
      expect(result.lastFour).toBe('5678');
      expect(result.status).toBe(CardStatus.ACTIVE);
    });

    it('throws NoCard error on 404', async () => {
      service.get.mockRejectedValue(
        new CardApiError(404, '/v1/card/status', 'Not found'),
      );

      await expect(provider.getCardDetails(AUTH_TOKENS)).rejects.toMatchObject({
        code: CardProviderErrorCode.NoCard,
      });
    });

    it('throws Network error on statusCode 0', async () => {
      service.get.mockRejectedValue(new CardApiError(0, '/v1/card/status', ''));

      await expect(provider.getCardDetails(AUTH_TOKENS)).rejects.toMatchObject({
        code: CardProviderErrorCode.Network,
      });
    });
  });

  describe('freezeCard / unfreezeCard', () => {
    it('calls freeze endpoint', async () => {
      service.post.mockResolvedValue({});

      await provider.freezeCard('card-1', AUTH_TOKENS);

      expect(service.post).toHaveBeenCalledWith(
        '/v1/card/freeze',
        {},
        AUTH_TOKENS,
      );
    });

    it('propagates error when freeze fails', async () => {
      service.post.mockRejectedValue(
        new CardApiError(500, '/v1/card/freeze', 'Internal server error'),
      );

      await expect(
        provider.freezeCard('card-1', AUTH_TOKENS),
      ).rejects.toThrow();
    });

    it('calls unfreeze endpoint', async () => {
      service.post.mockResolvedValue({});

      await provider.unfreezeCard('card-1', AUTH_TOKENS);

      expect(service.post).toHaveBeenCalledWith(
        '/v1/card/unfreeze',
        {},
        AUTH_TOKENS,
      );
    });

    it('propagates error when unfreeze fails', async () => {
      service.post.mockRejectedValue(
        new CardApiError(500, '/v1/card/unfreeze', 'Internal server error'),
      );

      await expect(
        provider.unfreezeCard('card-1', AUTH_TOKENS),
      ).rejects.toThrow();
    });
  });

  describe('getOnChainAssets', () => {
    it('returns empty home data with add_funds action', async () => {
      const result = await provider.getOnChainAssets('0xaddr');

      expect(result.primaryFundingAsset).toBeNull();
      expect(result.fundingAssets).toHaveLength(0);
      expect(result.actions).toContainEqual(
        expect.objectContaining({ type: 'add_funds', enabled: true }),
      );
    });
  });

  describe('getOnChainAssets — #fetchOnChainAllowances, #pickOnChainPrimaryAsset, #findLastApprovedToken', () => {
    const LINEA_CAIP = 'eip155:59144' as const;
    const ownerAddr = '0x1234567890123456789012345678901234567890';
    const tokenA = ethers.utils.getAddress(
      '0x1111111111111111111111111111111111111111',
    );
    const tokenB = ethers.utils.getAddress(
      '0x2222222222222222222222222222222222222222',
    );
    const foxGlobal = ethers.utils.getAddress(
      '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    );
    const foxUs = ethers.utils.getAddress(
      '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    );
    const scannerAddr = ethers.utils.getAddress(
      '0xcccccccccccccccccccccccccccccccccccccccc',
    );

    const cardFeatureFlag = {
      chains: {
        [LINEA_CAIP]: {
          tokens: [
            {
              address: tokenA,
              symbol: 'USDC',
              name: 'USDC',
              decimals: 6,
              enabled: true,
            },
            {
              address: tokenB,
              symbol: 'USDT',
              name: 'USDT',
              decimals: 6,
              enabled: true,
            },
          ],
          foxConnectAddresses: { global: foxGlobal, us: foxUs },
          balanceScannerAddress: scannerAddr,
        },
      },
    } as unknown as CardFeatureFlag;

    const limitedTuple = (human: string) => {
      const bn = ethers.utils.parseUnits(human, 6);
      const hex = bn.toHexString();
      return [
        [true, hex],
        [true, hex],
      ] as [boolean, string][];
    };

    let spendersMock: jest.Mock;
    let getLogsMock: jest.Mock;
    let providerSpy: jest.SpyInstance;
    let contractSpy: jest.SpyInstance;

    beforeEach(() => {
      spendersMock = jest.fn();
      getLogsMock = jest.fn();
      providerSpy = jest
        .spyOn(ethers.providers, 'JsonRpcProvider')
        .mockImplementation(
          () =>
            ({
              getLogs: getLogsMock,
            }) as unknown as ethers.providers.JsonRpcProvider,
        );
      contractSpy = jest
        .spyOn(ethers, 'Contract')
        .mockImplementation((address: string) => {
          if (address.toLowerCase() === scannerAddr.toLowerCase()) {
            return {
              spendersAllowancesForTokens: spendersMock,
            } as unknown as ethers.Contract;
          }
          return {
            balanceOf: jest
              .fn()
              .mockResolvedValue(ethers.utils.parseUnits('100', 6)),
          } as unknown as ethers.Contract;
        });
    });

    afterEach(() => {
      providerSpy.mockRestore();
      contractSpy.mockRestore();
    });

    it('invokes balance scanner (#fetchOnChainAllowances) and picks sole limited token as primary', async () => {
      spendersMock.mockResolvedValue([limitedTuple('50'), limitedTuple('0')]);

      const p = new BaanxProvider({ service, cardFeatureFlag });
      const result = await p.getOnChainAssets(ownerAddr);

      expect(spendersMock).toHaveBeenCalledWith(
        ownerAddr,
        [tokenA, tokenB],
        expect.arrayContaining([
          [foxGlobal, foxUs],
          [foxGlobal, foxUs],
        ]),
      );
      expect(result.fundingAssets).toHaveLength(2);
      expect(result.primaryFundingAsset?.address).toBe(tokenA);
      expect(result.primaryFundingAsset?.status).toBe(
        FundingAssetStatus.Limited,
      );
      expect(result.primaryFundingAsset?.spendableBalance).toBe('50');
      const assetB = result.fundingAssets.find(
        (a) => a.address.toLowerCase() === tokenB.toLowerCase(),
      );
      expect(assetB?.spendableBalance).toBe('0');
    });

    it('uses #findLastApprovedToken when multiple tokens have non-zero allowance and prefers latest Approval log', async () => {
      spendersMock.mockResolvedValue([limitedTuple('10'), limitedTuple('20')]);

      const iface = new ethers.utils.Interface([
        'event Approval(address indexed owner, address indexed spender, uint256 value)',
      ]);
      const approvalTopic = iface.getEventTopic('Approval');
      const ownerTopic = ethers.utils.hexZeroPad(ownerAddr.toLowerCase(), 32);
      const spenderTopic = ethers.utils.hexZeroPad(foxGlobal.toLowerCase(), 32);
      const valueEarly = ethers.utils.parseUnits('1', 6);
      const valueLate = ethers.utils.parseUnits('2', 6);

      getLogsMock.mockImplementation(
        async ({ address }: { address: string }) => {
          if (address.toLowerCase() === tokenA.toLowerCase()) {
            return [
              {
                address: tokenA,
                topics: [approvalTopic, ownerTopic, spenderTopic],
                data: ethers.utils.defaultAbiCoder.encode(
                  ['uint256'],
                  [valueEarly],
                ),
                blockNumber: 100,
                logIndex: 0,
                transactionIndex: 0,
                transactionHash: ethers.constants.HashZero,
                blockHash: ethers.constants.HashZero,
              },
            ];
          }
          if (address.toLowerCase() === tokenB.toLowerCase()) {
            return [
              {
                address: tokenB,
                topics: [approvalTopic, ownerTopic, spenderTopic],
                data: ethers.utils.defaultAbiCoder.encode(
                  ['uint256'],
                  [valueLate],
                ),
                blockNumber: 200,
                logIndex: 0,
                transactionIndex: 0,
                transactionHash: ethers.constants.HashZero,
                blockHash: ethers.constants.HashZero,
              },
            ];
          }
          return [];
        },
      );

      const p = new BaanxProvider({ service, cardFeatureFlag });
      const result = await p.getOnChainAssets(ownerAddr);

      expect(getLogsMock).toHaveBeenCalled();
      expect(result.primaryFundingAsset?.address.toLowerCase()).toBe(
        tokenB.toLowerCase(),
      );
    });

    it('falls back to first non-zero asset when #findLastApprovedToken logs fail', async () => {
      spendersMock.mockResolvedValue([limitedTuple('5'), limitedTuple('5')]);
      getLogsMock.mockRejectedValue(new Error('rpc down'));

      const p = new BaanxProvider({ service, cardFeatureFlag });
      const result = await p.getOnChainAssets(ownerAddr);

      expect(Logger.error).toHaveBeenCalled();
      expect(result.primaryFundingAsset?.address.toLowerCase()).toBe(
        tokenA.toLowerCase(),
      );
    });

    it('sets spendableBalance to wallet balance when wallet is below allowance', async () => {
      spendersMock.mockResolvedValue([limitedTuple('50'), limitedTuple('0')]);
      contractSpy.mockImplementation((address: string) => {
        if (address.toLowerCase() === scannerAddr.toLowerCase()) {
          return {
            spendersAllowancesForTokens: spendersMock,
          } as unknown as ethers.Contract;
        }
        if (address.toLowerCase() === tokenA.toLowerCase()) {
          return {
            balanceOf: jest
              .fn()
              .mockResolvedValue(ethers.utils.parseUnits('25', 6)),
          } as unknown as ethers.Contract;
        }
        return {
          balanceOf: jest
            .fn()
            .mockResolvedValue(ethers.utils.parseUnits('100', 6)),
        } as unknown as ethers.Contract;
      });

      const p = new BaanxProvider({ service, cardFeatureFlag });
      const result = await p.getOnChainAssets(ownerAddr);

      expect(result.primaryFundingAsset?.spendableBalance).toBe('25');
    });

    it('sets spendableBalance to zero when on-chain wallet balance is zero', async () => {
      spendersMock.mockResolvedValue([limitedTuple('50'), limitedTuple('0')]);
      contractSpy.mockImplementation((address: string) => {
        if (address.toLowerCase() === scannerAddr.toLowerCase()) {
          return {
            spendersAllowancesForTokens: spendersMock,
          } as unknown as ethers.Contract;
        }
        return {
          balanceOf: jest.fn().mockResolvedValue(ethers.constants.Zero),
        } as unknown as ethers.Contract;
      });

      const p = new BaanxProvider({ service, cardFeatureFlag });
      const result = await p.getOnChainAssets(ownerAddr);

      expect(result.primaryFundingAsset?.spendableBalance).toBe('0');
    });

    it('treats balanceOf failure as zero wallet balance and logs an error', async () => {
      spendersMock.mockResolvedValue([limitedTuple('50'), limitedTuple('0')]);
      contractSpy.mockImplementation((address: string) => {
        if (address.toLowerCase() === scannerAddr.toLowerCase()) {
          return {
            spendersAllowancesForTokens: spendersMock,
          } as unknown as ethers.Contract;
        }
        if (address.toLowerCase() === tokenA.toLowerCase()) {
          return {
            balanceOf: jest
              .fn()
              .mockRejectedValue(new Error('balanceOf reverted')),
          } as unknown as ethers.Contract;
        }
        return {
          balanceOf: jest
            .fn()
            .mockResolvedValue(ethers.utils.parseUnits('100', 6)),
        } as unknown as ethers.Contract;
      });

      const p = new BaanxProvider({ service, cardFeatureFlag });
      const result = await p.getOnChainAssets(ownerAddr);

      expect(result.primaryFundingAsset?.spendableBalance).toBe('0');
      expect(Logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          context: expect.objectContaining({
            name: 'BaanxProvider',
            data: expect.objectContaining({
              method: 'fetchOnChainAllowances/balanceOf',
              tokenAddr: tokenA,
              owner: ownerAddr,
            }),
          }),
        }),
      );
    });

    it('calls balanceOf on each token contract with the owner address', async () => {
      spendersMock.mockResolvedValue([limitedTuple('50'), limitedTuple('0')]);
      const balanceOfTokenA = jest
        .fn()
        .mockResolvedValue(ethers.utils.parseUnits('100', 6));
      const balanceOfTokenB = jest
        .fn()
        .mockResolvedValue(ethers.utils.parseUnits('100', 6));

      contractSpy.mockImplementation((address: string) => {
        if (address.toLowerCase() === scannerAddr.toLowerCase()) {
          return {
            spendersAllowancesForTokens: spendersMock,
          } as unknown as ethers.Contract;
        }
        if (address.toLowerCase() === tokenA.toLowerCase()) {
          return {
            balanceOf: balanceOfTokenA,
          } as unknown as ethers.Contract;
        }
        if (address.toLowerCase() === tokenB.toLowerCase()) {
          return {
            balanceOf: balanceOfTokenB,
          } as unknown as ethers.Contract;
        }
        return {} as unknown as ethers.Contract;
      });

      const p = new BaanxProvider({ service, cardFeatureFlag });
      await p.getOnChainAssets(ownerAddr);

      expect(balanceOfTokenA).toHaveBeenCalledWith(ownerAddr);
      expect(balanceOfTokenB).toHaveBeenCalledWith(ownerAddr);
    });
  });

  describe('getCardHomeData — #fetchOriginalSpendingCap', () => {
    const LINEA_CAIP = 'eip155:59144' as const;
    const walletAddr = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
    const tokenAddr = ethers.utils.getAddress(
      '0x3333333333333333333333333333333333333333',
    );
    const delegationContract = ethers.utils.getAddress(
      '0xdddddddddddddddddddddddddddddddddddddddd',
    );

    let getLogsMock: jest.Mock;
    let providerSpy: jest.SpyInstance;

    const cardFeatureFlag = {
      chains: {
        [LINEA_CAIP]: {
          tokens: [
            {
              address: tokenAddr,
              symbol: 'USDC',
              name: 'USDC',
              decimals: 6,
              enabled: true,
            },
          ],
          foxConnectAddresses: {
            global: ethers.constants.AddressZero,
            us: ethers.constants.AddressZero,
          },
          balanceScannerAddress: ethers.constants.AddressZero,
        },
      },
    } as unknown as CardFeatureFlag;

    beforeEach(() => {
      getLogsMock = jest.fn();
      providerSpy = jest
        .spyOn(ethers.providers, 'JsonRpcProvider')
        .mockImplementation(
          () =>
            ({
              getLogs: getLogsMock,
            }) as unknown as ethers.providers.JsonRpcProvider,
        );
    });

    afterEach(() => {
      providerSpy.mockRestore();
    });

    it('sets originalSpendingCap from latest Approval log for Limited EVM assets', async () => {
      const capWei = ethers.utils.parseUnits('750', 6);
      const iface = new ethers.utils.Interface([
        'event Approval(address indexed owner, address indexed spender, uint256 value)',
      ]);
      getLogsMock.mockResolvedValue([
        {
          address: tokenAddr,
          topics: [
            iface.getEventTopic('Approval'),
            ethers.utils.hexZeroPad(walletAddr.toLowerCase(), 32),
            ethers.utils.hexZeroPad(delegationContract.toLowerCase(), 32),
          ],
          data: ethers.utils.defaultAbiCoder.encode(['uint256'], [capWei]),
          blockNumber: 300,
          logIndex: 1,
          transactionIndex: 0,
          transactionHash: ethers.constants.HashZero,
          blockHash: ethers.constants.HashZero,
        },
      ]);

      const p = new BaanxProvider({ service, cardFeatureFlag });

      service.get.mockImplementation((path: string) => {
        if (path === '/v1/delegation/chain/config') {
          return Promise.resolve({
            networks: [
              {
                network: 'linea',
                environment: 'production',
                chainId: '59144',
                delegationContract,
                tokens: {
                  USDC: { symbol: 'USDC', decimals: 6, address: tokenAddr },
                },
              },
            ],
            count: 1,
            _links: { self: '' },
          });
        }
        if (path === '/v1/card/status') {
          return Promise.resolve({
            id: 'c1',
            status: CardStatus.ACTIVE,
            type: CardType.VIRTUAL,
            panLast4: '4242',
            holderName: 'T',
            isFreezable: true,
          });
        }
        if (path === '/v1/user') {
          return Promise.resolve({
            id: 'u1',
            verificationState: 'VERIFIED',
          });
        }
        if (path === '/v1/wallet/external') {
          return Promise.resolve([
            {
              address: walletAddr,
              currency: 'usdc',
              balance: '100',
              allowance: '500',
              network: 'linea',
            },
          ]);
        }
        if (path === '/v1/wallet/external/priority') {
          return Promise.resolve([]);
        }
        return Promise.resolve(null);
      });

      const result = await p.getCardHomeData(walletAddr, AUTH_TOKENS);

      expect(getLogsMock).toHaveBeenCalled();
      expect(
        parseFloat(result.primaryFundingAsset?.originalSpendingCap ?? ''),
      ).toBe(750);
    });

    it('does not fetch on-chain cap for SPENDING_LIMIT_UNSUPPORTED_TOKENS', async () => {
      const flagAusdc = {
        chains: {
          [LINEA_CAIP]: {
            tokens: [
              {
                address: tokenAddr,
                symbol: 'AUSDC',
                name: 'AUSDC',
                decimals: 6,
                enabled: true,
              },
            ],
            foxConnectAddresses: {
              global: ethers.constants.AddressZero,
              us: ethers.constants.AddressZero,
            },
            balanceScannerAddress: ethers.constants.AddressZero,
          },
        },
      } as unknown as CardFeatureFlag;
      const p = new BaanxProvider({ service, cardFeatureFlag: flagAusdc });

      service.get.mockImplementation((path: string) => {
        if (path === '/v1/delegation/chain/config') {
          return Promise.resolve({
            networks: [
              {
                network: 'linea',
                environment: 'production',
                chainId: '59144',
                delegationContract,
                tokens: {
                  AUSDC: { symbol: 'AUSDC', decimals: 6, address: tokenAddr },
                },
              },
            ],
            count: 1,
            _links: { self: '' },
          });
        }
        if (path === '/v1/card/status') {
          return Promise.resolve({
            id: 'c1',
            status: CardStatus.ACTIVE,
            type: CardType.VIRTUAL,
            panLast4: '4242',
            holderName: 'T',
            isFreezable: true,
          });
        }
        if (path === '/v1/user') {
          return Promise.resolve({
            id: 'u1',
            verificationState: 'VERIFIED',
          });
        }
        if (path === '/v1/wallet/external') {
          return Promise.resolve([
            {
              address: walletAddr,
              currency: 'ausdc',
              balance: '10',
              allowance: '100',
              network: 'linea',
            },
          ]);
        }
        if (path === '/v1/wallet/external/priority') {
          return Promise.resolve([]);
        }
        return Promise.resolve(null);
      });

      await p.getCardHomeData(walletAddr, AUTH_TOKENS);

      expect(getLogsMock).not.toHaveBeenCalled();
    });
  });

  describe('initiateAuth', () => {
    it('returns oauth2 session and sets service location from country', async () => {
      const session = await provider.initiateAuth('US');

      expect(session.currentStep).toStrictEqual({ type: 'oauth2' });
      expect(session.id.startsWith('oauth2-')).toBe(true);
      expect(session._metadata).toStrictEqual({ location: 'us' });
      expect(service.setLocation).toHaveBeenCalledWith('us');
    });
  });

  describe('submitCredentials', () => {
    const redirectUri = 'https://link.metamask.io/card-oauth';

    it('exchanges authorization code via oauth2 token endpoint', async () => {
      const accessJwt = buildAccessTokenJwt('FOX_US');
      service.request.mockResolvedValue({
        access_token: accessJwt,
        refresh_token: 'rt',
        expires_in: 3600,
        refresh_token_expires_in: 86400,
      });

      const session = await provider.initiateAuth('international');

      const result = await provider.submitCredentials(session, {
        type: 'oauth2',
        code: 'code-1',
        codeVerifier: 'verifier-1',
        redirectUri,
      });

      expect(result.done).toBe(true);
      expect(result.tokenSet?.accessToken).toBe(accessJwt);
      expect(result.tokenSet?.location).toBe('us');
      expect(service.setLocation).toHaveBeenCalledWith('us');
      expect(service.request).toHaveBeenCalledWith(
        '/v1/auth/oauth2/token',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('grant_type=authorization_code'),
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          location: 'international',
          timeout: 30_000,
        }),
      );
    });

    it('includes PKCE and client fields in form body', async () => {
      const accessJwt = buildAccessTokenJwt('FOX');
      service.request.mockResolvedValue({
        access_token: accessJwt,
        refresh_token: 'rt',
        expires_in: 3600,
      });
      const session = await provider.initiateAuth('US');

      await provider.submitCredentials(session, {
        type: 'oauth2',
        code: 'c',
        codeVerifier: 'v',
        redirectUri,
      });

      const [, opts] = (service.request as jest.Mock).mock.calls[0];
      const params = new URLSearchParams(opts.body as string);

      expect(params.get('grant_type')).toBe('authorization_code');
      expect(params.get('code')).toBe('c');
      expect(params.get('code_verifier')).toBe('v');
      expect(params.get('redirect_uri')).toBe(redirectUri);
      expect(params.get('client_id')).toBe('test-api-key');
    });

    it('throws when session metadata location is missing', async () => {
      await expect(
        provider.submitCredentials(
          {
            id: 'x',
            currentStep: { type: 'oauth2' },
            _metadata: {},
          },
          {
            type: 'oauth2',
            code: 'c',
            codeVerifier: 'v',
            redirectUri,
          },
        ),
      ).rejects.toThrow('missing location');
    });

    it('throws when OAuth2 response has no access token', async () => {
      service.request.mockResolvedValue({
        refresh_token: 'rt',
        expires_in: 3600,
      });
      const session = await provider.initiateAuth('US');

      await expect(
        provider.submitCredentials(session, {
          type: 'oauth2',
          code: 'c',
          codeVerifier: 'v',
          redirectUri,
        }),
      ).rejects.toMatchObject({
        code: CardProviderErrorCode.InvalidCredentials,
      });
    });

    it('throws when access token JWT app_id is unknown', async () => {
      const payload = base64UrlEncodeUtf8(JSON.stringify({ app_id: 'OTHER' }));
      const badJwt = `h.${payload}.s`;
      service.request.mockResolvedValue({
        access_token: badJwt,
        refresh_token: 'rt',
        expires_in: 3600,
      });
      const session = await provider.initiateAuth('US');

      await expect(
        provider.submitCredentials(session, {
          type: 'oauth2',
          code: 'c',
          codeVerifier: 'v',
          redirectUri,
        }),
      ).rejects.toMatchObject({
        code: CardProviderErrorCode.InvalidCredentials,
      });
    });

    it('maps token exchange CardApiError to CardProviderError', async () => {
      const session = await provider.initiateAuth('US');
      service.request.mockRejectedValue(
        new CardApiError(401, '/v1/auth/oauth2/token', 'Unauthorized'),
      );

      await expect(
        provider.submitCredentials(session, {
          type: 'oauth2',
          code: 'c',
          codeVerifier: 'v',
          redirectUri,
        }),
      ).rejects.toMatchObject({
        code: CardProviderErrorCode.InvalidCredentials,
      });
    });

    it('throws for unsupported credential type', async () => {
      const session = await provider.initiateAuth('US');

      await expect(
        provider.submitCredentials(session, {
          type: 'email_password',
          email: 'a@b.com',
          password: 'p',
        }),
      ).rejects.toThrow('Unsupported credential type');
    });
  });

  describe('logout', () => {
    it('revokes access and refresh via oauth2/revoke in parallel', async () => {
      service.request.mockResolvedValue({});

      await provider.logout(AUTH_TOKENS);

      expect(service.request).toHaveBeenCalledWith('/v1/auth/oauth2/revoke', {
        method: 'POST',
        body: {
          token: AUTH_TOKENS.accessToken,
          token_hint: 'access_token',
        },
        location: 'us',
        timeout: 30_000,
      });
      expect(service.request).toHaveBeenCalledWith('/v1/auth/oauth2/revoke', {
        method: 'POST',
        body: {
          token: AUTH_TOKENS.refreshToken,
          token_hint: 'refresh_token',
        },
        location: 'us',
        timeout: 30_000,
      });
      expect(service.post).not.toHaveBeenCalled();
    });

    it('revokes only access when there is no refresh token', async () => {
      service.request.mockResolvedValue({});
      const accessOnly = { ...AUTH_TOKENS, refreshToken: undefined };

      await provider.logout(accessOnly);

      expect(service.request).toHaveBeenCalledTimes(1);
      expect(service.request).toHaveBeenCalledWith('/v1/auth/oauth2/revoke', {
        method: 'POST',
        body: {
          token: accessOnly.accessToken,
          token_hint: 'access_token',
        },
        location: 'us',
        timeout: 30_000,
      });
      expect(service.post).not.toHaveBeenCalled();
    });

    it('resolves without calling legacy logout when revoke requests fail', async () => {
      service.request.mockRejectedValue(
        new CardApiError(400, '/v1/auth/oauth2/revoke', 'Bad request'),
      );

      await expect(provider.logout(AUTH_TOKENS)).resolves.toBeUndefined();

      expect(service.post).not.toHaveBeenCalled();
    });

    it('resolves when refresh revoke fails after access revoke succeeds', async () => {
      service.request
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(
          new CardApiError(400, '/v1/auth/oauth2/revoke', 'Bad request'),
        );

      await expect(provider.logout(AUTH_TOKENS)).resolves.toBeUndefined();

      expect(service.request).toHaveBeenCalledTimes(2);
      expect(service.post).not.toHaveBeenCalled();
    });
  });

  describe('refreshTokens', () => {
    it('returns new token set from refresh endpoint', async () => {
      const newAccess = buildAccessTokenJwt('FOX_US');
      service.request.mockResolvedValue({
        access_token: newAccess,
        refresh_token: 'new-refresh',
        expires_in: 7200,
        refresh_token_expires_in: 172800,
      });

      const result = await provider.refreshTokens(AUTH_TOKENS);

      expect(result.accessToken).toBe(newAccess);
      expect(result.refreshToken).toBe('new-refresh');
      expect(result.location).toBe('us');
      expect(service.request).toHaveBeenCalledWith(
        '/v1/auth/oauth2/token',
        expect.objectContaining({
          method: 'POST',
          body: {
            grant_type: 'refresh_token',
            refresh_token: 'test-refresh',
          },
          location: 'us',
        }),
      );
    });

    it('throws when no refresh token is available', async () => {
      const accessOnly = { ...AUTH_TOKENS, refreshToken: undefined };

      await expect(provider.refreshTokens(accessOnly)).rejects.toThrow(
        'No refresh token available',
      );
    });
  });

  describe('getCardDetailsView', () => {
    it('returns url and token from the details endpoint', async () => {
      service.post.mockResolvedValue({
        imageUrl: 'https://secure.view/card',
        token: 'view-token-123',
      });

      const result = await provider.getCardDetailsView(AUTH_TOKENS, {
        customCss: {
          card: 'color: red',
        },
      });

      expect(result.url).toBe('https://secure.view/card');
      expect(result.token).toBe('view-token-123');
      expect(service.post).toHaveBeenCalledWith(
        '/v1/card/details/token',
        {
          customCss: {
            card: 'color: red',
          },
        },
        AUTH_TOKENS,
      );
    });

    it('propagates error when secure view request fails', async () => {
      service.post.mockRejectedValue(
        new CardApiError(500, '/v1/card/details/token', 'Server error'),
      );

      await expect(
        provider.getCardDetailsView(AUTH_TOKENS, {}),
      ).rejects.toThrow();
    });
  });

  describe('updateAssetPriority', () => {
    it('sends priority mapping with selected asset as priority 1', async () => {
      service.put.mockResolvedValue({});

      const assets = [
        {
          symbol: 'USDC',
          name: 'USDC',
          address: '0x1',
          walletAddress: '0xwallet',
          decimals: 6,
          chainId: 'eip155:59144' as const,
          spendableBalance: '100',
          spendingCap: '999999999999',
          priority: 1,
          status: FundingAssetStatus.Active,
          externalId: 1,
        },
        {
          symbol: 'mUSD',
          name: 'mUSD',
          address: '0x2',
          walletAddress: '0xwallet',
          decimals: 6,
          chainId: 'eip155:8453' as const,
          spendableBalance: '50',
          spendingCap: '999999999999',
          priority: 2,
          status: FundingAssetStatus.Active,
          externalId: 2,
        },
      ];

      await provider.updateAssetPriority(assets[1], assets, AUTH_TOKENS);

      // Sorted by original priority: [USDC(1), mUSD(2)]
      // mUSD matches selected → priority 1; USDC doesn't → priority 2
      expect(service.put).toHaveBeenCalledWith(
        '/v1/wallet/external/priority',
        {
          wallets: [
            { id: 1, priority: 2 },
            { id: 2, priority: 1 },
          ],
        },
        AUTH_TOKENS,
      );
    });

    it('produces contiguous priorities when first of three assets is selected', async () => {
      service.put.mockResolvedValue({});

      const assets = [
        {
          symbol: 'USDC',
          name: 'USDC',
          address: '0x1',
          walletAddress: '0xwallet',
          decimals: 6,
          chainId: 'eip155:59144' as const,
          spendableBalance: '100',
          spendingCap: '999999999999',
          priority: 2,
          status: FundingAssetStatus.Active,
          externalId: 1,
        },
        {
          symbol: 'mUSD',
          name: 'mUSD',
          address: '0x2',
          walletAddress: '0xwallet',
          decimals: 6,
          chainId: 'eip155:8453' as const,
          spendableBalance: '50',
          spendingCap: '999999999999',
          priority: 1,
          status: FundingAssetStatus.Active,
          externalId: 2,
        },
        {
          symbol: 'USDT',
          name: 'USDT',
          address: '0x3',
          walletAddress: '0xwallet',
          decimals: 6,
          chainId: 'eip155:59144' as const,
          spendableBalance: '25',
          spendingCap: '999999999999',
          priority: 3,
          status: FundingAssetStatus.Active,
          externalId: 3,
        },
      ];

      await provider.updateAssetPriority(assets[0], assets, AUTH_TOKENS);

      // Sorted by original priority: [mUSD(1), USDC(2), USDT(3)]
      // USDC matches selected → priority 1; mUSD and USDT don't → 2, 3
      expect(service.put).toHaveBeenCalledWith(
        '/v1/wallet/external/priority',
        {
          wallets: [
            { id: 2, priority: 2 },
            { id: 1, priority: 1 },
            { id: 3, priority: 3 },
          ],
        },
        AUTH_TOKENS,
      );
    });
  });

  describe('approveFunding', () => {
    it('posts funding approval to the delegation endpoint', async () => {
      service.post.mockResolvedValue({});

      await provider.approveFunding(
        {
          address: '0xwallet',
          amount: '1000',
          currency: 'USDC',
          network: 'linea',
          faucet: true,
        },
        AUTH_TOKENS,
        {} as never,
      );

      expect(service.post).toHaveBeenCalledWith(
        '/v1/delegation/evm/post-approval',
        {
          walletAddress: '0xwallet',
          amount: '1000',
          currency: 'USDC',
          network: 'linea',
          faucet: true,
        },
        AUTH_TOKENS,
      );
    });

    it('defaults faucet to false when not provided', async () => {
      service.post.mockResolvedValue({});

      await provider.approveFunding(
        {
          address: '0xwallet',
          amount: '500',
          currency: 'mUSD',
          network: 'base',
        },
        AUTH_TOKENS,
        {} as never,
      );

      expect(service.post).toHaveBeenCalledWith(
        '/v1/delegation/evm/post-approval',
        expect.objectContaining({ faucet: false }),
        AUTH_TOKENS,
      );
    });

    it('propagates error when funding approval fails', async () => {
      service.post.mockRejectedValue(
        new CardApiError(
          500,
          '/v1/delegation/evm/post-approval',
          'Server error',
        ),
      );

      await expect(
        provider.approveFunding(
          {
            address: '0xwallet',
            amount: '1000',
            currency: 'USDC',
            network: 'linea',
          },
          AUTH_TOKENS,
          {} as never,
        ),
      ).rejects.toThrow();
    });
  });

  describe('getRegistrationSettings', () => {
    it('sets location and returns mapped country list', async () => {
      service.get.mockResolvedValue({
        countries: [
          { iso3166alpha2: 'US', name: 'United States' },
          { iso3166alpha2: 'GB', name: 'United Kingdom' },
        ],
      });

      const result = await provider.getRegistrationSettings('US');

      expect(service.setLocation).toHaveBeenCalledWith('us');
      expect(result.countries).toStrictEqual(['US', 'GB']);
      expect(result.data).toBeDefined();
    });

    it('sets international location for non-US country', async () => {
      service.get.mockResolvedValue({ countries: [] });

      await provider.getRegistrationSettings('DE');

      expect(service.setLocation).toHaveBeenCalledWith('international');
    });

    it('propagates error when settings request fails', async () => {
      service.get.mockRejectedValue(
        new CardApiError(500, '/v1/auth/register/settings', 'Server error'),
      );

      await expect(provider.getRegistrationSettings('US')).rejects.toThrow();
    });
  });

  describe('getRegistrationStatus', () => {
    it('returns status from registration endpoint', async () => {
      service.get.mockResolvedValue({
        verificationState: 'VERIFIED',
        firstName: 'Test',
      });

      const result = await provider.getRegistrationStatus('session-1', 'GB');

      expect(service.setLocation).toHaveBeenCalledWith('international');
      expect(service.get).toHaveBeenCalledWith(
        '/v1/auth/register/status/session-1',
      );
      expect(result.status).toBe('VERIFIED');
      expect(result.verificationState).toBe('VERIFIED');
    });

    it('returns UNKNOWN when verificationState is absent', async () => {
      service.get.mockResolvedValue({});

      const result = await provider.getRegistrationStatus('session-2', 'US');

      expect(result.status).toBe('UNKNOWN');
      expect(result.verificationState).toBeUndefined();
    });

    it('propagates error when status request fails', async () => {
      service.get.mockRejectedValue(
        new CardApiError(500, '/v1/auth/register/status/s1', 'Server error'),
      );

      await expect(
        provider.getRegistrationStatus('s1', 'US'),
      ).rejects.toThrow();
    });
  });

  describe('submitOnboardingStep', () => {
    it('posts to the mapped endpoint for a known step type', async () => {
      service.post.mockResolvedValue({ id: 'result-1' });

      const result = await provider.submitOnboardingStep({
        type: 'email_verification',
        data: { email: 'test@example.com' },
        country: 'US',
      });

      expect(service.setLocation).toHaveBeenCalledWith('us');
      expect(service.post).toHaveBeenCalledWith(
        '/v1/auth/register/email/send',
        { email: 'test@example.com' },
      );
      expect(result.success).toBe(true);
      expect(result.data).toStrictEqual({ id: 'result-1' });
    });

    it('falls back to generic endpoint for unknown step type', async () => {
      service.post.mockResolvedValue({});

      await provider.submitOnboardingStep({
        type: 'custom_step',
        data: {},
        country: 'GB',
      });

      expect(service.post).toHaveBeenCalledWith(
        '/v1/auth/register/custom_step',
        {},
      );
    });

    it('returns error result when the request fails', async () => {
      service.post.mockRejectedValue(new Error('Network failure'));

      const result = await provider.submitOnboardingStep({
        type: 'phone_verification',
        data: { phone: '+1234' },
        country: 'US',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network failure');
    });
  });

  describe('getCardHomeData edge cases', () => {
    it('does not build close_to_spending_limit alert for Limited asset without on-chain data', async () => {
      service.get.mockImplementation((path: string) => {
        if (path === '/v1/delegation/chain/config') {
          return Promise.resolve({ networks: [] });
        }
        if (path === '/v1/card/status') {
          return Promise.resolve({
            id: 'card-1',
            status: CardStatus.ACTIVE,
            type: CardType.VIRTUAL,
            panLast4: '1234',
            holderName: 'Test',
            isFreezable: true,
          });
        }
        if (path === '/v1/user') {
          return Promise.resolve({
            id: 'user-1',
            verificationState: 'VERIFIED',
          });
        }
        if (path === '/v1/wallet/external') {
          return Promise.resolve([
            {
              id: 1,
              walletAddress: '0xwallet',
              currency: 'USDC',
              balance: '50',
              allowance: '100',
              priority: 1,
              tokenDetails: {
                address: '0x1',
                decimals: 6,
                symbol: 'USDC',
                name: 'USDC',
              },
              caipChainId: 'eip155:59144',
              network: 'linea',
            },
          ]);
        }
        if (path === '/v1/wallet/external/priority') {
          return Promise.resolve([]);
        }
        return Promise.resolve({});
      });

      const result = await provider.getCardHomeData('0xaddr', AUTH_TOKENS);

      expect(result.alerts).not.toContainEqual(
        expect.objectContaining({ type: 'close_to_spending_limit' }),
      );
    });

    it('does not build close_to_spending_limit alert for unsupported tokens (AUSDC, AMUSD)', async () => {
      service.get.mockImplementation((path: string) => {
        if (path === '/v1/delegation/chain/config') {
          return Promise.resolve({ networks: [] });
        }
        if (path === '/v1/card/status') {
          return Promise.resolve({
            id: 'card-1',
            status: CardStatus.ACTIVE,
            type: CardType.VIRTUAL,
            panLast4: '1234',
            holderName: 'Test',
            isFreezable: true,
          });
        }
        if (path === '/v1/user') {
          return Promise.resolve({
            id: 'user-1',
            verificationState: 'VERIFIED',
          });
        }
        if (path === '/v1/wallet/external') {
          return Promise.resolve([
            {
              id: 1,
              walletAddress: '0xwallet',
              currency: 'AUSDC',
              balance: '50',
              allowance: '100',
              priority: 1,
              tokenDetails: {
                address: '0x1',
                decimals: 6,
                symbol: 'AUSDC',
                name: 'AUSDC',
              },
              caipChainId: 'eip155:59144',
              network: 'linea',
            },
          ]);
        }
        if (path === '/v1/wallet/external/priority') {
          return Promise.resolve([]);
        }
        return Promise.resolve({});
      });

      const result = await provider.getCardHomeData('0xaddr', AUTH_TOKENS);

      expect(result.alerts).not.toContainEqual(
        expect.objectContaining({ type: 'close_to_spending_limit' }),
      );
    });

    it('suppresses non-kyc alerts when card is frozen', async () => {
      service.get.mockImplementation((path: string) => {
        if (path === '/v1/delegation/chain/config') {
          return Promise.resolve({ networks: [] });
        }
        if (path === '/v1/card/status') {
          return Promise.resolve({
            id: 'card-1',
            status: CardStatus.FROZEN,
            type: CardType.VIRTUAL,
            panLast4: '1234',
            holderName: 'Test',
            isFreezable: true,
          });
        }
        if (path === '/v1/user') {
          return Promise.resolve({
            id: 'user-1',
            verificationState: 'VERIFIED',
          });
        }
        if (path === '/v1/wallet/external') {
          return Promise.resolve([
            {
              id: 1,
              walletAddress: '0xwallet',
              currency: 'USDC',
              balance: '50',
              allowance: '100',
              priority: 1,
              tokenDetails: {
                address: '0x1',
                decimals: 6,
                symbol: 'USDC',
                name: 'USDC',
              },
              caipChainId: 'eip155:59144',
              network: 'linea',
            },
          ]);
        }
        if (path === '/v1/wallet/external/priority') {
          return Promise.resolve([]);
        }
        return Promise.resolve({});
      });

      const result = await provider.getCardHomeData('0xaddr', AUTH_TOKENS);

      expect(result.alerts).not.toContainEqual(
        expect.objectContaining({ type: 'close_to_spending_limit' }),
      );
    });

    it('returns enable_card when verified with no card and no assets', async () => {
      service.get.mockImplementation((path: string) => {
        if (path === '/v1/delegation/chain/config') {
          return Promise.resolve({ networks: [] });
        }
        if (path === '/v1/card/status') {
          return Promise.reject(new Error('no card'));
        }
        if (path === '/v1/user') {
          return Promise.resolve({
            id: 'user-1',
            verificationState: 'VERIFIED',
          });
        }
        return Promise.resolve([]);
      });

      const result = await provider.getCardHomeData('0xaddr', AUTH_TOKENS);

      expect(result.card).toBeNull();
      expect(result.actions).toContainEqual(
        expect.objectContaining({ type: 'enable_card' }),
      );
    });

    it('returns no actions when card is null and user is not verified', async () => {
      service.get.mockImplementation((path: string) => {
        if (path === '/v1/delegation/chain/config') {
          return Promise.resolve({ networks: [] });
        }
        if (path === '/v1/card/status') {
          return Promise.reject(new Error('no card'));
        }
        if (path === '/v1/user') {
          return Promise.resolve({
            id: 'user-1',
            verificationState: 'PENDING',
          });
        }
        return Promise.resolve([]);
      });

      const result = await provider.getCardHomeData('0xaddr', AUTH_TOKENS);

      expect(result.card).toBeNull();
      expect(result.actions).toHaveLength(0);
    });

    it('falls back to next priority asset when user priority has no balance', async () => {
      service.get.mockImplementation((path: string) => {
        if (path === '/v1/delegation/chain/config') {
          return Promise.resolve({
            networks: [
              { network: 'linea', chainId: '59144', tokens: { USDC: {} } },
            ],
          });
        }
        if (path === '/v1/card/status') {
          return Promise.reject(new Error('no card'));
        }
        if (path === '/v1/user') {
          return Promise.reject(new Error('no user'));
        }
        if (path === '/v1/wallet/external') {
          return Promise.resolve([
            {
              id: 1,
              walletAddress: '0xwallet',
              currency: 'mUSD',
              balance: '0',
              allowance: '999999999999',
              priority: 0,
              tokenDetails: {
                address: '0x2',
                decimals: 6,
                symbol: 'mUSD',
                name: 'mUSD',
              },
              caipChainId: 'eip155:59144',
              network: 'linea',
            },
            {
              id: 2,
              walletAddress: '0xwallet',
              currency: 'USDC',
              balance: '50',
              allowance: '999999999999',
              priority: 0,
              tokenDetails: {
                address: '0x1',
                decimals: 6,
                symbol: 'USDC',
                name: 'USDC',
              },
              caipChainId: 'eip155:59144',
              network: 'linea',
            },
          ]);
        }
        if (path === '/v1/wallet/external/priority') {
          return Promise.resolve([
            {
              id: 1,
              address: '0xwallet',
              currency: 'mUSD',
              network: 'linea',
              priority: 1,
            },
            {
              id: 2,
              address: '0xwallet',
              currency: 'USDC',
              network: 'linea',
              priority: 2,
            },
          ]);
        }
        return Promise.resolve({});
      });

      const result = await provider.getCardHomeData('0xaddr', AUTH_TOKENS);

      expect(result.fundingAssets).toHaveLength(2);
      // fetchWalletDetails uppercases currency when no matching token found in feature flags
      expect(result.fundingAssets[0].symbol).toBe('MUSD');
      expect(result.fundingAssets[1].symbol).toBe('USDC');
      expect(result.primaryFundingAsset?.symbol).toBe('USDC');
    });

    it('uses user priority asset when no other asset has balance', async () => {
      service.get.mockImplementation((path: string) => {
        if (path === '/v1/delegation/chain/config') {
          return Promise.resolve({
            networks: [
              { network: 'linea', chainId: '59144', tokens: { USDC: {} } },
            ],
          });
        }
        if (path === '/v1/card/status') {
          return Promise.reject(new Error('no card'));
        }
        if (path === '/v1/user') {
          return Promise.reject(new Error('no user'));
        }
        if (path === '/v1/wallet/external') {
          return Promise.resolve([
            {
              id: 1,
              walletAddress: '0xwallet',
              currency: 'mUSD',
              balance: '0',
              allowance: '999999999999',
              priority: 0,
              tokenDetails: {
                address: '0x2',
                decimals: 6,
                symbol: 'mUSD',
                name: 'mUSD',
              },
              caipChainId: 'eip155:59144',
              network: 'linea',
            },
            {
              id: 2,
              walletAddress: '0xwallet',
              currency: 'USDC',
              balance: '0',
              allowance: '999999999999',
              priority: 0,
              tokenDetails: {
                address: '0x1',
                decimals: 6,
                symbol: 'USDC',
                name: 'USDC',
              },
              caipChainId: 'eip155:59144',
              network: 'linea',
            },
          ]);
        }
        if (path === '/v1/wallet/external/priority') {
          return Promise.resolve([
            {
              id: 1,
              address: '0xwallet',
              currency: 'mUSD',
              network: 'linea',
              priority: 1,
            },
            {
              id: 2,
              address: '0xwallet',
              currency: 'USDC',
              network: 'linea',
              priority: 2,
            },
          ]);
        }
        return Promise.resolve({});
      });

      const result = await provider.getCardHomeData('0xaddr', AUTH_TOKENS);

      // fetchWalletDetails uppercases currency when no matching token found in feature flags
      expect(result.primaryFundingAsset?.symbol).toBe('MUSD');
    });

    function setupProvisioningEligibilityMock(
      svc: jest.Mocked<BaanxService>,
      overrides: {
        cardStatus?: CardStatus;
        createdAt?: string | null;
      } = {},
    ) {
      const { cardStatus = CardStatus.ACTIVE, createdAt } = overrides;
      svc.get.mockImplementation((path: string) => {
        if (path === '/v1/delegation/chain/config') {
          return Promise.resolve({ networks: [] });
        }
        if (path === '/v1/card/status') {
          return Promise.resolve({
            id: 'card-1',
            status: cardStatus,
            type: CardType.VIRTUAL,
            panLast4: '1234',
            holderName: 'Test',
            isFreezable: true,
          });
        }
        if (path === '/v1/user') {
          return Promise.resolve({
            id: 'user-1',
            firstName: 'Test',
            lastName: 'User',
            verificationState: 'VERIFIED',
            ...(createdAt !== undefined ? { createdAt } : {}),
          });
        }
        if (path === '/v1/wallet/external') {
          return Promise.resolve([]);
        }
        if (path === '/v1/wallet/external/priority') {
          return Promise.resolve([]);
        }
        return Promise.resolve({});
      });
    }

    it('sets provisioningEligible true for active card with account created after cutoff', async () => {
      setupProvisioningEligibilityMock(service, {
        createdAt: '2026-01-15T00:00:00.000Z',
      });

      const result = await provider.getCardHomeData('0xaddr', AUTH_TOKENS);

      expect(result.account?.provisioningEligible).toBe(true);
    });

    it('sets provisioningEligible false for active card with account created before cutoff', async () => {
      setupProvisioningEligibilityMock(service, {
        createdAt: '2025-11-09T23:59:59.999Z',
      });

      const result = await provider.getCardHomeData('0xaddr', AUTH_TOKENS);

      expect(result.account?.provisioningEligible).toBe(false);
    });

    it('sets provisioningEligible false when createdAt is missing', async () => {
      setupProvisioningEligibilityMock(service);

      const result = await provider.getCardHomeData('0xaddr', AUTH_TOKENS);

      expect(result.account?.provisioningEligible).toBe(false);
    });

    it('sets provisioningEligible false when card is not active', async () => {
      setupProvisioningEligibilityMock(service, {
        cardStatus: CardStatus.FROZEN,
        createdAt: '2026-01-15T00:00:00.000Z',
      });

      const result = await provider.getCardHomeData('0xaddr', AUTH_TOKENS);

      expect(result.account?.provisioningEligible).toBe(false);
    });
  });

  describe('getFundingConfig', () => {
    it('returns all tokens from all supported networks', async () => {
      service.get.mockResolvedValue({
        networks: [
          {
            network: 'linea',
            chainId: '59144',
            environment: 'production',
            delegationContract: '0xdel1',
            tokens: {
              USDC: { symbol: 'USDC', decimals: 6, address: '0xusdc-linea' },
              mUSD: { symbol: 'mUSD', decimals: 18, address: '0xmusd-linea' },
            },
          },
          {
            network: 'base',
            chainId: '8453',
            environment: 'production',
            delegationContract: '0xdel2',
            tokens: {
              USDT: { symbol: 'USDT', decimals: 6, address: '0xusdt-base' },
            },
          },
        ],
      });

      const config = await provider.getFundingConfig(AUTH_TOKENS);

      expect(config.maxLimit).toBe('2199023255551');
      expect(config.supportedChains).toStrictEqual([
        'eip155:59144',
        'eip155:8453',
      ]);
      expect(config.fundingOptions).toHaveLength(3);
      expect(config.fundingOptions).toStrictEqual([
        expect.objectContaining({
          symbol: 'USDC',
          asset: expect.objectContaining({
            address: '0xusdc-linea',
            decimals: 6,
            chainId: 'eip155:59144',
          }),
        }),
        expect.objectContaining({
          symbol: 'mUSD',
          asset: expect.objectContaining({
            address: '0xmusd-linea',
            decimals: 18,
            chainId: 'eip155:59144',
          }),
        }),
        expect.objectContaining({
          symbol: 'USDT',
          asset: expect.objectContaining({
            address: '0xusdt-base',
            decimals: 6,
            chainId: 'eip155:8453',
          }),
        }),
      ]);
    });

    it('deduplicates tokens by address and chainId', async () => {
      service.get.mockResolvedValue({
        networks: [
          {
            network: 'linea',
            chainId: '59144',
            environment: 'production',
            delegationContract: '0xdel1',
            tokens: {
              USDC: { symbol: 'USDC', decimals: 6, address: '0xusdc' },
              USDC_v2: { symbol: 'USDC', decimals: 6, address: '0xusdc' },
            },
          },
        ],
      });

      const config = await provider.getFundingConfig(AUTH_TOKENS);

      expect(config.fundingOptions).toHaveLength(1);
    });

    it('skips tokens without an address', async () => {
      service.get.mockResolvedValue({
        networks: [
          {
            network: 'linea',
            chainId: '59144',
            environment: 'production',
            delegationContract: '0xdel1',
            tokens: {
              USDC: { symbol: 'USDC', decimals: 6, address: '0xusdc' },
              BAD: { symbol: 'BAD', decimals: 6, address: '' },
            },
          },
        ],
      });

      const config = await provider.getFundingConfig(AUTH_TOKENS);

      expect(config.fundingOptions).toHaveLength(1);
      expect(config.fundingOptions[0].symbol).toBe('USDC');
    });

    it('excludes unsupported networks', async () => {
      service.get.mockResolvedValue({
        networks: [
          {
            network: 'linea',
            chainId: '59144',
            environment: 'production',
            delegationContract: '0xdel1',
            tokens: {
              USDC: { symbol: 'USDC', decimals: 6, address: '0xusdc' },
            },
          },
          {
            network: 'polygon',
            chainId: '137',
            environment: 'production',
            delegationContract: '0xdel2',
            tokens: {
              DAI: { symbol: 'DAI', decimals: 18, address: '0xdai' },
            },
          },
        ],
      });

      const config = await provider.getFundingConfig(AUTH_TOKENS);

      expect(config.supportedChains).toStrictEqual(['eip155:59144']);
      expect(config.fundingOptions).toHaveLength(1);
      expect(config.fundingOptions[0].symbol).toBe('USDC');
    });

    it('sets stagingTokenAddress for non-production environments', async () => {
      service.get.mockResolvedValue({
        networks: [
          {
            network: 'linea',
            chainId: '59144',
            environment: 'staging',
            delegationContract: '0xdel1',
            tokens: {
              USDC: { symbol: 'USDC', decimals: 6, address: '0xstaging-usdc' },
            },
          },
        ],
      });

      const config = await provider.getFundingConfig(AUTH_TOKENS);

      expect(config.fundingOptions).toHaveLength(1);
      expect(config.fundingOptions[0].asset?.stagingTokenAddress).toBe(
        '0xstaging-usdc',
      );
    });

    it('omits stagingTokenAddress for production environments', async () => {
      service.get.mockResolvedValue({
        networks: [
          {
            network: 'linea',
            chainId: '59144',
            environment: 'production',
            delegationContract: '0xdel1',
            tokens: {
              USDC: { symbol: 'USDC', decimals: 6, address: '0xprod-usdc' },
            },
          },
        ],
      });

      const config = await provider.getFundingConfig(AUTH_TOKENS);

      expect(
        config.fundingOptions[0].asset?.stagingTokenAddress,
      ).toBeUndefined();
    });

    it('propagates error when delegation config fails', async () => {
      service.get.mockRejectedValue(
        new CardApiError(500, '/v1/delegation/chain/config', 'Server error'),
      );

      await expect(provider.getFundingConfig(AUTH_TOKENS)).rejects.toThrow();
    });
  });

  describe('getCardPinView', () => {
    it('returns url and token from the pin endpoint', async () => {
      service.post.mockResolvedValue({
        imageUrl: 'https://pin.example.com/view',
        token: 'pin-view-tok',
      });

      const result = await provider.getCardPinView(AUTH_TOKENS, {
        customCss: { card: 'color: blue' },
      });

      expect(service.post).toHaveBeenCalledWith(
        '/v1/card/pin/token',
        { customCss: { card: 'color: blue' } },
        AUTH_TOKENS,
      );
      expect(result).toStrictEqual({
        url: 'https://pin.example.com/view',
        token: 'pin-view-tok',
      });
    });

    it('propagates error when pin view request fails', async () => {
      service.post.mockRejectedValue(new Error('pin service down'));

      await expect(
        provider.getCardPinView(AUTH_TOKENS, { customCss: {} }),
      ).rejects.toThrow('pin service down');
    });
  });

  describe('createGoogleWalletProvisioningRequest', () => {
    it('returns opaquePaymentCard from Google endpoint', async () => {
      service.post.mockResolvedValue({
        success: true,
        data: { opaquePaymentCard: 'opaque-card-data' },
      });

      const result =
        await provider.createGoogleWalletProvisioningRequest(AUTH_TOKENS);

      expect(service.post).toHaveBeenCalledWith(
        '/v1/card/wallet/provision/google',
        {},
        AUTH_TOKENS,
      );
      expect(result).toStrictEqual({ opaquePaymentCard: 'opaque-card-data' });
    });

    it('throws when response is missing opaquePaymentCard', async () => {
      service.post.mockResolvedValue({ success: true, data: {} });

      await expect(
        provider.createGoogleWalletProvisioningRequest(AUTH_TOKENS),
      ).rejects.toThrow(
        'Google Wallet provisioning response missing opaquePaymentCard',
      );
    });
  });

  describe('createApplePayProvisioningRequest', () => {
    const appleParams = {
      leafCertificate: 'leaf-cert',
      intermediateCertificate: 'inter-cert',
      nonce: 'nonce-123',
      nonceSignature: 'nonce-sig',
    };

    it('returns provisioning data from nested response', async () => {
      service.post.mockResolvedValue({
        success: true,
        data: {
          encryptedPassData: 'enc-pass',
          activationData: 'act-data',
          ephemeralPublicKey: 'epk',
        },
      });

      const result = await provider.createApplePayProvisioningRequest(
        appleParams,
        AUTH_TOKENS,
      );

      expect(result).toStrictEqual({
        encryptedPassData: 'enc-pass',
        activationData: 'act-data',
        ephemeralPublicKey: 'epk',
      });
    });

    it('returns provisioning data from flat response', async () => {
      service.post.mockResolvedValue({
        encryptedPassData: 'enc-pass-flat',
        activationData: 'act-data-flat',
        ephemeralPublicKey: 'epk-flat',
      });

      const result = await provider.createApplePayProvisioningRequest(
        appleParams,
        AUTH_TOKENS,
      );

      expect(result).toStrictEqual({
        encryptedPassData: 'enc-pass-flat',
        activationData: 'act-data-flat',
        ephemeralPublicKey: 'epk-flat',
      });
    });

    it('throws when required fields are missing', async () => {
      service.post.mockResolvedValue({
        success: true,
        data: { encryptedPassData: 'enc' },
      });

      await expect(
        provider.createApplePayProvisioningRequest(appleParams, AUTH_TOKENS),
      ).rejects.toThrow(
        'Apple Pay provisioning response missing required fields',
      );
    });
  });

  describe('getCashbackWallet', () => {
    it('returns wallet data from reward endpoint', async () => {
      const wallet = { id: 'w1', balance: '10', currency: 'musd' };
      service.get.mockResolvedValue(wallet);

      const result = await provider.getCashbackWallet(AUTH_TOKENS);

      expect(service.get).toHaveBeenCalledWith(
        '/v1/wallet/reward',
        AUTH_TOKENS,
      );
      expect(result).toStrictEqual(wallet);
    });
  });

  describe('getCashbackWithdrawEstimation', () => {
    it('returns estimation from endpoint', async () => {
      const estimation = { estimatedAmount: '5', fee: '0.1' };
      service.get.mockResolvedValue(estimation);

      const result = await provider.getCashbackWithdrawEstimation(AUTH_TOKENS);

      expect(service.get).toHaveBeenCalledWith(
        '/v1/wallet/reward/withdraw-estimation',
        AUTH_TOKENS,
      );
      expect(result).toStrictEqual(estimation);
    });
  });

  describe('withdrawCashback', () => {
    it('posts withdrawal to endpoint', async () => {
      const response = { txHash: '0xabc' };
      service.post.mockResolvedValue(response);

      const result = await provider.withdrawCashback(
        { amount: '5', walletAddress: '0xaddr' } as never,
        AUTH_TOKENS,
      );

      expect(service.post).toHaveBeenCalledWith(
        '/v1/wallet/reward/withdraw',
        { amount: '5', walletAddress: '0xaddr' },
        AUTH_TOKENS,
      );
      expect(result).toStrictEqual(response);
    });
  });

  describe('getCardHomeData — error fallback', () => {
    it('returns emptyCardHomeData when outer try/catch triggers', async () => {
      service.get.mockRejectedValue(new Error('Network failure'));

      const result = await provider.getCardHomeData('0xabc', AUTH_TOKENS);

      expect(result).toStrictEqual({
        primaryFundingAsset: null,
        fundingAssets: [],
        availableFundingAssets: [],
        card: null,
        account: null,
        alerts: [],
        actions: [],
        delegationSettings: null,
      });
    });
  });

  describe('buildAlerts — additional edge cases', () => {
    it('returns empty alerts for VERIFIED user with active card and active asset', async () => {
      service.get.mockImplementation((url: string) => {
        if (url === '/v1/delegation/chain/config')
          return Promise.resolve({ networks: [] });
        if (url === '/v1/card/status')
          return Promise.resolve({
            id: 'card-1',
            status: CardStatus.ACTIVE,
            type: 'VIRTUAL',
            panLast4: '1234',
            holderName: 'Test',
            isFreezable: true,
          });
        if (url === '/v1/user')
          return Promise.resolve({ verificationState: 'VERIFIED' });
        if (url === '/v1/wallet/external') return Promise.resolve([]);
        if (url === '/v1/wallet/external/priority') return Promise.resolve([]);
        return Promise.resolve(null);
      });

      const result = await provider.getCardHomeData('0xabc', AUTH_TOKENS);

      expect(result.alerts).toStrictEqual([]);
    });
  });

  describe('buildActions — additional edge cases', () => {
    it('returns add_funds for VERIFIED user with active card and active asset', async () => {
      service.get.mockImplementation((url: string) => {
        if (url === '/v1/delegation/chain/config')
          return Promise.resolve({
            networks: [
              {
                network: 'Linea',
                chainId: 59144,
                environment: 'production',
                tokens: {
                  USDC: {
                    address: '0xusdc',
                    symbol: 'USDC',
                    decimals: 6,
                  },
                },
              },
            ],
          });
        if (url === '/v1/card/status')
          return Promise.resolve({
            id: 'card-1',
            status: CardStatus.ACTIVE,
            type: 'VIRTUAL',
            panLast4: '1234',
            holderName: 'Test',
            isFreezable: true,
          });
        if (url === '/v1/user')
          return Promise.resolve({ verificationState: 'VERIFIED' });
        if (url === '/v1/wallet/external')
          return Promise.resolve([
            {
              address: '0xowner',
              currency: 'USDC',
              balance: '100',
              allowance: '500000',
              network: 'Linea',
            },
          ]);
        if (url === '/v1/wallet/external/priority')
          return Promise.resolve([
            {
              id: 1,
              address: '0xowner',
              currency: 'USDC',
              network: 'Linea',
              priority: 1,
            },
          ]);
        return Promise.resolve(null);
      });

      const result = await provider.getCardHomeData('0xabc', AUTH_TOKENS);

      expect(result.actions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'add_funds' }),
        ]),
      );
      expect(result.actions).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'change_asset' }),
        ]),
      );
    });
  });

  describe('mapApiError edge cases via getCardDetails', () => {
    it('maps 409 to Conflict', async () => {
      service.get.mockRejectedValue(
        new CardApiError(409, '/v1/card/status', 'Conflict'),
      );

      await expect(provider.getCardDetails(AUTH_TOKENS)).rejects.toMatchObject({
        code: CardProviderErrorCode.Conflict,
      });
    });

    it('maps 408 to Timeout', async () => {
      service.get.mockRejectedValue(
        new CardApiError(408, '/v1/card/status', 'Timeout'),
      );

      await expect(provider.getCardDetails(AUTH_TOKENS)).rejects.toMatchObject({
        code: CardProviderErrorCode.Timeout,
      });
    });

    it('maps statusCode 0 to Network', async () => {
      service.get.mockRejectedValue(new CardApiError(0, '/v1/card/status', ''));

      await expect(provider.getCardDetails(AUTH_TOKENS)).rejects.toMatchObject({
        code: CardProviderErrorCode.Network,
      });
    });

    it('maps generic Error to Unknown', async () => {
      service.get.mockRejectedValue(new Error('something broke'));

      await expect(provider.getCardDetails(AUTH_TOKENS)).rejects.toMatchObject({
        code: CardProviderErrorCode.Unknown,
      });
    });
  });
});
