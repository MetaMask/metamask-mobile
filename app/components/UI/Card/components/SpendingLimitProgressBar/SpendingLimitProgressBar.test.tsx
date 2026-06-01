import React from 'react';
import SpendingLimitProgressBar from './SpendingLimitProgressBar';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';

function renderWithProvider(
  component: React.ComponentType | (() => React.ReactElement | null),
) {
  return renderScreen(
    component,
    {
      name: 'SpendingLimitProgressBar',
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );
}

describe('SpendingLimitProgressBar', () => {
  const USDC = 'USDC';

  it('renders with full remaining allowance', () => {
    const { getByText } = renderWithProvider(() => (
      <SpendingLimitProgressBar
        isLoading={false}
        decimals={6}
        totalAllowance="200"
        remainingAllowance="200"
        symbol={USDC}
      />
    ));

    expect(getByText('Spending Limit')).toBeOnTheScreen();
    expect(getByText(`0/200 ${USDC}`)).toBeOnTheScreen();
  });

  it('renders with partial allowance consumed', () => {
    const { getByText } = renderWithProvider(() => (
      <SpendingLimitProgressBar
        isLoading={false}
        decimals={6}
        totalAllowance="200"
        remainingAllowance="150"
        symbol={USDC}
      />
    ));

    expect(getByText('Spending Limit')).toBeOnTheScreen();
    expect(getByText(`50/200 ${USDC}`)).toBeOnTheScreen();
  });

  it('renders with most of allowance consumed', () => {
    const { getByText } = renderWithProvider(() => (
      <SpendingLimitProgressBar
        isLoading={false}
        decimals={6}
        totalAllowance="200"
        remainingAllowance="40"
        symbol={USDC}
      />
    ));

    expect(getByText('Spending Limit')).toBeOnTheScreen();
    expect(getByText(`160/200 ${USDC}`)).toBeOnTheScreen();
  });

  it('renders with full allowance consumed', () => {
    const { getByText } = renderWithProvider(() => (
      <SpendingLimitProgressBar
        isLoading={false}
        decimals={6}
        totalAllowance="200"
        remainingAllowance="0"
        symbol={USDC}
      />
    ));

    expect(getByText('Spending Limit')).toBeOnTheScreen();
    expect(getByText(`200/200 ${USDC}`)).toBeOnTheScreen();
  });

  it('handles zero total allowance', () => {
    const { getByText } = renderWithProvider(() => (
      <SpendingLimitProgressBar
        isLoading={false}
        decimals={6}
        totalAllowance="0"
        remainingAllowance="0"
        symbol={USDC}
      />
    ));

    expect(getByText('Spending Limit')).toBeOnTheScreen();
    expect(getByText(`0/0 ${USDC}`)).toBeOnTheScreen();
  });

  it('handles undefined allowance values', () => {
    const { getByText } = renderWithProvider(() => (
      <SpendingLimitProgressBar
        isLoading={false}
        decimals={6}
        totalAllowance={undefined as unknown as string}
        remainingAllowance={undefined as unknown as string}
        symbol={USDC}
      />
    ));

    expect(getByText('Spending Limit')).toBeOnTheScreen();
    expect(getByText(`0/0 ${USDC}`)).toBeOnTheScreen();
  });

  it('handles small decimal values', () => {
    const { getByText } = renderWithProvider(() => (
      <SpendingLimitProgressBar
        isLoading={false}
        decimals={6}
        totalAllowance="1"
        remainingAllowance="0.5"
        symbol={USDC}
      />
    ));

    expect(getByText('Spending Limit')).toBeOnTheScreen();
    expect(getByText(`0.5/1 ${USDC}`)).toBeOnTheScreen();
  });

  it('handles consumed exceeding total allowance', () => {
    const { getByText } = renderWithProvider(() => (
      <SpendingLimitProgressBar
        isLoading={false}
        decimals={6}
        totalAllowance="100"
        remainingAllowance="-50"
        symbol={USDC}
      />
    ));

    expect(getByText('Spending Limit')).toBeOnTheScreen();
    expect(getByText(`150/100 ${USDC}`)).toBeOnTheScreen();
  });

  it('renders with different symbol', () => {
    const { getByText } = renderWithProvider(() => (
      <SpendingLimitProgressBar
        isLoading={false}
        decimals={18}
        totalAllowance="1000"
        remainingAllowance="500"
        symbol="ETH"
      />
    ));

    expect(getByText('Spending Limit')).toBeOnTheScreen();
    expect(getByText('500/1000 ETH')).toBeOnTheScreen();
  });

  it('renders progress bar component', () => {
    const { toJSON } = renderWithProvider(() => (
      <SpendingLimitProgressBar
        isLoading={false}
        decimals={6}
        totalAllowance="200"
        remainingAllowance="100"
        symbol={USDC}
      />
    ));

    expect(toJSON()).toBeTruthy();
  });

  it('handles null allowance values', () => {
    const { getByText } = renderWithProvider(() => (
      <SpendingLimitProgressBar
        isLoading={false}
        decimals={6}
        totalAllowance="200"
        remainingAllowance={null as unknown as string}
        symbol={USDC}
      />
    ));

    expect(getByText('Spending Limit')).toBeOnTheScreen();
    expect(getByText(`200/200 ${USDC}`)).toBeOnTheScreen();
  });

  it('calculates consumed amount for 25% consumption', () => {
    const { getByText } = renderWithProvider(() => (
      <SpendingLimitProgressBar
        isLoading={false}
        decimals={6}
        totalAllowance="400"
        remainingAllowance="300"
        symbol={USDC}
      />
    ));

    expect(getByText(`100/400 ${USDC}`)).toBeOnTheScreen();
  });

  it('calculates consumed amount for 75% consumption', () => {
    const { getByText } = renderWithProvider(() => (
      <SpendingLimitProgressBar
        isLoading={false}
        decimals={6}
        totalAllowance="400"
        remainingAllowance="100"
        symbol={USDC}
      />
    ));

    expect(getByText(`300/400 ${USDC}`)).toBeOnTheScreen();
  });

  it('calculates consumed amount for 99% consumption', () => {
    const { getByText } = renderWithProvider(() => (
      <SpendingLimitProgressBar
        isLoading={false}
        decimals={6}
        totalAllowance="100"
        remainingAllowance="1"
        symbol={USDC}
      />
    ));

    expect(getByText(`99/100 ${USDC}`)).toBeOnTheScreen();
  });

  it('hides values when privacy mode is enabled', () => {
    const { getByText, queryByText } = renderWithProvider(() => (
      <SpendingLimitProgressBar
        isLoading={false}
        decimals={6}
        totalAllowance="200"
        remainingAllowance="150"
        symbol={USDC}
        privacyMode
      />
    ));

    expect(getByText('Spending Limit')).toBeOnTheScreen();
    // SensitiveTextLength.Short renders 6 dots
    expect(getByText('••••••')).toBeOnTheScreen();
    expect(queryByText(`50/200 ${USDC}`)).not.toBeOnTheScreen();
  });

  it('shows values when privacy mode is disabled', () => {
    const { getByText, queryByText } = renderWithProvider(() => (
      <SpendingLimitProgressBar
        isLoading={false}
        decimals={6}
        totalAllowance="200"
        remainingAllowance="150"
        symbol={USDC}
        privacyMode={false}
      />
    ));

    expect(getByText('Spending Limit')).toBeOnTheScreen();
    expect(getByText(`50/200 ${USDC}`)).toBeOnTheScreen();
    expect(queryByText('••••••')).not.toBeOnTheScreen();
  });

  describe('compact mode (hasOriginalAllowance=false)', () => {
    it('renders remaining-only label without progress bar', () => {
      const { getByText, queryByText } = renderWithProvider(() => (
        <SpendingLimitProgressBar
          isLoading={false}
          decimals={6}
          totalAllowance="150"
          remainingAllowance="150"
          symbol={USDC}
          hasOriginalAllowance={false}
        />
      ));

      expect(getByText('Spending Limit')).toBeOnTheScreen();
      expect(getByText(`150 ${USDC} available`)).toBeOnTheScreen();
      expect(queryByText(`0/150 ${USDC}`)).not.toBeOnTheScreen();
    });

    it('shows the actual remaining amount, ignoring totalAllowance', () => {
      const { getByText, queryByText } = renderWithProvider(() => (
        <SpendingLimitProgressBar
          isLoading={false}
          decimals={6}
          totalAllowance="9999"
          remainingAllowance="42.5"
          symbol="mUSD"
          hasOriginalAllowance={false}
        />
      ));

      expect(getByText('Spending Limit')).toBeOnTheScreen();
      expect(getByText('42.5 mUSD available')).toBeOnTheScreen();
      expect(queryByText('9956.5/9999 mUSD')).not.toBeOnTheScreen();
    });

    it('hides remaining amount when privacy mode is enabled', () => {
      const { getByText, queryByText } = renderWithProvider(() => (
        <SpendingLimitProgressBar
          isLoading={false}
          decimals={6}
          totalAllowance="100"
          remainingAllowance="100"
          symbol={USDC}
          hasOriginalAllowance={false}
          privacyMode
        />
      ));

      expect(getByText('Spending Limit')).toBeOnTheScreen();
      expect(getByText('••••••')).toBeOnTheScreen();
      expect(queryByText(`100 ${USDC} available`)).not.toBeOnTheScreen();
    });

    it('falls back to "0 SYM available" when remainingAllowance is undefined', () => {
      const { getByText } = renderWithProvider(() => (
        <SpendingLimitProgressBar
          isLoading={false}
          decimals={6}
          totalAllowance={undefined as unknown as string}
          remainingAllowance={undefined as unknown as string}
          symbol={USDC}
          hasOriginalAllowance={false}
        />
      ));

      expect(getByText(`0 ${USDC} available`)).toBeOnTheScreen();
    });

    it('renders skeleton while loading regardless of hasOriginalAllowance', () => {
      const { getByTestId } = renderWithProvider(() => (
        <SpendingLimitProgressBar
          isLoading
          decimals={6}
          totalAllowance="100"
          remainingAllowance="100"
          symbol={USDC}
          hasOriginalAllowance={false}
        />
      ));

      expect(
        getByTestId('spending-limit-progress-bar-skeleton'),
      ).toBeOnTheScreen();
    });
  });
});
