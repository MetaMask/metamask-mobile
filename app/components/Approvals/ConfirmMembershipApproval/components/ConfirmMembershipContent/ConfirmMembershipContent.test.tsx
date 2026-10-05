import React from 'react';
import { Linking } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import useMoneyAccountBalance from '../../../../UI/Money/hooks/useMoneyAccountBalance';
import { strings } from '../../../../../../locales/i18n';
import AppConstants from '../../../../../core/AppConstants';
import { ConfirmMembershipApprovalTestIds } from '../../ConfirmMembershipApproval.testIds';
import { ConfirmMembershipContent } from './ConfirmMembershipContent';

jest.mock('../../../../UI/Money/hooks/useMoneyAccountBalance');

const mockUseMoneyAccountBalance = jest.mocked(useMoneyAccountBalance);
const mockOnClose = jest.fn();
const mockOnConfirm = jest.fn();

const createMoneyAccountBalance = (
  overrides: Partial<ReturnType<typeof useMoneyAccountBalance>> = {},
): ReturnType<typeof useMoneyAccountBalance> => ({
  moneyBalanceQuery: {
    isLoading: false,
    isError: false,
    data: undefined,
  } as ReturnType<typeof useMoneyAccountBalance>['moneyBalanceQuery'],
  isBalanceLoading: false,
  isBalanceFetchError: false,
  isBalanceUnavailable: false,
  isBalanceDegraded: false,
  balanceSource: undefined,
  usedFallback: false,
  lastKnownTotalFiatFormatted: undefined,
  refetchBalance: jest.fn(),
  tokenTotal: undefined,
  totalFiatFormatted: '$1,000.00',
  totalFiatRaw: undefined,
  withdrawableFiatFormatted: undefined,
  withdrawableFiatRaw: undefined,
  withdrawableMusd: undefined,
  ...overrides,
});

const renderComponent = ({
  monthlyAmount = '9.99',
  totalAmount = '9.99',
  renewDate = 'Nov 5, 2026',
  isTrial = false,
  billedOn = '',
} = {}) =>
  renderWithProvider(
    <ConfirmMembershipContent
      monthlyAmount={monthlyAmount}
      totalAmount={totalAmount}
      renewDate={renewDate}
      isTrial={isTrial}
      billedOn={billedOn}
      onClose={mockOnClose}
      onConfirm={mockOnConfirm}
    />,
  );

describe('ConfirmMembershipContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMoneyAccountBalance.mockReturnValue(createMoneyAccountBalance());
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });

  it('renders the title', () => {
    const { getByText } = renderComponent();

    expect(getByText(strings('confirm_membership.title'))).toBeOnTheScreen();
  });

  it('renders the monthly amount', () => {
    const { getByText } = renderComponent({ monthlyAmount: '9.99' });

    expect(getByText('9.99')).toBeOnTheScreen();
  });

  it('renders the plan name', () => {
    const { getByTestId } = renderComponent();

    expect(
      getByTestId(ConfirmMembershipApprovalTestIds.PLAN_NAME),
    ).toHaveTextContent(strings('confirm_membership.plan_name'));
  });

  it('renders the money account balance in the From row', () => {
    const { getByTestId } = renderComponent();

    expect(
      getByTestId(ConfirmMembershipApprovalTestIds.FROM_ROW),
    ).toHaveTextContent('$1,000.00', { exact: false });
  });

  it('omits the balance suffix when the balance is unavailable', () => {
    mockUseMoneyAccountBalance.mockReturnValue(
      createMoneyAccountBalance({ totalFiatFormatted: undefined }),
    );

    const { getByTestId, queryByText } = renderComponent();

    expect(
      getByTestId(ConfirmMembershipApprovalTestIds.FROM_ROW),
    ).toHaveTextContent(
      strings('confirm.pay_with_bottom_sheet.money_account'),
      {
        exact: false,
      },
    );
    expect(queryByText('$1,000.00', { exact: false })).not.toBeOnTheScreen();
  });

  it('renders the formatted total amount in the Total row', () => {
    const { getByTestId } = renderComponent({ totalAmount: '19.99' });

    expect(
      getByTestId(ConfirmMembershipApprovalTestIds.TOTAL_ROW),
    ).toHaveTextContent('$19.99', { exact: false });
  });

  it('calls onConfirm when the confirm button is pressed', () => {
    const { getByTestId } = renderComponent();

    fireEvent.press(
      getByTestId(ConfirmMembershipApprovalTestIds.CONFIRM_BUTTON),
    );

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it('labels the confirm button "Confirm and pay" when not a trial', () => {
    const { getByTestId } = renderComponent({ isTrial: false });

    expect(
      getByTestId(ConfirmMembershipApprovalTestIds.CONFIRM_BUTTON),
    ).toHaveTextContent(strings('confirm_membership.confirm_and_pay'));
  });

  it('labels the confirm button "Start your free trial" when a trial', () => {
    const { getByTestId } = renderComponent({ isTrial: true });

    expect(
      getByTestId(ConfirmMembershipApprovalTestIds.CONFIRM_BUTTON),
    ).toHaveTextContent(strings('confirm_membership.start_trial'));
  });

  it('omits the Billed on row when not a trial', () => {
    const { queryByTestId } = renderComponent({ isTrial: false });

    expect(
      queryByTestId(ConfirmMembershipApprovalTestIds.BILLED_ON_ROW),
    ).not.toBeOnTheScreen();
  });

  it('renders the Billed on row with the billed date when a trial', () => {
    const { getByTestId } = renderComponent({
      isTrial: true,
      billedOn: '05.10.2026',
    });

    expect(
      getByTestId(ConfirmMembershipApprovalTestIds.BILLED_ON_ROW),
    ).toHaveTextContent('05.10.2026', { exact: false });
  });

  it('calls onClose when the header close button is pressed', () => {
    const { getByTestId } = renderComponent();

    fireEvent.press(getByTestId(ConfirmMembershipApprovalTestIds.CLOSE_BUTTON));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('renders the disclaimer with the monthly amount and renew date', () => {
    const { getByTestId } = renderComponent({
      monthlyAmount: '9.99',
      renewDate: 'Nov 5, 2026',
    });

    expect(
      getByTestId(ConfirmMembershipApprovalTestIds.DISCLAIMER),
    ).toHaveTextContent('$9.99/month. Renews on Nov 5, 2026.', {
      exact: false,
    });
  });

  it('opens the terms of use link when pressed', () => {
    const { getByText } = renderComponent();

    fireEvent.press(
      getByText(strings('confirm_membership.disclaimer.terms_of_use')),
    );

    expect(Linking.openURL).toHaveBeenCalledWith(
      AppConstants.URLS.TERMS_OF_USE,
    );
  });

  it('opens the privacy policy link when pressed', () => {
    const { getByText } = renderComponent();

    fireEvent.press(
      getByText(strings('confirm_membership.disclaimer.privacy_policy')),
    );

    expect(Linking.openURL).toHaveBeenCalledWith(
      AppConstants.URLS.PRIVACY_POLICY,
    );
  });
});
