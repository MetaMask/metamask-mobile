import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useTokensWithBalance } from '../../../../UI/Bridge/hooks/useTokensWithBalance';
import { useTokenFiatRates } from '../useTokenFiatRates';
import { usePayAsset } from './usePayAsset';
import { useTransactionPayTokenAmounts } from './useTransactionPayTokenAmounts';
import { useTransactionRequiredFiat } from './useTransactionRequiredFiat';

jest.mock('./useTransactionRequiredFiat');
jest.mock('../useTokenFiatRates');
jest.mock('../../../../UI/Bridge/hooks/useTokensWithBalance');
jest.mock('./usePayAsset');

const TOKEN_ADDRESS_MOCK = '0x123';
const CHAIN_ID_MOCK = '0x1';

function runHook() {
  return renderHookWithProvider(useTransactionPayTokenAmounts).result.current;
}

describe('useTransactionPayTokenAmounts', () => {
  const useTokenFiatRatesMock = jest.mocked(useTokenFiatRates);
  const useTokensWithBalanceMock = jest.mocked(useTokensWithBalance);
  const useTransactionRequiredFiatMock = jest.mocked(
    useTransactionRequiredFiat,
  );
  const usePayAssetMock = jest.mocked(usePayAsset);

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionRequiredFiatMock.mockReturnValue({
      fiatValues: [16.123, 40.456],
      fiatTotal: 56.579,
    });

    useTokensWithBalanceMock.mockReturnValue([
      {
        address: TOKEN_ADDRESS_MOCK,
        chainId: CHAIN_ID_MOCK,
        decimals: 4,
        symbol: 'T1',
      },
    ]);

    useTokenFiatRatesMock.mockReturnValue([4]);

    usePayAssetMock.mockReturnValue({
      payAsset: {
        address: TOKEN_ADDRESS_MOCK,
        chainId: CHAIN_ID_MOCK,
      },
      setPayAsset: jest.fn(),
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

  it('uses 18 decimals if token not found', () => {
    useTokensWithBalanceMock.mockReturnValue([]);

    const sourceAmounts = runHook();

    expect(sourceAmounts).toEqual([
      '4030750000000000000',
      '10114000000000000000',
    ]);
  });
});
