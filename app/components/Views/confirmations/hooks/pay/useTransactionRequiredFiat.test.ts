import { merge } from 'lodash';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import { simpleSendTransactionControllerMock } from '../../__mocks__/controllers/transaction-controller-mock';
import { useTokenFiatRates } from '../tokens/useTokenFiatRates';
import { useTransactionRequiredFiat } from './useTransactionRequiredFiat';
import { useTransactionRequiredTokens } from './useTransactionRequiredTokens';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { toHex } from '@metamask/controller-utils';
import { NATIVE_TOKEN_ADDRESS } from '../../constants/tokens';
import {
  accountsControllerMock,
  tokenAddress1Mock,
  tokenAddress2Mock,
  tokensControllerMock,
} from '../../__mocks__/controllers/other-controllers-mock';

jest.mock('../tokens/useTokenFiatRates');
jest.mock('./useTransactionRequiredTokens');
jest.mock('../../../../UI/Bridge/hooks/useTokensWithBalance');

function runHook() {
  const state = merge(
    {
      engine: {
        backgroundState,
      },
    },
    simpleSendTransactionControllerMock,
    transactionApprovalControllerMock,
    tokensControllerMock,
    accountsControllerMock,
  );

  return renderHookWithProvider(useTransactionRequiredFiat, { state }).result
    .current;
}

describe('useTransactionRequiredFiat', () => {
  const useTokenFiatRatesMock = jest.mocked(useTokenFiatRates);
  const useTransactionRequiredTokensMock = jest.mocked(
    useTransactionRequiredTokens,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    useTransactionRequiredTokensMock.mockReturnValue([
      {
        address: tokenAddress1Mock,
        amount: toHex(20000),
      },
      {
        address: tokenAddress2Mock,
        amount: toHex(3000000),
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
