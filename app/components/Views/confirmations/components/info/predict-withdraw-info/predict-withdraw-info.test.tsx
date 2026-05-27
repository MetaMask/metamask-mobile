import React from 'react';
import { render } from '@testing-library/react-native';
import { PredictWithdrawInfo } from './predict-withdraw-info';
import { useTransactionPayWithdraw } from '../../../hooks/pay/useTransactionPayWithdraw';
import { CustomAmountInfo } from '../custom-amount-info';
import useClearConfirmationOnBackSwipe from '../../../hooks/ui/useClearConfirmationOnBackSwipe';
import useNavbar from '../../../hooks/ui/useNavbar';
import { strings } from '../../../../../../../locales/i18n';

jest.mock('../../../hooks/pay/useTransactionPayWithdraw');
jest.mock('../../../hooks/ui/useClearConfirmationOnBackSwipe');
jest.mock('../../../hooks/ui/useNavbar');
jest.mock('../../../hooks/tokens/useAddToken');
jest.mock('../custom-amount-info', () => ({
  CustomAmountInfo: jest.fn(() => null),
}));
jest.mock(
  '../../predict-confirmations/predict-withdraw-balance/predict-withdraw-balance',
  () => ({
    PredictWithdrawBalance: () => null,
  }),
);

describe('PredictWithdrawInfo', () => {
  const useTransactionPayWithdrawMock = jest.mocked(useTransactionPayWithdraw);
  const useClearConfirmationOnBackSwipeMock = jest.mocked(
    useClearConfirmationOnBackSwipe,
  );
  const useNavbarMock = jest.mocked(useNavbar);
  const CustomAmountInfoMock = jest.mocked(CustomAmountInfo);
  const rejectConfirmationMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useClearConfirmationOnBackSwipeMock.mockReturnValue(rejectConfirmationMock);
    useTransactionPayWithdrawMock.mockReturnValue({
      isWithdraw: true,
      canSelectWithdrawToken: true,
    });
  });

  it('does not pass hasMax to CustomAmountInfo', () => {
    render(<PredictWithdrawInfo />);

    expect(CustomAmountInfoMock).toHaveBeenCalledWith(
      expect.not.objectContaining({ hasMax: true }),
      undefined,
    );
  });

  it('uses the same rejection callback for the header and back-swipe removal', () => {
    render(<PredictWithdrawInfo />);

    expect(useClearConfirmationOnBackSwipeMock).toHaveBeenCalledWith({
      rejectOnTransitionEnd: true,
      skipNavigationOnTransitionEnd: true,
    });
    expect(useNavbarMock).toHaveBeenCalledWith(
      strings('confirm.title.predict_withdraw'),
      true,
      undefined,
      rejectConfirmationMock,
    );
  });

  it('disables the generic CustomAmountInfo back-swipe listener', () => {
    render(<PredictWithdrawInfo />);

    expect(CustomAmountInfoMock).toHaveBeenCalledWith(
      expect.objectContaining({
        clearConfirmationOnBackSwipe: false,
      }),
      undefined,
    );
  });
});
