import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { SolScope, TrxScope, BtcScope } from '@metamask/keyring-api';
import type { CaipChainId } from '@metamask/utils';
import type { BridgeToken } from '../../../../../../UI/Bridge/types';
import type { QuickBuyTarget } from '../types';
import { selectSelectedInternalAccountByScope } from '../../../../../../../selectors/multichainAccounts/accounts';
import { selectAccountsByChainId } from '../../../../../../../selectors/accountTrackerController';
import { selectTokensBalances } from '../../../../../../../selectors/tokenBalancesController';
import { selectTokenMarketData } from '../../../../../../../selectors/tokenRatesController';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../../../../selectors/currencyRateController';
import {
  selectMultichainBalances,
  selectMultichainAssetsRates,
} from '../../../../../../../selectors/multichain/multichain';
import { EVM_SCOPE } from '../../../../../../UI/Earn/constants/networks';
import { usePositionTokenBalance } from './usePositionTokenBalance';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../../../../selectors/multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope: jest.fn(),
}));

jest.mock('../../../../../../../selectors/accountTrackerController', () => ({
  selectAccountsByChainId: jest.fn(),
}));

jest.mock('../../../../../../../selectors/tokenBalancesController', () => ({
  selectTokensBalances: jest.fn(),
}));

jest.mock('../../../../../../../selectors/tokenRatesController', () => ({
  selectTokenMarketData: jest.fn(),
}));

jest.mock('../../../../../../../selectors/currencyRateController', () => ({
  selectCurrencyRates: jest.fn(),
  selectCurrentCurrency: jest.fn(),
}));

jest.mock('../../../../../../../selectors/multichain/multichain', () => ({
  selectMultichainBalances: jest.fn(),
  selectMultichainAssetsRates: jest.fn(),
}));

const mockUseSelector = useSelector as jest.Mock;
const mockAccountByScope =
  selectSelectedInternalAccountByScope as unknown as jest.Mock;

const SOL_ASSET = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501';
const SOL_SCOPE = SolScope.Mainnet;
const TRX_ASSET = 'tron:728126428/slip44:195';
const TRX_SCOPE = TrxScope.Mainnet;
const BTC_ASSET = 'bip122:000000000019d6689c085ae165831e93/slip44:0';
const BTC_SCOPE = BtcScope.Mainnet;

const solanaAccount = { id: 'solana-account-id' };
const tronAccount = { id: 'tron-account-id' };
const bitcoinAccount = { id: 'bitcoin-account-id' };

const makeState = (
  networkConfigs: Record<string, { nativeCurrency?: string }> = {},
) =>
  ({
    engine: {
      backgroundState: {
        NetworkController: { networkConfigurationsByChainId: networkConfigs },
      },
    },
  }) as never;

const token = (address: string, chainId: string, symbol: string): BridgeToken =>
  ({
    address,
    chainId: chainId as BridgeToken['chainId'],
    symbol,
    name: symbol,
    decimals: 9,
  }) as BridgeToken;

const targetOn = (chain: string, tokenAddress: string): QuickBuyTarget => ({
  tokenAddress,
  tokenSymbol: 'SYM',
  tokenName: 'Symbol',
  chain: chain as CaipChainId,
});

/**
 * Resolves `useSelector` by invoking each selector against the fake state.
 * Leaf selectors are mocked to return their configured value; the inline
 * account selectors resolve through the mocked
 * `selectSelectedInternalAccountByScope` resolver.
 */
const setup = ({
  currency = 'usd',
  accounts = {},
  multichainBalances = {},
  multichainRates = {},
  accountsByChainId = {},
  tokenBalances = {},
  tokenMarketData = {},
  currencyRates = {},
  networkConfigs = {},
}: {
  currency?: string;
  accounts?: Record<string, { id: string; address?: string } | undefined>;
  multichainBalances?: Record<
    string,
    Record<string, { amount?: string } | undefined> | undefined
  >;
  multichainRates?: Record<string, { rate?: string } | undefined>;
  accountsByChainId?: Record<string, unknown>;
  tokenBalances?: Record<string, unknown>;
  tokenMarketData?: Record<string, unknown>;
  currencyRates?: Record<string, { conversionRate?: number } | undefined>;
  networkConfigs?: Record<string, { nativeCurrency?: string }>;
}) => {
  (selectAccountsByChainId as unknown as jest.Mock).mockReturnValue(
    accountsByChainId,
  );
  (selectTokensBalances as unknown as jest.Mock).mockReturnValue(tokenBalances);
  (selectTokenMarketData as unknown as jest.Mock).mockReturnValue(
    tokenMarketData,
  );
  (selectCurrencyRates as unknown as jest.Mock).mockReturnValue(currencyRates);
  (selectCurrentCurrency as unknown as jest.Mock).mockReturnValue(currency);
  (selectMultichainBalances as unknown as jest.Mock).mockReturnValue(
    multichainBalances,
  );
  (selectMultichainAssetsRates as unknown as jest.Mock).mockReturnValue(
    multichainRates,
  );
  mockAccountByScope.mockReturnValue(
    (scope: string) => accounts[scope] ?? undefined,
  );
  mockUseSelector.mockImplementation((selector: (state: never) => unknown) =>
    selector(makeState(networkConfigs)),
  );
};

