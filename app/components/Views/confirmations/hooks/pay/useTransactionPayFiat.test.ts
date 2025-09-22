import { merge } from 'lodash';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { simpleSendTransactionControllerMock } from '../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../__mocks__/controllers/approval-controller-mock';
import { useTransactionPayFiat } from './useTransactionPayFiat';
import { otherControllersMock } from '../../__mocks__/controllers/other-controllers-mock';
import { CurrencyRateState } from '@metamask/assets-controllers';
import {
  TransactionControllerState,
  TransactionType,
} from '@metamask/transaction-controller';

function runHook({ type }: { type?: TransactionType } = {}) {
  const state = merge(
    {},
    simpleSendTransactionControllerMock,
    transactionApprovalControllerMock,
    otherControllersMock,
  );

  (state.engine.backgroundState.CurrencyRateController as CurrencyRateState) = {
    currentCurrency: 'gbp',
    currencyRates: {
      ETH: {
        conversionDate: 1732887955.694,
        conversionRate: 2,
        usdConversionRate: 4,
      },
    },
  };

  if (type) {
    (
      state.engine.backgroundState
        .TransactionController as TransactionControllerState
    ).transactions[0].type = type;
  }

  return renderHookWithProvider(useTransactionPayFiat, {
    state,
  });
}

describe('useTransactionPayFiat', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('formatFiat', () => {
    it('returns formatted fiat value', () => {
      const { result } = runHook();

      expect(result.current.formatFiat(1.23)).toBe('£1.23');
    });

    it('returns formatted fiat value after multiplier if perps deposit', () => {
      const { result } = runHook({ type: TransactionType.perpsDeposit });

      expect(result.current.formatFiat(1.23)).toBe('$2.46');
    });
  });

  describe('convertFiat', () => {
    it('returns same value', () => {
      const { result } = runHook();

      expect(result.current.convertFiat(1.23)).toBe(1.23);
    });

    it('returns multiplied value if perps deposit', () => {
      const { result } = runHook({ type: TransactionType.perpsDeposit });

      expect(result.current.convertFiat(1.23)).toBe(2.46);
    });
  });
});
