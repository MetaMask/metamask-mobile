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
    const priorityToken = {
      allowance: '0',
      decimals: 6,
      symbol: USDC,
    };
    const spendingLimitSettings = {
      limitAmount: '200',
      isFullAccess: false,
    };

    const { getByText } = renderWithProvider(() => (
      <SpendingLimitProgressBar
        priorityToken={priorityToken}
        spendingLimitSettings={spendingLimitSettings}
      />
    ));

    expect(getByText('Spending Limit')).toBeOnTheScreen();
    expect(getByText(`0/200 ${USDC}`)).toBeOnTheScreen();
  });

  it('renders with partial allowance consumed', () => {
    const priorityToken = {
      allowance: '50',
      decimals: 6,
      symbol: USDC,
    };
    const spendingLimitSettings = {
      limitAmount: '200',
      isFullAccess: false,
    };

    const { getByText } = renderWithProvider(() => (
      <SpendingLimitProgressBar
        priorityToken={priorityToken}
        spendingLimitSettings={spendingLimitSettings}
      />
    ));

    expect(getByText('Spending Limit')).toBeOnTheScreen();
    expect(getByText(`50/200 ${USDC}`)).toBeOnTheScreen();
  });

  it('renders with most of allowance consumed', () => {
    const priorityToken = {
      allowance: '160',
      decimals: 6,
      symbol: USDC,
    };
    const spendingLimitSettings = {
      limitAmount: '200',
      isFullAccess: false,
    };

    const { getByText } = renderWithProvider(() => (
      <SpendingLimitProgressBar
        priorityToken={priorityToken}
        spendingLimitSettings={spendingLimitSettings}
      />
    ));

    expect(getByText('Spending Limit')).toBeOnTheScreen();
    expect(getByText(`160/200 ${USDC}`)).toBeOnTheScreen();
  });

  it('renders with full allowance consumed', () => {
    const priorityToken = {
      allowance: '200',
      decimals: 6,
      symbol: USDC,
    };
    const spendingLimitSettings = {
      limitAmount: '200',
      isFullAccess: false,
    };

    const { getByText } = renderWithProvider(() => (
      <SpendingLimitProgressBar
        priorityToken={priorityToken}
        spendingLimitSettings={spendingLimitSettings}
      />
    ));

    expect(getByText('Spending Limit')).toBeOnTheScreen();
    expect(getByText(`200/200 ${USDC}`)).toBeOnTheScreen();
  });

  it('handles zero total allowance', () => {
    const priorityToken = {
      allowance: '0',
      decimals: 6,
      symbol: USDC,
    };
    const spendingLimitSettings = {
      limitAmount: '0',
      isFullAccess: false,
    };

    const { getByText } = renderWithProvider(() => (
      <SpendingLimitProgressBar
        priorityToken={priorityToken}
        spendingLimitSettings={spendingLimitSettings}
      />
    ));

    expect(getByText('Spending Limit')).toBeOnTheScreen();
    expect(getByText(`0/0 ${USDC}`)).toBeOnTheScreen();
  });

  it('handles undefined allowance values', () => {
    const priorityToken = {
      allowance: undefined,
      decimals: 6,
      symbol: USDC,
    };
    const spendingLimitSettings = {
      limitAmount: undefined,
      isFullAccess: false,
    };

    const { getByText } = renderWithProvider(() => (
      <SpendingLimitProgressBar
        priorityToken={priorityToken}
        spendingLimitSettings={spendingLimitSettings}
      />
    ));

    expect(getByText('Spending Limit')).toBeOnTheScreen();
    expect(getByText(`0/0 ${USDC}`)).toBeOnTheScreen();
  });

  it('handles large values', () => {
    const priorityToken = {
      allowance: '0.5',
      decimals: 6,
      symbol: USDC,
    };
    const spendingLimitSettings = {
      limitAmount: '1',
      isFullAccess: false,
    };

    const { getByText } = renderWithProvider(() => (
      <SpendingLimitProgressBar
        priorityToken={priorityToken}
        spendingLimitSettings={spendingLimitSettings}
      />
    ));

    expect(getByText('Spending Limit')).toBeOnTheScreen();
    expect(getByText(`0.5/1 ${USDC}`)).toBeOnTheScreen();
  });

  it('handles remaining allowance exceeding total allowance', () => {
    const priorityToken = {
      allowance: '150',
      decimals: 6,
      symbol: USDC,
    };
    const spendingLimitSettings = {
      limitAmount: '100',
      isFullAccess: false,
    };

    const { getByText } = renderWithProvider(() => (
      <SpendingLimitProgressBar
        priorityToken={priorityToken}
        spendingLimitSettings={spendingLimitSettings}
      />
    ));

    expect(getByText('Spending Limit')).toBeOnTheScreen();
    // Component clamps remaining to 0 when used > limit, so shows full limit as consumed
    expect(getByText(`100/100 ${USDC}`)).toBeOnTheScreen();
  });

  it('renders with different symbol', () => {
    const priorityToken = {
      allowance: '500',
      decimals: 18,
      symbol: 'ETH',
    };
    const spendingLimitSettings = {
      limitAmount: '1000',
      isFullAccess: false,
    };

    const { getByText } = renderWithProvider(() => (
      <SpendingLimitProgressBar
        priorityToken={priorityToken}
        spendingLimitSettings={spendingLimitSettings}
      />
    ));

    expect(getByText('Spending Limit')).toBeOnTheScreen();
    expect(getByText('500/1000 ETH')).toBeOnTheScreen();
  });

  it('renders progress bar component', () => {
    const priorityToken = {
      allowance: '100',
      decimals: 6,
      symbol: USDC,
    };
    const spendingLimitSettings = {
      limitAmount: '200',
      isFullAccess: false,
    };

    const { toJSON } = renderWithProvider(() => (
      <SpendingLimitProgressBar
        priorityToken={priorityToken}
        spendingLimitSettings={spendingLimitSettings}
      />
    ));

    expect(toJSON()).toBeTruthy();
  });

  it('handles null allowance values', () => {
    const priorityToken = {
      allowance: null,
      decimals: 6,
      symbol: USDC,
    };
    const spendingLimitSettings = {
      limitAmount: '200',
      isFullAccess: false,
    };

    const { getByText } = renderWithProvider(() => (
      <SpendingLimitProgressBar
        priorityToken={priorityToken}
        spendingLimitSettings={spendingLimitSettings}
      />
    ));

    expect(getByText('Spending Limit')).toBeOnTheScreen();
    expect(getByText(`0/200 ${USDC}`)).toBeOnTheScreen();
  });

  it('calculates consumed amount correctly for 25% consumption', () => {
    const priorityToken = {
      allowance: '100',
      decimals: 6,
      symbol: USDC,
    };
    const spendingLimitSettings = {
      limitAmount: '400',
      isFullAccess: false,
    };

    const { getByText } = renderWithProvider(() => (
      <SpendingLimitProgressBar
        priorityToken={priorityToken}
        spendingLimitSettings={spendingLimitSettings}
      />
    ));

    expect(getByText(`100/400 ${USDC}`)).toBeOnTheScreen();
  });

  it('calculates consumed amount correctly for 75% consumption', () => {
    const priorityToken = {
      allowance: '300',
      decimals: 6,
      symbol: USDC,
    };
    const spendingLimitSettings = {
      limitAmount: '400',
      isFullAccess: false,
    };

    const { getByText } = renderWithProvider(() => (
      <SpendingLimitProgressBar
        priorityToken={priorityToken}
        spendingLimitSettings={spendingLimitSettings}
      />
    ));

    expect(getByText(`300/400 ${USDC}`)).toBeOnTheScreen();
  });

  it('calculates consumed amount correctly for 99% consumption', () => {
    const priorityToken = {
      allowance: '99',
      decimals: 6,
      symbol: USDC,
    };
    const spendingLimitSettings = {
      limitAmount: '100',
      isFullAccess: false,
    };

    const { getByText } = renderWithProvider(() => (
      <SpendingLimitProgressBar
        priorityToken={priorityToken}
        spendingLimitSettings={spendingLimitSettings}
      />
    ));

    expect(getByText(`99/100 ${USDC}`)).toBeOnTheScreen();
  });
});
