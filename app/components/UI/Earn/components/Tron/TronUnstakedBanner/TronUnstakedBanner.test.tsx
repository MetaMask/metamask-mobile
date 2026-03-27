import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import type { CaipChainId } from '@metamask/utils';
import TronUnstakedBanner from './TronUnstakedBanner';
import { strings } from '../../../../../../../locales/i18n';
import useTronClaimUnstakedTrx from '../../../hooks/useTronClaimUnstakedTrx';
import useEarnToasts from '../../../hooks/useEarnToasts';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { selectTronClaimUnstakedTrxButtonEnabled } from '../../../../../../selectors/featureFlagController/tronClaimUnstakedTrxButtonEnabled';
import { TronUnstakedBannerTestIds } from './TronUnstakedBanner.testIds';

jest.mock(
  '../../../../../../selectors/featureFlagController/tronClaimUnstakedTrxButtonEnabled',
  () => ({
    selectTronClaimUnstakedTrxButtonEnabled: jest.fn(),
  }),
);

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

const mockSelectTronClaimUnstakedTrxButtonEnabled =
  selectTronClaimUnstakedTrxButtonEnabled as unknown as jest.Mock;

const renderBanner = (props: { amount: string; chainId: CaipChainId }) =>
  renderWithProvider(<TronUnstakedBanner {...props} />, undefined, false);

describe('TronUnstakedBanner', () => {
  const mockHandleClaimUnstakedTrx = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectTronClaimUnstakedTrxButtonEnabled.mockReturnValue(true);
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
    const { getByText } = renderBanner({
      amount: '100',
      chainId: 'tron:728126428',
    });

    const expectedTitle = strings('stake.tron.unstaked_banner.title', {
      amount: '100',
    });
    expect(getByText(expectedTitle)).toBeOnTheScreen();
  });

  it('renders the description', () => {
    const { getByText } = renderBanner({
      amount: '100',
      chainId: 'tron:728126428',
    });

    const expectedDescription = strings(
      'stake.tron.unstaked_banner.description',
    );
    expect(getByText(expectedDescription)).toBeOnTheScreen();
  });

  it('renders the claim button when tronClaimUnstakedTrxButtonEnabled is true', () => {
    const { getByTestId } = renderBanner({
      amount: '100',
      chainId: 'tron:728126428',
    });

    expect(
      getByTestId(TronUnstakedBannerTestIds.CLAIM_BUTTON),
    ).toBeOnTheScreen();
  });

  it('does not render the claim button when tronClaimUnstakedTrxButtonEnabled is false', () => {
    mockSelectTronClaimUnstakedTrxButtonEnabled.mockReturnValue(false);

    const { getByText, queryByTestId } = renderBanner({
      amount: '100',
      chainId: 'tron:728126428',
    });

    expect(
      queryByTestId(TronUnstakedBannerTestIds.CLAIM_BUTTON),
    ).not.toBeOnTheScreen();
    expect(
      getByText(strings('stake.tron.unstaked_banner.description')),
    ).toBeOnTheScreen();
  });

  it('calls handleClaimUnstakedTrx when button is pressed', () => {
    const { getByTestId } = renderBanner({
      amount: '100',
      chainId: 'tron:728126428',
    });

    fireEvent.press(getByTestId(TronUnstakedBannerTestIds.CLAIM_BUTTON));
    expect(mockHandleClaimUnstakedTrx).toHaveBeenCalledTimes(1);
  });

  it('disables the button when isSubmitting is true', () => {
    mockUseTronClaimUnstakedTrx.mockReturnValue({
      handleClaimUnstakedTrx: mockHandleClaimUnstakedTrx,
      isSubmitting: true,
      errors: undefined,
    });

    const { getByTestId } = renderBanner({
      amount: '100',
      chainId: 'tron:728126428',
    });

    const button = getByTestId(TronUnstakedBannerTestIds.CLAIM_BUTTON);
    expect(button.props.accessibilityState?.disabled).toBe(true);
  });

  it('shows error toast when errors are returned', () => {
    mockUseTronClaimUnstakedTrx.mockReturnValue({
      handleClaimUnstakedTrx: mockHandleClaimUnstakedTrx,
      isSubmitting: false,
      errors: ['InsufficientBalance'],
    });

    renderBanner({ amount: '100', chainId: 'tron:728126428' });

    expect(mockFailedToastFn).toHaveBeenCalledWith(['InsufficientBalance']);
    expect(mockShowToast).toHaveBeenCalledWith(mockFailedToastResult);
  });

  it('shows title-only error toast when valid is false without explicit errors', () => {
    mockUseTronClaimUnstakedTrx.mockReturnValue({
      handleClaimUnstakedTrx: mockHandleClaimUnstakedTrx,
      isSubmitting: false,
      errors: [],
    });

    renderBanner({ amount: '100', chainId: 'tron:728126428' });

    expect(mockFailedToastFn).toHaveBeenCalledWith([]);
    expect(mockShowToast).toHaveBeenCalledWith(mockFailedToastResult);
  });

  it('does not show error toast when there are no errors', () => {
    renderBanner({ amount: '100', chainId: 'tron:728126428' });

    expect(mockShowToast).not.toHaveBeenCalled();
  });
});
