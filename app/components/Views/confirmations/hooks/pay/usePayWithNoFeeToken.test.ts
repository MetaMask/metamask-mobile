import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { usePayWithNoFeeToken } from './usePayWithNoFeeToken';
import { selectRelayFixedSpread } from '../../../../../selectors/featureFlagController/confirmations';
import { useTransactionPayAvailableTokens } from './useTransactionPayAvailableTokens';
import { useTransactionPayRequiredTokens } from './useTransactionPayData';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { AssetType } from '../../types/token';
import { Hex } from '@metamask/utils';
import { RelayFixedSpreadConfig } from '../../utils/relayFixedSpread';
import { CHAIN_IDS, TransactionType } from '@metamask/transaction-controller';
import { MUSD_TOKEN_ADDRESS } from '../../../../UI/Earn/constants/musd';

jest.mock('../../../../../selectors/featureFlagController/confirmations');
jest.mock('./useTransactionPayAvailableTokens');
jest.mock('./useTransactionPayData');
jest.mock('../transactions/useTransactionMetadataRequest');

const STATE_MOCK = {
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {},
      },
    },
  },
};

const MUSD_ETH = '0xaca92e438df0b2401ff60da7e4337b687a2435da';

const route = (
  sourceChain: string,
  sourceToken: string,
  targetChain = sourceChain,
  targetToken = MUSD_ETH,
) => ({
  sourceChain: sourceChain as Hex,
  sourceToken: sourceToken.toLowerCase() as Hex,
  targetChain: targetChain as Hex,
  targetToken: targetToken.toLowerCase() as Hex,
});

const config = (
  ...routes: ReturnType<typeof route>[]
): RelayFixedSpreadConfig => ({
  routes,
});

