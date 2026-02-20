import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useWithdrawTokenFilter } from './useWithdrawTokenFilter';
import { cloneDeep, merge } from 'lodash';
import { simpleSendTransactionControllerMock } from '../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import { RootState } from '../../../../../reducers';
import { otherControllersMock } from '../../__mocks__/controllers/other-controllers-mock';
import { TransactionType } from '@metamask/transaction-controller';
import { AssetType, TokenStandard } from '../../types/token';
import { EthAccountType } from '@metamask/keyring-api';

const STATE_MOCK = merge(
  {},
  simpleSendTransactionControllerMock,
  transactionApprovalControllerMock,
  otherControllersMock,
) as unknown as RootState;

const TOKENS_MOCK = [
  {
    accountType: EthAccountType.Eoa,
    address: '0xaaa',
    balance: '1.0',
    balanceInSelectedCurrency: '$1.00',
    chainId: '0x1',
    decimals: 18,
    name: 'Token A',
    standard: TokenStandard.ERC20,
    symbol: 'TKNA',
  },
  {
    accountType: EthAccountType.Eoa,
    address: '0xbbb',
    balance: '2.0',
    balanceInSelectedCurrency: '$2.00',
    chainId: '0x1',
    decimals: 6,
    name: 'Token B',
    standard: TokenStandard.ERC20,
    symbol: 'TKNB',
  },
  {
    accountType: EthAccountType.Eoa,
    address: '0xccc',
    balance: '3.0',
    balanceInSelectedCurrency: '$3.00',
    chainId: '0x89',
    decimals: 6,
    name: 'Token C',
    standard: TokenStandard.ERC20,
    symbol: 'TKNC',
  },
] as AssetType[];

const TOKEN_CATALOG_MOCK = {
  '0x1': {
    timestamp: 0,
    data: {
      '0xddd': {
        name: 'Catalog Token',
        symbol: 'CTK',
        decimals: 18,
        address: '0xDDD',
        iconUrl: 'https://example.com/ctk.png',
        occurrences: 1,
        aggregators: [],
      },
    },
  },
};

const NETWORK_CONFIGS_MOCK = {
  '0x1': {
    chainId: '0x1',
    name: 'Ethereum Mainnet',
    nativeCurrency: 'ETH',
    rpcEndpoints: [],
    defaultRpcEndpointIndex: 0,
    blockExplorerUrls: [],
  },
};

function runHook({
  type,
  postQuoteFlags,
  tokensChainsCache,
  networkConfigs,
}: {
  type?: TransactionType;
  postQuoteFlags?: Record<string, unknown>;
  tokensChainsCache?: Record<string, unknown>;
  networkConfigs?: Record<string, unknown>;
} = {}) {
  const mockState = cloneDeep(STATE_MOCK);

  if (type) {
    mockState.engine.backgroundState.TransactionController.transactions[0].type =
      type;
  }

  mockState.engine.backgroundState.RemoteFeatureFlagController = {
    ...mockState.engine.backgroundState.RemoteFeatureFlagController,
    remoteFeatureFlags: {
      confirmations_pay_post_quote: postQuoteFlags ?? {
        default: { enabled: false },
      },
    },
  } as never;

  if (tokensChainsCache) {
    mockState.engine.backgroundState.TokenListController = {
      ...mockState.engine.backgroundState.TokenListController,
      tokensChainsCache,
    } as never;
  }

  if (networkConfigs) {
    mockState.engine.backgroundState.NetworkController = {
      ...mockState.engine.backgroundState.NetworkController,
      networkConfigurationsByChainId: networkConfigs,
    } as never;
  }

  return renderHookWithProvider(useWithdrawTokenFilter, {
    state: mockState,
  });
}

