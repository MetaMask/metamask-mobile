import { CHAIN_IDS } from '@metamask/transaction-controller';
import React from 'react';
import { render } from '@testing-library/react-native';
import { strings } from '../../../../../../../locales/i18n';
import { POLYGON_PUSD, PREDICT_CURRENCY } from '../../../constants/predict';
import { useAddToken } from '../../../hooks/tokens/useAddToken';
import useNavbar from '../../../hooks/ui/useNavbar';
import { useDefaultPaySelectedSection } from '../../../hooks/pay/useDefaultPaySelectedSection';
import { useParams } from '../../../../../../util/navigation/navUtils';
import { PayWithOption } from '../../confirm/confirm-component';
import { CustomAmountInfo } from '../custom-amount-info';
import { PredictDepositInfo } from './predict-deposit-info';

jest.mock('../../../hooks/ui/useNavbar');
jest.mock('../../../hooks/tokens/useAddToken');
jest.mock('../../../hooks/pay/useDefaultPaySelectedSection');
jest.mock('../../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../../util/navigation/navUtils'),
  useParams: jest.fn(),
}));
jest.mock('../custom-amount-info', () => ({
  CustomAmountInfo: jest.fn(() => null),
}));

describe('PredictDepositInfo', () => {
  const mockUseNavbar = jest.mocked(useNavbar);
  const mockUseAddToken = jest.mocked(useAddToken);
  const mockUseParams = jest.mocked(useParams);
  const mockCustomAmountInfo = jest.mocked(CustomAmountInfo);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({});
  });

  it('sets navbar title to default predict deposit title', () => {
    render(<PredictDepositInfo />);

    expect(mockUseNavbar).toHaveBeenCalledWith(
      strings('confirm.title.predict_deposit'),
    );
  });

  it('sets navbar title to "Send to Predictions" when payWithOption is MoneyAccount', () => {
    mockUseParams.mockReturnValue({
      payWithOption: PayWithOption.MoneyAccount,
    });

    render(<PredictDepositInfo />);

    expect(mockUseNavbar).toHaveBeenCalledWith(
      strings('predict.send_to_predictions'),
    );
  });

  it('registers Polygon pUSD token', () => {
    render(<PredictDepositInfo />);

    expect(mockUseAddToken).toHaveBeenCalledWith({
      chainId: CHAIN_IDS.POLYGON,
      decimals: POLYGON_PUSD.decimals,
      name: POLYGON_PUSD.name,
      symbol: POLYGON_PUSD.symbol,
      tokenAddress: POLYGON_PUSD.address,
    });
  });

  it('renders CustomAmountInfo with predict currency', () => {
    render(<PredictDepositInfo />);

    expect(mockCustomAmountInfo).toHaveBeenCalledWith(
      expect.objectContaining({ currency: PREDICT_CURRENCY }),
      undefined,
    );
  });

  it('calls useDefaultPaySelectedSection', () => {
    render(<PredictDepositInfo />);

    expect(useDefaultPaySelectedSection).toHaveBeenCalled();
  });
});
