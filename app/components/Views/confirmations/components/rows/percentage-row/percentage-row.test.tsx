import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { PercentageRow } from './percentage-row';
import { useIsTransactionPayLoading } from '../../../hooks/pay/useTransactionPayData';
import { strings } from '../../../../../../../locales/i18n';
import { MUSD_CONVERSION_APY } from '../../../../../UI/Earn/constants/musd';

jest.mock('../../../hooks/pay/useTransactionPayData');

function render() {
  return renderWithProvider(<PercentageRow />);
}

describe('PercentageRow', () => {
  const useIsTransactionPayLoadingMock = jest.mocked(
    useIsTransactionPayLoading,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    useIsTransactionPayLoadingMock.mockReturnValue(false);
  });

  it('renders label, tooltip and APY when not loading', () => {
    const { getByText, getByTestId } = render();

    expect(getByText(strings('earn.claimable_bonus'))).toBeOnTheScreen();
    expect(getByTestId('info-row-tooltip-open-btn')).toBeOnTheScreen();
    expect(getByText(`${MUSD_CONVERSION_APY}%`)).toBeOnTheScreen();
  });

  it('renders skeleton when transaction pay is loading', () => {
    useIsTransactionPayLoadingMock.mockReturnValue(true);

    const { getByTestId } = render();

    expect(getByTestId('percentage-row-skeleton')).toBeOnTheScreen();
  });
});
