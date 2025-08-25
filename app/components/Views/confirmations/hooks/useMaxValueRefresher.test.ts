import { merge } from 'lodash';
import { useSelector } from 'react-redux';
import {
  DeepPartial,
  renderHookWithProvider,
} from '../../../../util/test/renderWithProvider';
import { RootState } from '../../../../reducers';
import { useMaxValueRefresher } from './useMaxValueRefresher';
import { transferConfirmationState } from '../../../../util/test/confirm-data-helpers';
import { useFeeCalculations } from './gas/useFeeCalculations';
import { updateEditableParams } from '../../../../util/transaction-controller';
import { TransactionType } from '@metamask/transaction-controller';

jest.mock('../../../../util/transaction-controller', () => ({
  updateEditableParams: jest.fn(),
}));
jest.mock('./useAccountNativeBalance', () => ({
  useAccountNativeBalance: jest.fn().mockReturnValue({
    balanceWeiInHex: '0x10', // 16 wei
  }),
}));
jest.mock('./gas/useFeeCalculations', () => ({
  useFeeCalculations: jest.fn(),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

describe('useMaxValueRefresher', () => {
  const mockUseFeeCalculations = jest.mocked(useFeeCalculations);
  const mockUpdateEditableParams = jest.mocked(updateEditableParams);
  const mockUseSelector = jest.mocked(useSelector);

  const maxModeState = merge({}, transferConfirmationState, {
    transaction: {
      maxValueMode: true,
    },
  });

  const normalSendState = merge({}, transferConfirmationState, {
    transaction: {
      maxValueMode: false,
    },
  });

  const transactionId =
    transferConfirmationState.engine.backgroundState.TransactionController
      .transactions[0].id;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFeeCalculations.mockReturnValue({
      maxFeeNativeHex: '0x5',
    } as unknown as ReturnType<typeof useFeeCalculations>);

    mockUseSelector.mockImplementation(
      (fn: (state: DeepPartial<RootState>) => unknown) => fn(maxModeState),
    );
  });

  it('updates transaction value when calculated value is not equal to the current value', () => {
    renderHookWithProvider(() => useMaxValueRefresher(), {
      state: maxModeState,
    });

    expect(mockUpdateEditableParams).toHaveBeenCalledWith(transactionId, {
      value: '0xb', // 16 - 11 = 5
    });
  });

  describe('does not update transaction value', () => {
    it('max mode is off', () => {
      mockUseSelector.mockImplementationOnce(
        (fn: (state: DeepPartial<RootState>) => unknown) => fn(normalSendState),
      );

      renderHookWithProvider(() => useMaxValueRefresher(), {
        state: normalSendState,
      });

      expect(mockUpdateEditableParams).not.toHaveBeenCalled();
    });

    it('transaction type is not a simple send', () => {
      const transferConfirmationStateWithoutSimpleSend = merge(
        {},
        maxModeState,
        {
          engine: {
            backgroundState: {
              TransactionController: {
                transactions: [
                  {
                    type: TransactionType.tokenMethodTransfer,
                  },
                ],
              },
            },
          },
        },
      );

      mockUseSelector.mockImplementation(
        (fn: (state: DeepPartial<RootState>) => unknown) =>
          fn(transferConfirmationStateWithoutSimpleSend),
      );

      renderHookWithProvider(() => useMaxValueRefresher(), {
        state: transferConfirmationStateWithoutSimpleSend,
      });

      expect(mockUpdateEditableParams).not.toHaveBeenCalled();
    });
  });
});
