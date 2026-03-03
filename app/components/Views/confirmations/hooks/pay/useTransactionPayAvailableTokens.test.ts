import { EthAccountType } from '@metamask/keyring-api';
import { TransactionType } from '@metamask/transaction-controller';
import { useAccountTokens } from '../send/useAccountTokens';
import { useTransactionPayAvailableTokens } from './useTransactionPayAvailableTokens';
import { NATIVE_TOKEN_ADDRESS } from '../../constants/tokens';
import { AssetType, TokenStandard } from '../../types/token';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { getAvailableTokens } from '../../utils/transaction-pay';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';

jest.mock('../send/useAccountTokens');
jest.mock('../../utils/transaction-pay');
jest.mock('../transactions/useTransactionMetadataRequest');

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

  beforeEach(() => {
    jest.resetAllMocks();

    useAccountTokensMock.mockReturnValue([]);
    useTransactionMetadataRequestMock.mockReturnValue(undefined);
    jest.mocked(getAvailableTokens).mockReturnValue([TOKEN_MOCK]);
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
});
