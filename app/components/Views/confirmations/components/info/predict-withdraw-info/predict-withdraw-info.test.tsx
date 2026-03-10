import React from 'react';
import { render } from '@testing-library/react-native';
import { PredictWithdrawInfo } from './predict-withdraw-info';
import { useTransactionPayWithdraw } from '../../../hooks/pay/useTransactionPayWithdraw';
import { CustomAmountInfo } from '../custom-amount-info';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: jest.fn(),
    setOptions: jest.fn(),
  }),
}));
jest.mock('../../../hooks/pay/useTransactionPayWithdraw');
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
  const CustomAmountInfoMock = jest.mocked(CustomAmountInfo);

  beforeEach(() => {
    jest.clearAllMocks();
    useTransactionPayWithdrawMock.mockReturnValue({
      isWithdraw: true,
      canSelectWithdrawToken: true,
    });
  });

  it('does not pass hasMax to CustomAmountInfo', () => {
    render(<PredictWithdrawInfo />);

    expect(CustomAmountInfoMock).toHaveBeenCalledWith(
      expect.not.objectContaining({ hasMax: true }),
      expect.anything(),
    );
  });
});
