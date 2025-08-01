import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import {
  accountsControllerMock,
  tokenAddress1Mock,
  tokensControllerMock,
} from '../../__mocks__/controllers/other-controllers-mock';
import { useTokenFiatRates } from '../tokens/useTokenFiatRates';
import { useTransactionPayToken } from './useTransactionPayToken';
import { useTransactionPayTokenAmounts } from './useTransactionPayTokenAmounts';
import { useTransactionRequiredFiat } from './useTransactionRequiredFiat';
import { merge } from 'lodash';

jest.mock('./useTransactionRequiredFiat');
jest.mock('../tokens/useTokenFiatRates');
jest.mock('./useTransactionPayToken');

const CHAIN_ID_MOCK = '0x1';

function runHook({ noTokens }: { noTokens?: boolean } = {}) {
  const state = merge(
    noTokens ? {} : tokensControllerMock,
    accountsControllerMock,
  );

  return renderHookWithProvider(useTransactionPayTokenAmounts, { state }).result
    .current;
}

describe('useTransactionPayTokenAmounts', () => {
  const useTokenFiatRatesMock = jest.mocked(useTokenFiatRates);
  const useTransactionRequiredFiatMock = jest.mocked(
    useTransactionRequiredFiat,
  );
  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionRequiredFiatMock.mockReturnValue({
      values: [{ totalFiat: 16.123 }, { totalFiat: 40.456 }],
      totalFiat: 56.579,
    } as unknown as ReturnType<typeof useTransactionRequiredFiat>);

    useTokenFiatRatesMock.mockReturnValue([4]);

    useTransactionPayTokenMock.mockReturnValue({
      decimals: 4,
      payToken: {
        address: tokenAddress1Mock,
        chainId: CHAIN_ID_MOCK,
      },
      setPayToken: jest.fn(),
    });
  });

  it('returns source amounts', () => {
    const sourceAmounts = runHook();
    expect(sourceAmounts).toEqual(['40308', '101140']);
  });

  it('returns undefined if no fiat rate', () => {
    useTokenFiatRatesMock.mockReturnValue([]);

    const sourceAmounts = runHook();
    expect(sourceAmounts).toBeUndefined();
  });
});