describe('useWithdrawTokenFilter', () => {
  it('returns tokens unchanged for non-withdraw transaction types', () => {
    const { result } = runHook({ type: TransactionType.simpleSend });
    expect(result.current(TOKENS_MOCK)).toBe(TOKENS_MOCK);
  });

  it('returns tokens unchanged when no allowlist is configured', () => {
    const { result } = runHook({
      type: TransactionType.predictWithdraw,
      postQuoteFlags: {
        default: { enabled: true },
      },
    });

    expect(result.current(TOKENS_MOCK)).toBe(TOKENS_MOCK);
  });

  it('returns held tokens that match the allowlist', () => {
    const { result } = runHook({
      type: TransactionType.predictWithdraw,
      postQuoteFlags: {
        default: {
          enabled: true,
          tokens: { '0x1': ['0xaaa'] },
        },
      },
    });

    const filtered = result.current(TOKENS_MOCK);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].address).toBe('0xaaa');
    expect(filtered[0].balance).toBe('1.0');
  });

  it('includes tokens from the catalog that the user does not hold', () => {
    const { result } = runHook({
      type: TransactionType.predictWithdraw,
      postQuoteFlags: {
        default: {
          enabled: true,
          tokens: { '0x1': ['0xaaa', '0xddd'] },
        },
      },
      tokensChainsCache: TOKEN_CATALOG_MOCK,
    });

    const filtered = result.current(TOKENS_MOCK);

    expect(filtered).toHaveLength(2);
    expect(filtered[0].address).toBe('0xaaa');
    expect(filtered[1].address).toBe('0xDDD');
    expect(filtered[1].name).toBe('Catalog Token');
    expect(filtered[1].symbol).toBe('CTK');
    expect(filtered[1].balance).toBe('0');
  });

  it('uses override allowlist when override key matches transaction type', () => {
    const { result } = runHook({
      type: TransactionType.predictWithdraw,
      postQuoteFlags: {
        default: {
          enabled: true,
          tokens: { '0x1': ['0xaaa'] },
        },
        override: {
          predictWithdraw: {
            enabled: true,
            tokens: { '0x1': ['0xbbb'] },
          },
        },
      },
    });

    const filtered = result.current(TOKENS_MOCK);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].address).toBe('0xbbb');
  });

  it('override tokens replace default tokens for same property', () => {
    const { result } = runHook({
      type: TransactionType.predictWithdraw,
      postQuoteFlags: {
        default: {
          enabled: true,
          tokens: { '0x1': ['0xaaa'], '0x89': ['0xccc'] },
        },
        override: {
          predictWithdraw: {
            enabled: true,
            tokens: { '0x89': ['0xccc'] },
          },
        },
      },
    });

    const filtered = result.current(TOKENS_MOCK);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].address).toBe('0xccc');
    expect(filtered[0].chainId).toBe('0x89');
  });

  it('falls back to default tokens when override has no tokens property', () => {
    const { result } = runHook({
      type: TransactionType.predictWithdraw,
      postQuoteFlags: {
        default: {
          enabled: true,
          tokens: { '0x1': ['0xaaa'] },
        },
        override: {
          predictWithdraw: { enabled: false },
        },
      },
    });

    const filtered = result.current(TOKENS_MOCK);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].address).toBe('0xaaa');
  });

  it('returns an empty array unchanged', () => {
    const { result } = runHook({ type: TransactionType.predictWithdraw });
    const empty: AssetType[] = [];
    expect(result.current(empty)).toBe(empty);
  });

  it('includes native token from network config when not held by user', () => {
    const { result } = runHook({
      type: TransactionType.predictWithdraw,
      postQuoteFlags: {
        default: {
          enabled: true,
          tokens: {
            '0x1': ['0x0000000000000000000000000000000000000000', '0xaaa'],
          },
        },
      },
      networkConfigs: NETWORK_CONFIGS_MOCK,
    });

    const filtered = result.current(TOKENS_MOCK);

    expect(filtered).toHaveLength(2);
    expect(filtered[0].symbol).toBe('ETH');
    expect(filtered[0].isNative).toBe(true);
    expect(filtered[0].balance).toBe('0');
    expect(filtered[1].address).toBe('0xaaa');
  });

  it('skips allowlisted tokens not in catalog and not held by user', () => {
    const { result } = runHook({
      type: TransactionType.predictWithdraw,
      postQuoteFlags: {
        default: {
          enabled: true,
          tokens: { '0x1': ['0xaaa', '0xzzz'] },
        },
      },
    });

    const filtered = result.current(TOKENS_MOCK);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].address).toBe('0xaaa');
  });
});
