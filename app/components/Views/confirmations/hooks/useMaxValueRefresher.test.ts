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
import { useMaxValueMode } from './useMaxValueMode';
import { updateEditableParams } from '../../../../util/transaction-controller';
import { TransactionType } from '@metamask/transaction-controller';

jest.mock('../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn().mockReturnValue({
    params: {
      maxValueMode: false,
    },
  }),
}));

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
jest.mock('./useMaxValueMode');

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

describe('useMaxValueRefresher', () => {
  const mockUseFeeCalculations = jest.mocked(useFeeCalculations);
  const mockUpdateEditableParams = jest.mocked(updateEditableParams);
  const mockUseSelector = jest.mocked(useSelector);
  const mockUseMaxValueMode = jest.mocked(useMaxValueMode);

  const transactionId =
    transferConfirmationState.engine.backgroundState.TransactionController
      .transactions[0].id;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFeeCalculations.mockReturnValue({
      maxFeeNativeHex: '0x5',
    } as unknown as ReturnType<typeof useFeeCalculations>);

    mockUseSelector.mockImplementation(
      (fn: (state: DeepPartial<RootState>) => unknown) =>
        fn(transferConfirmationState),
    );
  });

  it('updates transaction value when calculated value is not equal to the current value', () => {
    mockUseMaxValueMode.mockReturnValue({
      maxValueMode: true,
    });

    renderHookWithProvider(() => useMaxValueRefresher(), {
      state: transferConfirmationState,
    });

    expect(mockUpdateEditableParams).toHaveBeenCalledWith(transactionId, {
      value: '0xb', // 16 - 11 = 5
    });
  });

  describe('does not update transaction value', () => {
    it('max mode is off', () => {
      mockUseMaxValueMode.mockReturnValue({
        maxValueMode: false,
      });

      mockUseSelector.mockImplementationOnce(
        (fn: (state: DeepPartial<RootState>) => unknown) =>
          fn(transferConfirmationState),
      );

      renderHookWithProvider(() => useMaxValueRefresher(), {
        state: transferConfirmationState,
      });

      expect(mockUpdateEditableParams).not.toHaveBeenCalled();
    });

    it('transaction type is not a simple send', () => {
      mockUseMaxValueMode.mockReturnValue({
        maxValueMode: true,
      });

      const transferConfirmationStateWithoutSimpleSend = merge(
        {},
        transferConfirmationState,
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