describe('usePayWithNoFeeToken', () => {
  const selectRelayFixedSpreadMock = jest.mocked(selectRelayFixedSpread);
  const useTransactionPayAvailableTokensMock = jest.mocked(
    useTransactionPayAvailableTokens,
  );

  const createMockToken = (
    address: string,
    symbol: string,
    chainId: string,
    fiatBalance: number,
    disabled = false,
  ): AssetType =>
    ({
      address: address as Hex,
      chainId: chainId as Hex,
      symbol,
      fiat: { balance: fiatBalance },
      disabled,
      balance: `${fiatBalance}`,
      decimals: 6,
      image: '',
      isETH: false,
      logo: undefined,
      name: symbol,
    }) as AssetType;

  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );
  const useTransactionPayRequiredTokensMock = jest.mocked(
    useTransactionPayRequiredTokens,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    selectRelayFixedSpreadMock.mockReturnValue(config());
    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [],
      hasTokens: false,
    });
    useTransactionMetadataRequestMock.mockReturnValue(undefined);
    useTransactionPayRequiredTokensMock.mockReturnValue([]);
  });

  it('returns undefined noFeeToken when no tokens are available', () => {
    selectRelayFixedSpreadMock.mockReturnValue(
      config(route('0x1', '0xUSDC'), route('0x1', '0xUSDT')),
    );

    const { result } = renderHookWithProvider(() => usePayWithNoFeeToken(), {
      state: STATE_MOCK,
    });

    expect(result.current.noFeeToken).toBeUndefined();
  });

  it('returns undefined noFeeToken when no tokens match a subsidised source', () => {
    const tokens = [
      createMockToken('0x111', 'DAI', '0x1', 100),
      createMockToken('0x222', 'POL', '0x1', 200),
    ];

    selectRelayFixedSpreadMock.mockReturnValue(
      config(route('0x1', '0xaaa'), route('0x1', '0xbbb')),
    );

    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: tokens,
      hasTokens: true,
    });

    const { result } = renderHookWithProvider(() => usePayWithNoFeeToken(), {
      state: STATE_MOCK,
    });

    expect(result.current.noFeeToken).toBeUndefined();
  });

  it('returns highest balance subsidised-source token', () => {
    const tokens = [
      createMockToken('0xAAA', 'USDC', '0x1', 100),
      createMockToken('0xBBB', 'USDT', '0x1', 200),
      createMockToken('0xCCC', 'DAI', '0x1', 300),
    ];

    selectRelayFixedSpreadMock.mockReturnValue(
      config(route('0x1', '0xAAA'), route('0x1', '0xBBB')),
    );

    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: tokens,
      hasTokens: true,
    });

    const { result } = renderHookWithProvider(() => usePayWithNoFeeToken(), {
      state: STATE_MOCK,
    });

    expect(result.current.noFeeToken).toEqual({
      address: '0xBBB',
      balanceUsd: '200',
      chainId: '0x1',
      symbol: 'USDT',
    });
  });

  it('excludes the specified token from results', () => {
    const tokens = [
      createMockToken('0xAAA', 'USDC', '0x1', 100),
      createMockToken('0xBBB', 'USDT', '0x1', 200),
    ];

    selectRelayFixedSpreadMock.mockReturnValue(
      config(route('0x1', '0xAAA'), route('0x1', '0xBBB')),
    );

    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: tokens,
      hasTokens: true,
    });

    const { result } = renderHookWithProvider(
      () =>
        usePayWithNoFeeToken({
          excludeToken: { address: '0xBBB', chainId: '0x1' },
        }),
      {
        state: STATE_MOCK,
      },
    );

    expect(result.current.noFeeToken).toEqual({
      address: '0xAAA',
      balanceUsd: '100',
      chainId: '0x1',
      symbol: 'USDC',
    });
  });

  it('returns undefined when only available subsidised-source token is excluded', () => {
    const tokens = [
      createMockToken('0xAAA', 'USDC', '0x1', 100),
      createMockToken('0xBBB', 'DAI', '0x1', 200),
    ];

    selectRelayFixedSpreadMock.mockReturnValue(config(route('0x1', '0xAAA')));

    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: tokens,
      hasTokens: true,
    });

    const { result } = renderHookWithProvider(
      () =>
        usePayWithNoFeeToken({
          excludeToken: { address: '0xAAA', chainId: '0x1' },
        }),
      {
        state: STATE_MOCK,
      },
    );

    expect(result.current.noFeeToken).toBeUndefined();
  });

  it('skips disabled tokens', () => {
    const tokens = [
      createMockToken('0xAAA', 'USDC', '0x1', 100, true),
      createMockToken('0xBBB', 'USDT', '0x1', 200),
    ];

    selectRelayFixedSpreadMock.mockReturnValue(
      config(route('0x1', '0xAAA'), route('0x1', '0xBBB')),
    );

    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: tokens,
      hasTokens: true,
    });

    const { result } = renderHookWithProvider(() => usePayWithNoFeeToken(), {
      state: STATE_MOCK,
    });

    expect(result.current.noFeeToken).toEqual({
      address: '0xBBB',
      balanceUsd: '200',
      chainId: '0x1',
      symbol: 'USDT',
    });
  });

  it('isNoFeeToken returns true for matching token', () => {
    const tokens = [createMockToken('0xAAA', 'USDC', '0x1', 100)];

    selectRelayFixedSpreadMock.mockReturnValue(config(route('0x1', '0xAAA')));

    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: tokens,
      hasTokens: true,
    });

    const { result } = renderHookWithProvider(() => usePayWithNoFeeToken(), {
      state: STATE_MOCK,
    });

    expect(result.current.isNoFeeToken('0xAAA', '0x1')).toBe(true);
  });

  it('isNoFeeToken returns false for non-matching token', () => {
    const tokens = [createMockToken('0xAAA', 'USDC', '0x1', 100)];

    selectRelayFixedSpreadMock.mockReturnValue(config(route('0x1', '0xBBB')));

    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: tokens,
      hasTokens: true,
    });

    const { result } = renderHookWithProvider(() => usePayWithNoFeeToken(), {
      state: STATE_MOCK,
    });

    expect(result.current.isNoFeeToken('0xAAA', '0x1')).toBe(false);
  });

  it('treats source-only matches as subsidised regardless of target', () => {
    const tokens = [createMockToken('0xAAA', 'USDC', '0x1', 100)];

    selectRelayFixedSpreadMock.mockReturnValue(
      config(route('0x1', '0xAAA', '0xe708', MUSD_ETH)),
    );

    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: tokens,
      hasTokens: true,
    });

    const { result } = renderHookWithProvider(() => usePayWithNoFeeToken(), {
      state: STATE_MOCK,
    });

    expect(result.current.isNoFeeToken('0xAAA', '0x1')).toBe(true);
  });

  it('handles chain-specific subsidised sources', () => {
    const tokens = [
      createMockToken('0xAAA', 'USDC', '0x1', 100),
      createMockToken('0xBBB', 'USDC', '0x89', 200),
    ];

    selectRelayFixedSpreadMock.mockReturnValue(config(route('0x1', '0xAAA')));

    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: tokens,
      hasTokens: true,
    });

    const { result } = renderHookWithProvider(() => usePayWithNoFeeToken(), {
      state: STATE_MOCK,
    });

    expect(result.current.noFeeToken).toEqual({
      address: '0xAAA',
      balanceUsd: '100',
      chainId: '0x1',
      symbol: 'USDC',
    });
  });

  it('handles case-insensitive address and chainId matching', () => {
    const tokens = [createMockToken('0xABC', 'USDC', '0x1', 100)];

    selectRelayFixedSpreadMock.mockReturnValue(config(route('0x1', '0xABC')));

    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: tokens,
      hasTokens: true,
    });

    const { result } = renderHookWithProvider(() => usePayWithNoFeeToken(), {
      state: STATE_MOCK,
    });

    expect(result.current.isNoFeeToken('0xabc', '0x1')).toBe(true);
  });

  it('handles case-insensitive excludeToken matching', () => {
    const tokens = [
      createMockToken('0xABC', 'USDC', '0x1', 100),
      createMockToken('0xDEF', 'USDT', '0x1', 50),
    ];

    selectRelayFixedSpreadMock.mockReturnValue(
      config(route('0x1', '0xABC'), route('0x1', '0xDEF')),
    );

    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: tokens,
      hasTokens: true,
    });

    const { result } = renderHookWithProvider(
      () =>
        usePayWithNoFeeToken({
          excludeToken: { address: '0xabc', chainId: '0x1' },
        }),
      {
        state: STATE_MOCK,
      },
    );

    expect(result.current.noFeeToken).toEqual({
      address: '0xDEF',
      balanceUsd: '50',
      chainId: '0x1',
      symbol: 'USDT',
    });
  });

  it('returns undefined when token has no chainId', () => {
    const tokens = [
      {
        address: '0xAAA' as Hex,
        symbol: 'USDC',
        fiat: { balance: 100 },
        disabled: false,
      } as AssetType,
    ];

    selectRelayFixedSpreadMock.mockReturnValue(config(route('0x1', '0xAAA')));

    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: tokens,
      hasTokens: true,
    });

    const { result } = renderHookWithProvider(() => usePayWithNoFeeToken(), {
      state: STATE_MOCK,
    });

    expect(result.current.noFeeToken).toBeUndefined();
  });

  it('isNoFeeToken returns false when token has no chainId', () => {
    const tokens = [
      {
        address: '0xAAA' as Hex,
        symbol: 'USDC',
        fiat: { balance: 100 },
        disabled: false,
      } as AssetType,
    ];

    selectRelayFixedSpreadMock.mockReturnValue(config(route('0x1', '0xAAA')));

    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: tokens,
      hasTokens: true,
    });

    const { result } = renderHookWithProvider(() => usePayWithNoFeeToken(), {
      state: STATE_MOCK,
    });

    expect(result.current.isNoFeeToken('0xAAA', '0x1')).toBe(false);
  });

  it('handles tokens with zero fiat balance', () => {
    const tokens = [
      createMockToken('0xAAA', 'USDC', '0x1', 0),
      createMockToken('0xBBB', 'USDT', '0x1', 100),
    ];

    selectRelayFixedSpreadMock.mockReturnValue(
      config(route('0x1', '0xAAA'), route('0x1', '0xBBB')),
    );

    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: tokens,
      hasTokens: true,
    });

    const { result } = renderHookWithProvider(() => usePayWithNoFeeToken(), {
      state: STATE_MOCK,
    });

    expect(result.current.noFeeToken).toEqual({
      address: '0xBBB',
      balanceUsd: '100',
      chainId: '0x1',
      symbol: 'USDT',
    });
  });

  describe('withdraw flows (directional source → target match)', () => {
    const MONAD_USDC = '0x754704bc059f8c67012fed69bc8a327a5aafb603';
    const BSC_USDC = '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d';
    const ETH_USDC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';

    // Money account withdrawals source from mUSD on Monad. The required token
    // (allowUnderMinimum=false) is what the hook reads as the withdraw source.
    const monadMusdSource = [
      {
        address: MUSD_TOKEN_ADDRESS as Hex,
        chainId: CHAIN_IDS.MONAD as Hex,
        allowUnderMinimum: false,
      },
    ];

    it('tags a candidate reachable via the resolved source → candidate route', () => {
      useTransactionMetadataRequestMock.mockReturnValue({
        type: TransactionType.moneyAccountWithdraw,
        txParams: {},
      } as never);
      useTransactionPayRequiredTokensMock.mockReturnValue(
        monadMusdSource as never,
      );
      selectRelayFixedSpreadMock.mockReturnValue(
        config(
          route(
            CHAIN_IDS.MONAD,
            MUSD_TOKEN_ADDRESS,
            CHAIN_IDS.MONAD,
            MONAD_USDC,
          ),
        ),
      );
      useTransactionPayAvailableTokensMock.mockReturnValue({
        availableTokens: [
          createMockToken(MONAD_USDC, 'USDC', CHAIN_IDS.MONAD, 100),
        ],
        hasTokens: true,
      });

      const { result } = renderHookWithProvider(() => usePayWithNoFeeToken(), {
        state: STATE_MOCK,
      });

      expect(result.current.isNoFeeToken(MONAD_USDC, CHAIN_IDS.MONAD)).toBe(
        true,
      );
      expect(result.current.noFeeToken?.symbol).toBe('USDC');
    });

    it('does NOT tag a candidate that is only a deposit source (no source → candidate route)', () => {
      useTransactionMetadataRequestMock.mockReturnValue({
        type: TransactionType.moneyAccountWithdraw,
        txParams: {},
      } as never);
      useTransactionPayRequiredTokensMock.mockReturnValue(
        monadMusdSource as never,
      );
      // BSC USDC is a deposit source (bsc_usdc → musd) but NOT a withdraw
      // target of monad mUSD, so it must not be tagged.
      selectRelayFixedSpreadMock.mockReturnValue(
        config(
          route(CHAIN_IDS.BSC, BSC_USDC, CHAIN_IDS.MONAD, MUSD_TOKEN_ADDRESS),
        ),
      );
      useTransactionPayAvailableTokensMock.mockReturnValue({
        availableTokens: [
          createMockToken(BSC_USDC, 'USDC', CHAIN_IDS.BSC, 100),
        ],
        hasTokens: true,
      });

      const { result } = renderHookWithProvider(() => usePayWithNoFeeToken(), {
        state: STATE_MOCK,
      });

      expect(result.current.isNoFeeToken(BSC_USDC, CHAIN_IDS.BSC)).toBe(false);
      expect(result.current.noFeeToken).toBeUndefined();
    });

    it('matches exact (chainId, address) — same symbol on another chain is not tagged', () => {
      useTransactionMetadataRequestMock.mockReturnValue({
        type: TransactionType.moneyAccountWithdraw,
        txParams: {},
      } as never);
      useTransactionPayRequiredTokensMock.mockReturnValue(
        monadMusdSource as never,
      );
      selectRelayFixedSpreadMock.mockReturnValue(
        config(
          route(
            CHAIN_IDS.MONAD,
            MUSD_TOKEN_ADDRESS,
            CHAIN_IDS.MONAD,
            MONAD_USDC,
          ),
        ),
      );
      useTransactionPayAvailableTokensMock.mockReturnValue({
        availableTokens: [
          createMockToken(MONAD_USDC, 'USDC', CHAIN_IDS.MONAD, 100),
          createMockToken(ETH_USDC, 'USDC', CHAIN_IDS.MAINNET, 200),
        ],
        hasTokens: true,
      });

      const { result } = renderHookWithProvider(() => usePayWithNoFeeToken(), {
        state: STATE_MOCK,
      });

      expect(result.current.isNoFeeToken(MONAD_USDC, CHAIN_IDS.MONAD)).toBe(
        true,
      );
      expect(result.current.isNoFeeToken(ETH_USDC, CHAIN_IDS.MAINNET)).toBe(
        false,
      );
      expect(result.current.noFeeToken?.chainId).toBe(CHAIN_IDS.MONAD);
    });

    it('normalizes a non-hex candidate chainId before matching (renderNoFeeTag with decimal Monad id)', () => {
      useTransactionMetadataRequestMock.mockReturnValue({
        type: TransactionType.moneyAccountWithdraw,
        txParams: {},
      } as never);
      useTransactionPayRequiredTokensMock.mockReturnValue(
        monadMusdSource as never,
      );
      selectRelayFixedSpreadMock.mockReturnValue(
        config(
          route(
            CHAIN_IDS.MONAD,
            MUSD_TOKEN_ADDRESS,
            CHAIN_IDS.MONAD,
            MONAD_USDC,
          ),
        ),
      );

      const { result } = renderHookWithProvider(() => usePayWithNoFeeToken(), {
        state: STATE_MOCK,
      });

      // The picker may hand renderNoFeeTag a token whose chainId is the decimal
      // Monad id ('143') instead of hex ('0x8f'); safeFormatChainIdToHex must
      // normalize it so the route still matches and the tag renders.
      const tagForHex = result.current.renderNoFeeTag(
        createMockToken(MONAD_USDC, 'USDC', CHAIN_IDS.MONAD, 100),
      );
      const tagForDecimal = result.current.renderNoFeeTag(
        createMockToken(MONAD_USDC, 'USDC', '143', 100),
      );

      expect(tagForHex).not.toBeNull();
      expect(tagForDecimal).not.toBeNull();
    });

    it.each([
      ['perpsWithdraw', TransactionType.perpsWithdraw],
      ['predictWithdraw', TransactionType.predictWithdraw],
    ])(
      'does NOT tag for %s when the source is not resolvable pre-quote (empty requiredTokens)',
      (_label, type) => {
        useTransactionMetadataRequestMock.mockReturnValue({
          type,
          txParams: {},
        } as never);
        useTransactionPayRequiredTokensMock.mockReturnValue([]);
        selectRelayFixedSpreadMock.mockReturnValue(
          config(
            route(
              CHAIN_IDS.MONAD,
              MUSD_TOKEN_ADDRESS,
              CHAIN_IDS.MONAD,
              MONAD_USDC,
            ),
          ),
        );
        useTransactionPayAvailableTokensMock.mockReturnValue({
          availableTokens: [
            createMockToken(MONAD_USDC, 'USDC', CHAIN_IDS.MONAD, 100),
          ],
          hasTokens: true,
        });

        const { result } = renderHookWithProvider(
          () => usePayWithNoFeeToken(),
          { state: STATE_MOCK },
        );

        expect(result.current.isNoFeeToken(MONAD_USDC, CHAIN_IDS.MONAD)).toBe(
          false,
        );
        expect(result.current.noFeeToken).toBeUndefined();
      },
    );
  });
});
