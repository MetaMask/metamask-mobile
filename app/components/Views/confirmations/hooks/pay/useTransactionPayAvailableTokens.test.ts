import {
  EthAccountType,
  SolAccountType,
  SolScope,
} from '@metamask/keyring-api';
import type { NonEvmPaymentToken } from '@metamask/transaction-pay-controller';
import { TransactionType } from '@metamask/transaction-controller';
import { useAccountTokens } from '../send/useAccountTokens';
import { useTransactionPayAvailableTokens } from './useTransactionPayAvailableTokens';
import { NATIVE_TOKEN_ADDRESS } from '../../constants/tokens';
import { AssetType, TokenStandard } from '../../types/token';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { getAvailableTokens } from '../../utils/transaction-pay';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import {
  selectMetaMaskPayTokensFlags,
  MetaMaskPayTokensFlags,
} from '../../../../../selectors/featureFlagController/confirmations';
import { useIsSolanaPaySourceEnabled } from './useIsSolanaPaySourceEnabled';
import { useTransactionPayToken } from './useTransactionPayToken';

jest.mock('../send/useAccountTokens');
jest.mock('../../utils/transaction-pay', () => ({
  ...jest.requireActual('../../utils/transaction-pay'),
  getAvailableTokens: jest.fn(),
}));
jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock('./useIsSolanaPaySourceEnabled');
jest.mock('./useTransactionPayToken');
jest.mock(
  '../../../../../selectors/featureFlagController/confirmations',
  () => ({
    selectMetaMaskPayTokensFlags: jest.fn(),
  }),
);

const TOKEN_MOCK = {
  accountType: EthAccountType.Eoa,
  address: NATIVE_TOKEN_ADDRESS,
  balance: '1.23',
  balanceInSelectedCurrency: '$1.23',
  chainId: '0x123',
  decimals: 18,
  name: 'Native Token 1',
  standard: TokenStandard.ERC20,
  symbol: 'NTV1',
} as AssetType;

const SOLANA_ASSET_ID = `${SolScope.Mainnet}/slip44:501` as const;

const SOLANA_TOKEN_MOCK = {
  accountId: 'solana-account-id',
  accountType: SolAccountType.DataAccount,
  address: SOLANA_ASSET_ID,
  assetId: SOLANA_ASSET_ID,
  balance: '2',
  chainId: SolScope.Mainnet,
  decimals: 9,
  name: 'Solana',
  standard: TokenStandard.ERC20,
  symbol: 'SOL',
} as AssetType;

const SOLANA_PAY_TOKEN_MOCK = {
  accountId: `${SolScope.Mainnet}:SoLAddress`,
  assetId: SOLANA_ASSET_ID,
  balanceFiat: '300',
  balanceHuman: '2',
  balanceRaw: '2000000000',
  balanceUsd: '300',
  chainId: SolScope.Mainnet,
  decimals: 9,
  symbol: 'SOL',
  walletAccountId: 'solana-account-id',
} as NonEvmPaymentToken;

