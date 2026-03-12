import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { PercentageRow } from './percentage-row';
import { useIsTransactionPayLoading } from '../../../hooks/pay/useTransactionPayData';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { strings } from '../../../../../../../locales/i18n';
import { MUSD_CONVERSION_APY } from '../../../../../UI/Earn/constants/musd';
import { TransactionType } from '@metamask/transaction-controller';

jest.mock('../../../hooks/pay/useTransactionPayData');
jest.mock('../../../hooks/transactions/useTransactionMetadataRequest');

function render() {
  return renderWithProvider(<PercentageRow />);
}

describe('PercentageRow', () => {
  const useIsTransactionPayLoadingMock = jest.mocked(
    useIsTransactionPayLoading,
  );
  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );

  beforeEach(() => {
    jest.resetAllMocks();

    useIsTransactionPayLoadingMock.mockReturnValue(false);
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.musdConversion,
    } as ReturnType<typeof useTransactionMetadataRequest>);
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

  it('renders nothing for non-musdConversion transactions', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.simpleSend,
    } as ReturnType<typeof useTransactionMetadataRequest>);

    const { toJSON } = render();

    expect(toJSON()).toBeNull();
  });
});
