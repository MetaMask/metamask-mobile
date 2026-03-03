import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TronClaimBanner from './TronClaimBanner';
import { strings } from '../../../../../../../locales/i18n';
import useTronClaim from '../../../hooks/useTronClaim';

jest.mock('../../../hooks/useTronClaim');
const mockUseTronClaim = useTronClaim as jest.MockedFunction<
  typeof useTronClaim
>;

describe('TronClaimBanner', () => {
  const mockHandleClaim = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTronClaim.mockReturnValue({
      handleClaim: mockHandleClaim,
      isSubmitting: false,
      errors: undefined,
    });
  });

  it('renders the claim text with the given amount', () => {
    const { getByText } = render(
      <TronClaimBanner amount="100" chainId="tron:0x2b6653dc" />,
    );

    const expected = strings('stake.tron.has_claimable_trx', {
      amount: '100',
    });
    expect(getByText(expected)).toBeDefined();
  });

  it('renders the Claim TRX button', () => {
    const { getByTestId } = render(
      <TronClaimBanner amount="100" chainId="tron:0x2b6653dc" />,
    );

    expect(getByTestId('tron-claim-banner-button')).toBeDefined();
  });

  it('calls handleClaim when button is pressed', () => {
    const { getByTestId } = render(
      <TronClaimBanner amount="100" chainId="tron:0x2b6653dc" />,
    );

    fireEvent.press(getByTestId('tron-claim-banner-button'));
    expect(mockHandleClaim).toHaveBeenCalledTimes(1);
  });

  it('disables the button when isSubmitting is true', () => {
    mockUseTronClaim.mockReturnValue({
      handleClaim: mockHandleClaim,
      isSubmitting: true,
      errors: undefined,
    });

    const { getByTestId } = render(
      <TronClaimBanner amount="100" chainId="tron:0x2b6653dc" />,
    );

    const button = getByTestId('tron-claim-banner-button');
    expect(button.props.accessibilityState.disabled).toBe(true);
  });
});
