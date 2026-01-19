import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { PercentageRow } from './percentage-row';
import { useIsTransactionPayLoading } from '../../../hooks/pay/useTransactionPayData';
import { strings } from '../../../../../../../locales/i18n';
import { MUSD_CONVERSION_APY } from '../../../../../UI/Earn/constants/musd';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
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
    } as never);
  });

  it('renders label, tooltip and APY when not loading', () => {
    const { getByText, getByTestId } = render();

    expect(getByText(strings('earn.claimable_bonus'))).toBeOnTheScreen();
    expect(getByTestId('info-row-tooltip-open-btn')).toBeOnTheScreen();
    expect(getByText(`${MUSD_CONVERSION_APY}%`)).toBeOnTheScreen();
  });

  it('renders nothing when tx type is not supported', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.contractInteraction,
    } as never);

    const { queryByText, queryByTestId } = render();

    expect(queryByTestId('percentage-row-skeleton')).toBeNull();
    expect(queryByText(strings('earn.bonus'))).toBeNull();
    expect(queryByText(`${MUSD_CONVERSION_APY}%`)).toBeNull();
  });

  it('renders nothing when transaction metadata is undefined', () => {
    useTransactionMetadataRequestMock.mockReturnValue(undefined as never);

    const { queryByText, queryByTestId } = render();

    expect(queryByTestId('percentage-row-skeleton')).toBeNull();
    expect(queryByText(strings('earn.bonus'))).toBeNull();
    expect(queryByText(`${MUSD_CONVERSION_APY}%`)).toBeNull();
  });

  it('renders skeleton when transaction pay is loading', () => {
    useIsTransactionPayLoadingMock.mockReturnValue(true);

    const { getByTestId } = render();

    expect(getByTestId('percentage-row-skeleton')).toBeOnTheScreen();
  });
});
