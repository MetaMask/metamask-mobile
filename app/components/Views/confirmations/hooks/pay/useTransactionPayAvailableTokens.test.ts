import { EthAccountType } from '@metamask/keyring-api';
import { useAccountTokens } from '../send/useAccountTokens';
import { useTransactionPayAvailableTokens } from './useTransactionPayAvailableTokens';
import { NATIVE_TOKEN_ADDRESS } from '../../constants/tokens';
import { AssetType, TokenStandard } from '../../types/token';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { getAvailableTokens } from '../../utils/transaction-pay';

jest.mock('../send/useAccountTokens');
jest.mock('../../utils/transaction-pay');

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

  beforeEach(() => {
    jest.resetAllMocks();

    useAccountTokensMock.mockReturnValue([]);
    jest.mocked(getAvailableTokens).mockReturnValue([TOKEN_MOCK]);
  });

  it('returns available tokens', () => {
    const { result } = renderHookWithProvider(useTransactionPayAvailableTokens);
    expect(result.current).toMatchObject([TOKEN_MOCK]);
  });
});
