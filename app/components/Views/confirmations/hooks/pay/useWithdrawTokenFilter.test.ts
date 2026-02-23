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
import { useSendTokens } from '../send/useSendTokens';

jest.mock('../send/useSendTokens');

const STATE_MOCK = merge(
  {},
  simpleSendTransactionControllerMock,
  transactionApprovalControllerMock,
  otherControllersMock,
) as unknown as RootState;

const ALL_TOKENS_MOCK = [
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
  {
    accountType: EthAccountType.Eoa,
    address: '0xDDD',
    balance: '0',
    balanceInSelectedCurrency: '$0.00',
    chainId: '0x1',
    decimals: 18,
    name: 'Catalog Token',
    standard: TokenStandard.ERC20,
    symbol: 'CTK',
  },
  {
    accountType: EthAccountType.Eoa,
    address: '0x0000000000000000000000000000000000000000',
    balance: '0',
    balanceInSelectedCurrency: '$0.00',
    chainId: '0x1',
    decimals: 18,
    name: 'Ether',
    standard: TokenStandard.ERC20,
    symbol: 'ETH',
    isNative: true,
    isETH: true,
  },
] as AssetType[];

const mockUseSendTokens = jest.mocked(useSendTokens);

function runHook({
  type,
  postQuoteFlags,
}: {
  type?: TransactionType;
  postQuoteFlags?: Record<string, unknown>;
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

  return renderHookWithProvider(useWithdrawTokenFilter, {
    state: mockState,
  });
}

describe('useWithdrawTokenFilter', () => {
  beforeEach(() => {
    mockUseSendTokens.mockReturnValue(ALL_TOKENS_MOCK);
  });

  it('returns passed-in tokens unchanged for non-withdraw transaction types', () => {
    const { result } = runHook({ type: TransactionType.simpleSend });
    const input = [ALL_TOKENS_MOCK[0]];
    expect(result.current(input)).toBe(input);
  });

  it('returns passed-in tokens unchanged when no allowlist is configured', () => {
    const { result } = runHook({
      type: TransactionType.predictWithdraw,
      postQuoteFlags: {
        default: { enabled: true },
      },
    });

    const input = [ALL_TOKENS_MOCK[0]];
    expect(result.current(input)).toBe(input);
  });

  it('filters useSendTokens result to only those matching the allowlist', () => {
    const { result } = runHook({
      type: TransactionType.predictWithdraw,
      postQuoteFlags: {
        default: {
          enabled: true,
          tokens: { '0x1': ['0xaaa'] },
        },
      },
    });

    const filtered = result.current([]);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].address).toBe('0xaaa');
    expect(filtered[0].balance).toBe('1.0');
  });

  it('includes zero-balance tokens from useSendTokens that match the allowlist', () => {
    const { result } = runHook({
      type: TransactionType.predictWithdraw,
      postQuoteFlags: {
        default: {
          enabled: true,
          tokens: { '0x1': ['0xaaa', '0xddd'] },
        },
      },
    });

    const filtered = result.current([]);

    expect(filtered).toHaveLength(2);
    expect(filtered[0].address).toBe('0xaaa');
    expect(filtered[1].address).toBe('0xDDD');
    expect(filtered[1].name).toBe('Catalog Token');
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
        overrides: {
          predictWithdraw: {
            enabled: true,
            tokens: { '0x1': ['0xbbb'] },
          },
        },
      },
    });

    const filtered = result.current([]);

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
        overrides: {
          predictWithdraw: {
            enabled: true,
            tokens: { '0x89': ['0xccc'] },
          },
        },
      },
    });

    const filtered = result.current([]);

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
        overrides: {
          predictWithdraw: { enabled: false },
        },
      },
    });

    const filtered = result.current([]);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].address).toBe('0xaaa');
  });

  it('matches native token via zero address in allowlist', () => {
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
    });

    const filtered = result.current([]);

    expect(filtered).toHaveLength(2);
    expect(filtered[0].address).toBe('0xaaa');
    expect(filtered[1].isNative).toBe(true);
    expect(filtered[1].symbol).toBe('ETH');
  });

  it('excludes tokens not in allowlist', () => {
    const { result } = runHook({
      type: TransactionType.predictWithdraw,
      postQuoteFlags: {
        default: {
          enabled: true,
          tokens: { '0x1': ['0xaaa', '0xzzz'] },
        },
      },
    });

    const filtered = result.current([]);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].address).toBe('0xaaa');
  });

  it('matches chain ID case-insensitively', () => {
    const { result } = runHook({
      type: TransactionType.predictWithdraw,
      postQuoteFlags: {
        default: {
          enabled: true,
          tokens: { '0x89': ['0xccc'] },
        },
      },
    });

    const filtered = result.current([]);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].address).toBe('0xccc');
  });

  it('calls useSendTokens with includeNoBalance true', () => {
    runHook({
      type: TransactionType.predictWithdraw,
      postQuoteFlags: {
        default: { enabled: true, tokens: { '0x1': ['0xaaa'] } },
      },
    });

    expect(mockUseSendTokens).toHaveBeenCalledWith({
      includeNoBalance: true,
    });
  });
});
