import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TronUnstakedBanner from './TronUnstakedBanner';
import { strings } from '../../../../../../../locales/i18n';
import useTronClaimUnstakedTrx from '../../../hooks/useTronClaimUnstakedTrx';
import useEarnToasts from '../../../hooks/useEarnToasts';
import { TronUnstakedBannerTestIds } from './TronUnstakedBanner.testIds';

jest.mock('../../../hooks/useTronClaimUnstakedTrx');
const mockUseTronClaimUnstakedTrx =
  useTronClaimUnstakedTrx as jest.MockedFunction<
    typeof useTronClaimUnstakedTrx
  >;

const mockShowToast = jest.fn();
const mockFailedToastResult = { variant: 'Icon', labelOptions: [] };
const mockFailedToastFn = jest.fn().mockReturnValue(mockFailedToastResult);
jest.mock('../../../hooks/useEarnToasts');
(useEarnToasts as jest.Mock).mockReturnValue({
  showToast: mockShowToast,
  EarnToastOptions: {
    tronWithdrawal: { failed: mockFailedToastFn },
  },
});

describe('TronUnstakedBanner', () => {
  const mockHandleClaimUnstakedTrx = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTronClaimUnstakedTrx.mockReturnValue({
      handleClaimUnstakedTrx: mockHandleClaimUnstakedTrx,
      isSubmitting: false,
      errors: undefined,
    });
    (useEarnToasts as jest.Mock).mockReturnValue({
      showToast: mockShowToast,
      EarnToastOptions: {
        tronWithdrawal: { failed: mockFailedToastFn },
      },
    });
  });

  it('renders the title with the given amount', () => {
    const { getByText } = render(
      <TronUnstakedBanner amount="100" chainId="tron:728126428" />,
    );

    const expectedTitle = strings('stake.tron.unstaked_banner.title', {
      amount: '100',
    });
    expect(getByText(expectedTitle)).toBeOnTheScreen();
  });

  it('renders the description', () => {
    const { getByText } = render(
      <TronUnstakedBanner amount="100" chainId="tron:728126428" />,
    );

    const expectedDescription = strings(
      'stake.tron.unstaked_banner.description',
    );
    expect(getByText(expectedDescription)).toBeOnTheScreen();
  });

  it('renders the Withdraw button', () => {
    const { getByTestId } = render(
      <TronUnstakedBanner amount="100" chainId="tron:728126428" />,
    );

    expect(
      getByTestId(TronUnstakedBannerTestIds.CLAIM_BUTTON),
    ).toBeOnTheScreen();
  });

  it('calls handleClaimUnstakedTrx when button is pressed', () => {
    const { getByTestId } = render(
      <TronUnstakedBanner amount="100" chainId="tron:728126428" />,
    );

    fireEvent.press(getByTestId(TronUnstakedBannerTestIds.CLAIM_BUTTON));
    expect(mockHandleClaimUnstakedTrx).toHaveBeenCalledTimes(1);
  });

  it('disables the button when isSubmitting is true', () => {
    mockUseTronClaimUnstakedTrx.mockReturnValue({
      handleClaimUnstakedTrx: mockHandleClaimUnstakedTrx,
      isSubmitting: true,
      errors: undefined,
    });

    const { getByTestId } = render(
      <TronUnstakedBanner amount="100" chainId="tron:728126428" />,
    );

    const button = getByTestId(TronUnstakedBannerTestIds.CLAIM_BUTTON);
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  it('shows error toast when errors are returned', () => {
    mockUseTronClaimUnstakedTrx.mockReturnValue({
      handleClaimUnstakedTrx: mockHandleClaimUnstakedTrx,
      isSubmitting: false,
      errors: ['InsufficientBalance'],
    });

    render(<TronUnstakedBanner amount="100" chainId="tron:728126428" />);

    expect(mockFailedToastFn).toHaveBeenCalledWith(['InsufficientBalance']);
    expect(mockShowToast).toHaveBeenCalledWith(mockFailedToastResult);
  });

  it('shows title-only error toast when valid is false without explicit errors', () => {
    mockUseTronClaimUnstakedTrx.mockReturnValue({
      handleClaimUnstakedTrx: mockHandleClaimUnstakedTrx,
      isSubmitting: false,
      errors: [],
    });

    render(<TronUnstakedBanner amount="100" chainId="tron:728126428" />);

    expect(mockFailedToastFn).toHaveBeenCalledWith([]);
    expect(mockShowToast).toHaveBeenCalledWith(mockFailedToastResult);
  });

  it('does not show error toast when there are no errors', () => {
    render(<TronUnstakedBanner amount="100" chainId="tron:728126428" />);

    expect(mockShowToast).not.toHaveBeenCalled();
  });
});
