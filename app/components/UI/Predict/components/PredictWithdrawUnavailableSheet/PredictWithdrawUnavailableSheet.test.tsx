import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import PredictWithdrawUnavailableSheet from './PredictWithdrawUnavailableSheet';
import { PREDICT_BALANCE_TEST_IDS } from '../PredictBalance/PredictBalance.testIds';

let mockIsVisible = true;
const mockCloseSheet = jest.fn();
const mockGetRefHandlers = jest.fn(() => ({
  onOpenBottomSheet: jest.fn(),
  onCloseBottomSheet: jest.fn(),
}));

jest.mock('../../hooks/usePredictBottomSheet', () => ({
  usePredictBottomSheet: () => ({
    sheetRef: { current: null },
    isVisible: mockIsVisible,
    closeSheet: mockCloseSheet,
    handleSheetClosed: jest.fn(),
    getRefHandlers: mockGetRefHandlers,
  }),
}));

describe('PredictWithdrawUnavailableSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsVisible = true;
  });

  it('renders null when closed', () => {
    mockIsVisible = false;

    const { queryByTestId } = render(<PredictWithdrawUnavailableSheet />);

    expect(
      queryByTestId(PREDICT_BALANCE_TEST_IDS.WITHDRAW_UNAVAILABLE_SHEET),
    ).toBeNull();
  });

  it('renders the temporary Deposit Wallet withdraw unavailable note', () => {
    const { getByTestId } = render(<PredictWithdrawUnavailableSheet />);

    expect(
      getByTestId(PREDICT_BALANCE_TEST_IDS.WITHDRAW_UNAVAILABLE_SHEET),
    ).toBeOnTheScreen();
    expect(
      getByTestId(PREDICT_BALANCE_TEST_IDS.WITHDRAW_UNAVAILABLE_TITLE),
    ).toHaveTextContent(strings('predict.withdraw.unavailable_title'));
    expect(
      getByTestId(PREDICT_BALANCE_TEST_IDS.WITHDRAW_UNAVAILABLE_DESCRIPTION),
    ).toHaveTextContent(strings('predict.withdraw.unavailable_description'));
    expect(
      getByTestId(PREDICT_BALANCE_TEST_IDS.WITHDRAW_UNAVAILABLE_GOT_IT_BUTTON),
    ).toHaveTextContent(strings('predict.withdraw.unavailable_got_it'));
  });

  it('dismisses when Got it is pressed', () => {
    const { getByTestId } = render(<PredictWithdrawUnavailableSheet />);

    fireEvent.press(
      getByTestId(PREDICT_BALANCE_TEST_IDS.WITHDRAW_UNAVAILABLE_GOT_IT_BUTTON),
    );

    expect(mockCloseSheet).toHaveBeenCalledTimes(1);
  });

  it('dismisses when close is pressed', () => {
    const { getByTestId } = render(<PredictWithdrawUnavailableSheet />);

    fireEvent.press(
      getByTestId(PREDICT_BALANCE_TEST_IDS.WITHDRAW_UNAVAILABLE_CLOSE_BUTTON),
    );

    expect(mockCloseSheet).toHaveBeenCalledTimes(1);
  });
});
