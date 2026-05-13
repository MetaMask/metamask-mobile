import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { PercentageRow } from './percentage-row';
import { useIsTransactionPayLoading } from '../../../hooks/pay/useTransactionPayData';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { strings } from '../../../../../../../locales/i18n';
import { MUSD_CONVERSION_APY } from '../../../../../UI/Earn/constants/musd';
import { TransactionType } from '@metamask/transaction-controller';
import Routes from '../../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

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

  it('renders label, tooltip trigger and APY when not loading', () => {
    const { getByText, getByTestId } = render();

    expect(getByText(strings('earn.claimable_bonus'))).toBeOnTheScreen();
    expect(getByTestId('percentage-row-tooltip-open-btn')).toBeOnTheScreen();
    expect(getByText(`${MUSD_CONVERSION_APY}%`)).toBeOnTheScreen();
  });

  it('renders skeleton when transaction pay is loading', () => {
    useIsTransactionPayLoadingMock.mockReturnValue(true);

    const { getByTestId } = render();

    expect(getByTestId('percentage-row-skeleton')).toBeOnTheScreen();
  });

  it('navigates to the claimable bonus info sheet when tooltip is pressed', () => {
    const { getByTestId } = render();

    fireEvent.press(getByTestId('percentage-row-tooltip-open-btn'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.CLAIMABLE_BONUS_INFO_SHEET,
    });
  });

  it('renders nothing for non-musdConversion transactions', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.simpleSend,
    } as ReturnType<typeof useTransactionMetadataRequest>);

    const { toJSON } = render();

    expect(toJSON()).toBeNull();
  });
});
