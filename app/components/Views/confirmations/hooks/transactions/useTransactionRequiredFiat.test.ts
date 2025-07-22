import { merge } from 'lodash';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import { simpleSendTransactionControllerMock } from '../../__mocks__/controllers/transaction-controller-mock';
import { useTokenFiatRates } from '../useTokenFiatRates';
import { useTransactionRequiredFiat } from './useTransactionRequiredFiat';
import { useTransactionRequiredTokens } from './useTransactionRequiredTokens';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { useTokensWithBalance } from '../../../../UI/Bridge/hooks/useTokensWithBalance';
import { toHex } from '@metamask/controller-utils';
import { NATIVE_TOKEN_ADDRESS } from '../../constants/tokens';

jest.mock('../useTokenFiatRates');
jest.mock('./useTransactionRequiredTokens');
jest.mock('../../../../UI/Bridge/hooks/useTokensWithBalance');

const TOKEN_ADDRESS_1_MOCK = '0x123';
const TOKEN_ADDRESS_2_MOCK = '0x789';
const CHAIN_ID_MOCK = '0x1';

function runHook() {
  const state = merge(
    simpleSendTransactionControllerMock,
    transactionApprovalControllerMock,
  );

  state.engine.backgroundState = backgroundState as never;

  return renderHookWithProvider(useTransactionRequiredFiat, { state }).result
    .current;
}

describe('useTransactionRequiredFiat', () => {
  const useTokenFiatRatesMock = jest.mocked(useTokenFiatRates);
  const useTokensWithBalanceMock = jest.mocked(useTokensWithBalance);
  const useTransactionRequiredTokensMock = jest.mocked(
    useTransactionRequiredTokens,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionRequiredTokensMock.mockReturnValue([
      {
        address: TOKEN_ADDRESS_1_MOCK,
        amount: toHex(20000),
      },
      {
        address: TOKEN_ADDRESS_2_MOCK,
        amount: toHex(3000000),
      },
    ]);

    useTokensWithBalanceMock.mockReturnValue([
      {
        address: TOKEN_ADDRESS_1_MOCK,
        chainId: CHAIN_ID_MOCK,
        decimals: 4,
        symbol: 'T1',
      },
      {
        address: TOKEN_ADDRESS_2_MOCK,
        chainId: CHAIN_ID_MOCK,
        decimals: 6,
        symbol: 'T2',
      },
    ]);

    useTokenFiatRatesMock.mockReturnValue([4, 5]);
  });

  it('returns fiat values for each required token', () => {
    const { fiatValues } = runHook();
    expect(fiatValues).toEqual([8.2, 15.375]);
  });

  it('uses 18 decimals if token not found', () => {
    useTransactionRequiredTokensMock.mockReturnValue([
      {
        address: NATIVE_TOKEN_ADDRESS,
        amount: toHex(5000000000000000000),
      },
    ]);

    const { fiatValues } = runHook();

    expect(fiatValues).toEqual([20.5]);
  });

  it('returns undefined if no fiat rate', () => {
    useTokenFiatRatesMock.mockReturnValue([4]);

    const { fiatValues } = runHook();

    expect(fiatValues).toEqual([8.2, undefined]);
  });

  it('returns total fiat value', () => {
    const { fiatTotal } = runHook();

    expect(fiatTotal).toBe(23.575);
  });
});
