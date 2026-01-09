import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { EarningPercentageRow } from './earning-percentage-row';
import { useIsTransactionPayLoading } from '../../../hooks/pay/useTransactionPayData';
import { strings } from '../../../../../../../locales/i18n';
import { MUSD_CONVERSION_APY } from '../../../../../UI/Earn/constants/musd';

jest.mock('../../../hooks/pay/useTransactionPayData');

function render() {
  return renderWithProvider(<EarningPercentageRow />);
}

describe('EarningPercentageRow', () => {
  const useIsTransactionPayLoadingMock = jest.mocked(
    useIsTransactionPayLoading,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    useIsTransactionPayLoadingMock.mockReturnValue(false);
  });

  it('renders earning label and APY when not loading', () => {
    const { getByText } = render();

    expect(getByText(strings('earn.earning'))).toBeOnTheScreen();
    expect(getByText(`${MUSD_CONVERSION_APY}%`)).toBeOnTheScreen();
  });

  it('renders skeleton when transaction pay is loading', () => {
    useIsTransactionPayLoadingMock.mockReturnValue(true);

    const { getByTestId } = render();

    expect(getByTestId('earning-percentage-row-skeleton')).toBeOnTheScreen();
  });
});