describe('useTransactionPayAvailableTokens', () => {
  const useAccountTokensMock = jest.mocked(useAccountTokens);
  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );

  const selectMetaMaskPayTokensFlagsMock = jest.mocked(
    selectMetaMaskPayTokensFlags,
  );

  const defaultPayTokensFlags: MetaMaskPayTokensFlags = {
    preferredTokens: { default: [], overrides: {} },
    blockedTokens: {
      default: { chainIds: [], tokens: [] },
      overrides: {},
    },
    minimumRequiredTokenBalance: 0,
  };

  beforeEach(() => {
    jest.resetAllMocks();

    useAccountTokensMock.mockReturnValue([]);
    useTransactionMetadataRequestMock.mockReturnValue(undefined);
    jest.mocked(getAvailableTokens).mockReturnValue([TOKEN_MOCK]);
    selectMetaMaskPayTokensFlagsMock.mockReturnValue(defaultPayTokensFlags);
    jest.mocked(useIsSolanaPaySourceEnabled).mockReturnValue(false);
    jest.mocked(useTransactionPayToken).mockReturnValue({
      payToken: undefined,
      setPayToken: jest.fn(),
    });
  });

  it('returns available tokens and hasTokens true when tokens exist', () => {
    const { result } = renderHookWithProvider(useTransactionPayAvailableTokens);
    expect(result.current.availableTokens).toMatchObject([TOKEN_MOCK]);
    expect(result.current.hasTokens).toBe(true);
  });

  it('returns hasTokens false when no tokens exist', () => {
    jest.mocked(getAvailableTokens).mockReturnValue([]);
    const { result } = renderHookWithProvider(useTransactionPayAvailableTokens);
    expect(result.current.availableTokens).toEqual([]);
    expect(result.current.hasTokens).toBe(false);
  });

  it('returns hasTokens true for post-quote transactions even with no tokens', () => {
    jest.mocked(getAvailableTokens).mockReturnValue([]);
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.predictWithdraw,
    } as ReturnType<typeof useTransactionMetadataRequest>);

    const { result } = renderHookWithProvider(useTransactionPayAvailableTokens);
    expect(result.current.availableTokens).toEqual([]);
    expect(result.current.hasTokens).toBe(true);
  });

  it('passes resolved blocklist to getAvailableTokens', () => {
    const blockedList = {
      chainIds: ['0xa4b1'],
      tokens: [{ address: '0xabc', chainId: '0x1' }],
    };

    selectMetaMaskPayTokensFlagsMock.mockReturnValue({
      ...defaultPayTokensFlags,
      blockedTokens: {
        default: { chainIds: [], tokens: [] },
        overrides: {
          perpsDeposit: blockedList,
        },
      },
    });

    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.perpsDeposit,
    } as ReturnType<typeof useTransactionMetadataRequest>);

    renderHookWithProvider(useTransactionPayAvailableTokens);

    expect(getAvailableTokens).toHaveBeenCalledWith(
      expect.objectContaining({
        blockedTokens: blockedList,
      }),
    );
  });

  it('returns hasTokens false when all tokens are disabled', () => {
    const disabledToken = { ...TOKEN_MOCK, disabled: true };
    jest.mocked(getAvailableTokens).mockReturnValue([disabledToken]);

    const { result } = renderHookWithProvider(useTransactionPayAvailableTokens);

    expect(result.current.availableTokens).toHaveLength(1);
    expect(result.current.hasTokens).toBe(false);
  });

  it('returns hasTokens true when at least one token is not disabled', () => {
    const disabledToken = { ...TOKEN_MOCK, disabled: true };
    const enabledToken = {
      ...TOKEN_MOCK,
      address: '0xEnabled',
      disabled: false,
    };
    jest
      .mocked(getAvailableTokens)
      .mockReturnValue([disabledToken, enabledToken]);

    const { result } = renderHookWithProvider(useTransactionPayAvailableTokens);

    expect(result.current.hasTokens).toBe(true);
  });

  it('passes default blocklist when transaction type has no override', () => {
    const defaultBlocked = {
      chainIds: ['0x1'],
      tokens: [],
    };

    selectMetaMaskPayTokensFlagsMock.mockReturnValue({
      ...defaultPayTokensFlags,
      blockedTokens: {
        default: defaultBlocked,
        overrides: {},
      },
    });

    renderHookWithProvider(useTransactionPayAvailableTokens);

    expect(getAvailableTokens).toHaveBeenCalledWith(
      expect.objectContaining({
        blockedTokens: defaultBlocked,
      }),
    );
  });

  it('offers Solana sources only when Solana Pay is enabled for the transaction', () => {
    jest.mocked(useIsSolanaPaySourceEnabled).mockReturnValue(true);

    renderHookWithProvider(useTransactionPayAvailableTokens);

    expect(getAvailableTokens).toHaveBeenCalledWith(
      expect.objectContaining({ isSolanaPayEnabled: true }),
    );
  });

  it('passes the selected Solana source so it stays listed after a rollback', () => {
    jest.mocked(useTransactionPayToken).mockReturnValue({
      nonEvmPayToken: SOLANA_PAY_TOKEN_MOCK,
      payToken: undefined,
      setPayToken: jest.fn(),
    });

    renderHookWithProvider(useTransactionPayAvailableTokens);

    expect(getAvailableTokens).toHaveBeenCalledWith(
      expect.objectContaining({
        isSolanaPayEnabled: false,
        payToken: SOLANA_PAY_TOKEN_MOCK,
      }),
    );
  });

  it('does not count Solana sources towards hasTokens', () => {
    jest.mocked(getAvailableTokens).mockReturnValue([SOLANA_TOKEN_MOCK]);

    const { result } = renderHookWithProvider(useTransactionPayAvailableTokens);

    expect(result.current.availableTokens).toEqual([SOLANA_TOKEN_MOCK]);
    expect(result.current.hasTokens).toBe(false);
  });
});
