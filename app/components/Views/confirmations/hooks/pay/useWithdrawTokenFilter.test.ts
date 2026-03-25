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
import { getNativeTokenAddress } from '@metamask/assets-controllers';
import { useSendTokens } from '../send/useSendTokens';
import { useERC20Tokens } from '../../../../hooks/DisplayName/useERC20Tokens';

jest.mock('../send/useSendTokens');
jest.mock('../../../../hooks/DisplayName/useERC20Tokens');

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
const mockUseERC20Tokens = jest.mocked(useERC20Tokens);

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
    jest.clearAllMocks();
    mockUseSendTokens.mockReturnValue(ALL_TOKENS_MOCK);
    mockUseERC20Tokens.mockReturnValue([]);
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

  it('returns walletTokens from useSendTokens for withdraw with allowlist', () => {
    const { result } = runHook({
      type: TransactionType.predictWithdraw,
      postQuoteFlags: {
        default: {
          enabled: true,
          tokens: { '0x1': ['0xaaa'] },
        },
      },
    });

    const returned = result.current([]);

    expect(returned).toEqual(ALL_TOKENS_MOCK);
  });

  it('calls useSendTokens without enrichment for non-withdraw transactions', () => {
    runHook({ type: TransactionType.simpleSend });

    expect(mockUseSendTokens).toHaveBeenCalledWith({
      includeNoBalance: false,
      tokenFilter: undefined,
    });
  });

  it('calls useSendTokens without enrichment when withdraw allowlist is missing', () => {
    runHook({
      type: TransactionType.predictWithdraw,
      postQuoteFlags: {
        default: { enabled: true },
      },
    });

    expect(mockUseSendTokens).toHaveBeenCalledWith({
      includeNoBalance: false,
      tokenFilter: undefined,
    });
  });

  it('calls useSendTokens with includeNoBalance and tokenFilter when withdraw allowlist is present', () => {
    runHook({
      type: TransactionType.predictWithdraw,
      postQuoteFlags: {
        default: { enabled: true, tokens: { '0x1': ['0xaaa'] } },
      },
    });

    expect(mockUseSendTokens).toHaveBeenCalledWith({
      includeNoBalance: true,
      tokenFilter: expect.any(Function),
    });
  });

  it('passes a tokenFilter that matches allowlisted chainId and address', () => {
    runHook({
      type: TransactionType.predictWithdraw,
      postQuoteFlags: {
        default: { enabled: true, tokens: { '0x1': ['0xaaa', '0xbbb'] } },
      },
    });

    const args = mockUseSendTokens.mock.calls[0]?.[0] ?? {};
    const filter = args.tokenFilter;

    expect(filter).toBeDefined();
    expect(filter?.('0x1', '0xaaa')).toBe(true);
    expect(filter?.('0x1', '0xbbb')).toBe(true);
    expect(filter?.('0x1', '0xccc')).toBe(false);
    expect(filter?.('0x89', '0xaaa')).toBe(false);
  });

  it('passes a tokenFilter that matches case-insensitively', () => {
    runHook({
      type: TransactionType.predictWithdraw,
      postQuoteFlags: {
        default: { enabled: true, tokens: { '0x1': ['0xAAA'] } },
      },
    });

    const args = mockUseSendTokens.mock.calls[0]?.[0] ?? {};
    const filter = args.tokenFilter;

    expect(filter).toBeDefined();
    expect(filter?.('0x1', '0xaaa')).toBe(true);
    expect(filter?.('0X1', '0xAAA')).toBe(true);
  });

  it('passes a tokenFilter that returns false for chains not in allowlist', () => {
    runHook({
      type: TransactionType.predictWithdraw,
      postQuoteFlags: {
        default: { enabled: true, tokens: { '0x1': ['0xaaa'] } },
      },
    });

    const args = mockUseSendTokens.mock.calls[0]?.[0] ?? {};
    const filter = args.tokenFilter;

    expect(filter).toBeDefined();
    expect(filter?.('0x999', '0xaaa')).toBe(false);
  });

  it('passes a tokenFilter that matches native tokens via zero address in allowlist', () => {
    runHook({
      type: TransactionType.predictWithdraw,
      postQuoteFlags: {
        default: {
          enabled: true,
          tokens: {
            '0x89': ['0x0000000000000000000000000000000000000000'],
          },
        },
      },
    });

    const args = mockUseSendTokens.mock.calls[0]?.[0] ?? {};
    const filter = args.tokenFilter;
    const nativeAddress = getNativeTokenAddress('0x89');

    expect(filter).toBeDefined();
    expect(filter?.('0x89', nativeAddress)).toBe(true);
    expect(filter?.('0x89', '0xrandom')).toBe(false);
  });

  it('creates zero-balance entry from API data for allowlisted tokens not in wallet', () => {
    mockUseSendTokens.mockReturnValue([ALL_TOKENS_MOCK[0]]);
    mockUseERC20Tokens.mockReturnValue([
      { name: 'Token A', symbol: 'TKNA', image: 'icon-a.png', decimals: 18 },
      {
        name: 'New API Token',
        symbol: 'NAT',
        image: 'icon-nat.png',
        decimals: 8,
      },
    ]);

    const { result } = runHook({
      type: TransactionType.predictWithdraw,
      postQuoteFlags: {
        default: {
          enabled: true,
          tokens: { '0x1': ['0xaaa', '0xnewtoken'] },
        },
      },
    });

    const filtered = result.current([]);

    expect(filtered).toHaveLength(2);
    expect(filtered[0].address).toBe('0xaaa');
    expect(filtered[0].balance).toBe('1.0');

    expect(filtered[1].address).toBe('0xnewtoken');
    expect(filtered[1].symbol).toBe('NAT');
    expect(filtered[1].balance).toBe('0');
    expect(filtered[1].decimals).toBe(8);
    expect(filtered[1].image).toBe('icon-nat.png');
  });

  it('skips API entries with no name and no symbol', () => {
    mockUseSendTokens.mockReturnValue([]);
    mockUseERC20Tokens.mockReturnValue([
      {
        name: undefined,
        symbol: undefined,
        image: undefined,
        decimals: undefined,
      } as unknown as ReturnType<typeof useERC20Tokens>[number],
    ]);

    const { result } = runHook({
      type: TransactionType.predictWithdraw,
      postQuoteFlags: {
        default: {
          enabled: true,
          tokens: { '0x1': ['0xunknown'] },
        },
      },
    });

    const filtered = result.current([]);
    expect(filtered).toHaveLength(0);
  });

  it('does not pass native addresses to useERC20Tokens requests', () => {
    runHook({
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

    const requests = mockUseERC20Tokens.mock.calls[0][0];
    expect(requests).toHaveLength(1);
    expect(requests[0].value).toBe('0xaaa');
  });
});