describe('usePositionTokenBalance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns undefined when there is no target or dest token', () => {
    setup({});
    const { result } = renderHook(() =>
      usePositionTokenBalance(null, undefined),
    );
    expect(result.current).toBeUndefined();
  });

  describe('Solana', () => {
    it('prices the held balance and formats fiat in the user display currency', () => {
      setup({
        currency: 'usd',
        accounts: { [SOL_SCOPE]: solanaAccount },
        multichainBalances: {
          [solanaAccount.id]: { [SOL_ASSET]: { amount: '12.5' } },
        },
        multichainRates: { [SOL_ASSET]: { rate: '200' } },
      });

      const { result } = renderHook(() =>
        usePositionTokenBalance(
          targetOn(SOL_SCOPE, SOL_ASSET),
          token(SOL_ASSET, SOL_SCOPE, 'SOL'),
        ),
      );

      expect(result.current).toMatchObject({
        balance: '12.5',
        balanceFiat: '$2,500.00',
        tokenFiatAmount: 2500,
        currencyExchangeRate: 200,
      });
    });

    it('returns undefined when the user holds no balance (strict)', () => {
      setup({
        accounts: { [SOL_SCOPE]: solanaAccount },
        multichainBalances: {},
        multichainRates: { [SOL_ASSET]: { rate: '200' } },
      });

      const { result } = renderHook(() =>
        usePositionTokenBalance(
          targetOn(SOL_SCOPE, SOL_ASSET),
          token(SOL_ASSET, SOL_SCOPE, 'SOL'),
        ),
      );

      expect(result.current).toBeUndefined();
    });

    it('keeps a held-but-unpriceable Solana balance sellable with a zero fiat', () => {
      setup({
        accounts: { [SOL_SCOPE]: solanaAccount },
        multichainBalances: {
          [solanaAccount.id]: { [SOL_ASSET]: { amount: '12.5' } },
        },
        multichainRates: {},
      });

      const { result } = renderHook(() =>
        usePositionTokenBalance(
          targetOn(SOL_SCOPE, SOL_ASSET),
          token(SOL_ASSET, SOL_SCOPE, 'SOL'),
        ),
      );

      expect(result.current).toMatchObject({
        balance: '12.5',
        balanceFiat: '$0.00',
        tokenFiatAmount: 0,
        currencyExchangeRate: undefined,
      });
    });
  });

  describe('Tron', () => {
    it('prices a held TRX balance from the Tron account multichain data', () => {
      setup({
        accounts: { [TRX_SCOPE]: tronAccount },
        multichainBalances: {
          [tronAccount.id]: { [TRX_ASSET]: { amount: '100' } },
        },
        multichainRates: { [TRX_ASSET]: { rate: '0.25' } },
      });

      const { result } = renderHook(() =>
        usePositionTokenBalance(
          targetOn(TRX_SCOPE, TRX_ASSET),
          token(TRX_ASSET, TRX_SCOPE, 'TRX'),
        ),
      );

      expect(result.current).toMatchObject({
        balance: '100',
        balanceFiat: '$25.00',
        tokenFiatAmount: 25,
        currencyExchangeRate: 0.25,
      });
    });

    it('keeps a held-but-unpriceable TRX balance sellable with a zero fiat', () => {
      setup({
        accounts: { [TRX_SCOPE]: tronAccount },
        multichainBalances: {
          [tronAccount.id]: { [TRX_ASSET]: { amount: '100' } },
        },
        multichainRates: {},
      });

      const { result } = renderHook(() =>
        usePositionTokenBalance(
          targetOn(TRX_SCOPE, TRX_ASSET),
          token(TRX_ASSET, TRX_SCOPE, 'TRX'),
        ),
      );

      expect(result.current).toMatchObject({
        balance: '100',
        balanceFiat: '$0.00',
        tokenFiatAmount: 0,
        currencyExchangeRate: undefined,
      });
    });

    it('returns undefined when there is no Tron account', () => {
      setup({
        accounts: {},
        multichainBalances: {
          [tronAccount.id]: { [TRX_ASSET]: { amount: '100' } },
        },
        multichainRates: { [TRX_ASSET]: { rate: '0.25' } },
      });

      const { result } = renderHook(() =>
        usePositionTokenBalance(
          targetOn(TRX_SCOPE, TRX_ASSET),
          token(TRX_ASSET, TRX_SCOPE, 'TRX'),
        ),
      );

      expect(result.current).toBeUndefined();
    });
  });

  describe('Bitcoin', () => {
    it('prices a held BTC balance from the Bitcoin account multichain data', () => {
      setup({
        accounts: { [BTC_SCOPE]: bitcoinAccount },
        multichainBalances: {
          [bitcoinAccount.id]: { [BTC_ASSET]: { amount: '0.5' } },
        },
        multichainRates: { [BTC_ASSET]: { rate: '100000' } },
      });

      const { result } = renderHook(() =>
        usePositionTokenBalance(
          targetOn(BTC_SCOPE, BTC_ASSET),
          token(BTC_ASSET, BTC_SCOPE, 'BTC'),
        ),
      );

      expect(result.current).toMatchObject({
        balance: '0.5',
        balanceFiat: '$50,000.00',
        tokenFiatAmount: 50000,
        currencyExchangeRate: 100000,
      });
    });

    it('returns undefined for a zero BTC balance (strict)', () => {
      setup({
        accounts: { [BTC_SCOPE]: bitcoinAccount },
        multichainBalances: {
          [bitcoinAccount.id]: { [BTC_ASSET]: { amount: '0' } },
        },
        multichainRates: { [BTC_ASSET]: { rate: '100000' } },
      });

      const { result } = renderHook(() =>
        usePositionTokenBalance(
          targetOn(BTC_SCOPE, BTC_ASSET),
          token(BTC_ASSET, BTC_SCOPE, 'BTC'),
        ),
      );

      expect(result.current).toBeUndefined();
    });
  });

  it('does not break the EVM branch (still reads the EVM account)', () => {
    setup({ accounts: { [EVM_SCOPE]: { id: 'evm', address: '0xAccount' } } });

    const { result } = renderHook(() =>
      usePositionTokenBalance(
        targetOn('0x1', '0x0000000000000000000000000000000000000000'),
        token('0x0000000000000000000000000000000000000000', '0x1', 'ETH'),
      ),
    );

    // No on-chain balance configured for the EVM account -> undefined.
    expect(result.current).toBeUndefined();
  });

  it('prices a held EVM ERC-20 with a lowercase address via checksum-keyed market data', () => {
    // `tokenMarketData` is keyed by checksummed address, but position tokens can
    // arrive lowercase; without normalization the price lookup misses and the
    // token drops to the unpriced path (regression guard).
    const lowercaseUsdc = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
    const checksumUsdc = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    setup({
      accounts: { [EVM_SCOPE]: { id: 'evm', address: '0xAccount' } },
      // 1 token (1e18) held, keyed by the lowercase token address.
      tokenBalances: {
        '0xAccount': { '0x1': { [lowercaseUsdc]: '0xde0b6b3a7640000' } },
      },
      // Price is only resolvable under the checksummed key.
      tokenMarketData: { '0x1': { [checksumUsdc]: { price: 0.5 } } },
      currencyRates: { ETH: { conversionRate: 2000 } },
      networkConfigs: { '0x1': { nativeCurrency: 'ETH' } },
    });

    const evmToken = {
      address: lowercaseUsdc,
      chainId: '0x1',
      symbol: 'USDC',
      name: 'USDC',
      decimals: 18,
    } as BridgeToken;

    const { result } = renderHook(() =>
      usePositionTokenBalance(targetOn('0x1', lowercaseUsdc), evmToken),
    );

    expect(result.current).toMatchObject({
      balance: '1.0',
      balanceFiat: '$1,000.00',
      tokenFiatAmount: 1000,
      currencyExchangeRate: 1000,
    });
  });
});
