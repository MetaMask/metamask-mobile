import { EthAccountType } from '@metamask/keyring-api';
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

jest.mock('../send/useAccountTokens');
jest.mock('../../utils/transaction-pay');
jest.mock('../transactions/useTransactionMetadataRequest');
jest.mock(
  '../../../../../selectors/featureFlagController/confirmations',
  () => ({
    selectMetaMaskPayTokensFlags: jest.fn(),
    getBlockedTokensForTransactionType: jest.requireActual(
      '../../../../../selectors/featureFlagController/confirmations',
    ).getBlockedTokensForTransactionType,
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
