import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { SolScope, TrxScope } from '@metamask/keyring-api';
import type { BridgeToken } from '../../../../../../UI/Bridge/types';
import type { RootState } from '../../../../../../../reducers';
import { selectSelectedInternalAccountByScope } from '../../../../../../../selectors/multichainAccounts/accounts';
import { usePositionTokenBalance } from './usePositionTokenBalance';
import type { QuickBuyTarget } from '../types';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../../../../selectors/multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope: jest.fn(),
}));

jest.mock('../../../../../../../selectors/accountTrackerController', () => ({
  selectAccountsByChainId: jest.fn(() => ({})),
}));

jest.mock('../../../../../../../selectors/tokenBalancesController', () => ({
  selectTokensBalances: jest.fn(() => ({})),
}));

jest.mock('../../../../../../../selectors/tokenRatesController', () => ({
  selectTokenMarketData: jest.fn(() => ({})),
}));

jest.mock('../../../../../../../selectors/currencyRateController', () => ({
  selectCurrencyRates: jest.fn(() => ({})),
  selectCurrentCurrency: jest.fn(() => 'usd'),
}));

jest.mock('../../../../../../../selectors/multichain/multichain', () => ({
  selectMultichainBalances: jest.fn(() => ({
    'tron-account-id': {
      'tron:728126428/trc20:HTXTokenAddress': { amount: '42' },
    },
    'solana-account-id': {
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501': {
        amount: '12.5',
      },
    },
  })),
  selectMultichainAssetsRates: jest.fn(() => ({
    'tron:728126428/trc20:HTXTokenAddress': { rate: '0.000001' },
    'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501': {
      rate: '200',
    },
  })),
}));

const mockUseSelector = useSelector as unknown as jest.Mock;
const mockSelectSelectedInternalAccountByScope =
  selectSelectedInternalAccountByScope as unknown as jest.Mock;

const MOCK_STATE = {
  engine: {
    backgroundState: {
      NetworkController: { networkConfigurationsByChainId: {} },
    },
  },
} as unknown as RootState;

const htxTarget: QuickBuyTarget = {
  chain: TrxScope.Mainnet,
  tokenAddress: 'tron:728126428/trc20:HTXTokenAddress',
  tokenSymbol: 'HTX',
  tokenName: 'HTX',
};

const htxDestToken = {
  address: 'tron:728126428/trc20:HTXTokenAddress',
  chainId: TrxScope.Mainnet,
  symbol: 'HTX',
  name: 'HTX',
  decimals: 6,
} as BridgeToken;

const solTarget: QuickBuyTarget = {
  chain: SolScope.Mainnet,
  tokenAddress: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
  tokenSymbol: 'SOL',
  tokenName: 'Solana',
};

const solDestToken = {
  address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
  chainId: SolScope.Mainnet,
  symbol: 'SOL',
  name: 'Solana',
  decimals: 9,
} as BridgeToken;

const mockSelectorsWithNonEvmBalances = (): void => {
  jest.clearAllMocks();
  mockUseSelector.mockImplementation(
    (selector: (state: RootState) => unknown) => selector(MOCK_STATE),
  );
  mockSelectSelectedInternalAccountByScope.mockReturnValue((scope: string) => {
    if (scope === TrxScope.Mainnet) return { id: 'tron-account-id' };
    if (scope === SolScope.Mainnet) return { id: 'solana-account-id' };
    return undefined;
  });
};

describe('usePositionTokenBalance', () => {
  it('returns a held Tron token balance from multichain balance data', () => {
    mockSelectorsWithNonEvmBalances();

    const { result } = renderHook(() =>
      usePositionTokenBalance(htxTarget, htxDestToken),
    );

    expect(result.current).toEqual(
      expect.objectContaining({
        address: 'tron:728126428/trc20:HTXTokenAddress',
        chainId: TrxScope.Mainnet,
        symbol: 'HTX',
        balance: '42',
        balanceFiat: '$0.00',
        tokenFiatAmount: 0.000042,
        currencyExchangeRate: 0.000001,
      }),
    );
  });

  it('returns a held Solana token balance from multichain balance data', () => {
    mockSelectorsWithNonEvmBalances();

    const { result } = renderHook(() =>
      usePositionTokenBalance(solTarget, solDestToken),
    );

    expect(result.current).toEqual(
      expect.objectContaining({
        address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
        chainId: SolScope.Mainnet,
        symbol: 'SOL',
        balance: '12.5',
        balanceFiat: '$2500.00',
        tokenFiatAmount: 2500,
        currencyExchangeRate: 200,
      }),
    );
  });
});
