import { EthAccountType, SolScope } from '@metamask/keyring-api';
import {
  TransactionType,
  type MetamaskPaySource,
} from '@metamask/transaction-controller';
import { useAccountTokens } from '../send/useAccountTokens';
import {
  filterSolanaPayTokens,
  useTransactionPayAvailableTokens,
} from './useTransactionPayAvailableTokens';
import { NATIVE_TOKEN_ADDRESS } from '../../constants/tokens';
import { AssetType, TokenStandard } from '../../types/token';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { getAvailableTokens } from '../../utils/transaction-pay';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import {
  selectMetaMaskPayTokensFlags,
  MetaMaskPayTokensFlags,
  selectSolanaPayEnabled,
} from '../../../../../selectors/featureFlagController/confirmations';

jest.mock('../send/useAccountTokens');
jest.mock('../../utils/transaction-pay', () => ({
  ...jest.requireActual('../../utils/transaction-pay'),
  getAvailableTokens: jest.fn(),
}));
jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock(
  '../../../../../selectors/featureFlagController/confirmations',
  () => ({
    selectMetaMaskPayTokensFlags: jest.fn(),
    selectSolanaPayEnabled: jest.fn(),
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

describe('useTransactionPayAvailableTokens', () => {
  const useAccountTokensMock = jest.mocked(useAccountTokens);
  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );

  const selectMetaMaskPayTokensFlagsMock = jest.mocked(
    selectMetaMaskPayTokensFlags,
  );
  const selectSolanaPayEnabledMock = jest.mocked(selectSolanaPayEnabled);

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
    selectSolanaPayEnabledMock.mockReturnValue(false);
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
});

describe('filterSolanaPayTokens', () => {
  const solanaToken = {
    ...TOKEN_MOCK,
    accountId: 'solana-account-id',
    address: `${SolScope.Mainnet}/token:USDCMint`,
    assetId: `${SolScope.Mainnet}/token:USDCMint`,
    chainId: SolScope.Mainnet,
  } as AssetType;
  const solanaSource = {
    sourceAccountId: `${SolScope.Mainnet}:account`,
    sourceAssetId: solanaToken.assetId,
  } as MetamaskPaySource;

  it('removes a new Solana source when rollout is disabled', () => {
    const tokens = [TOKEN_MOCK, solanaToken];

    const result = filterSolanaPayTokens(tokens, false, undefined);

    expect(result).toEqual([TOKEN_MOCK]);
  });

  it('includes Solana sources when rollout is enabled', () => {
    const tokens = [TOKEN_MOCK, solanaToken];

    const result = filterSolanaPayTokens(tokens, true, undefined);

    expect(result).toEqual(tokens);
  });

  it('retains the admitted Solana source after rollout is disabled', () => {
    const tokens = [TOKEN_MOCK, solanaToken];

    const result = filterSolanaPayTokens(tokens, false, solanaSource);

    expect(result).toEqual(tokens);
  });

  it('removes other Solana sources after rollout is disabled', () => {
    const otherSolanaToken = {
      ...solanaToken,
      assetId: `${SolScope.Mainnet}/slip44:501`,
      address: `${SolScope.Mainnet}/slip44:501`,
    } as AssetType;

    const result = filterSolanaPayTokens(
      [solanaToken, otherSolanaToken],
      false,
      solanaSource,
    );

    expect(result).toEqual([solanaToken]);
  });
});
