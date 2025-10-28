import React from 'react';
import SpendingLimitProgressBar from './SpendingLimitProgressBar';
import { ethers } from 'ethers';
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
    const totalAllowance = ethers.BigNumber.from('200');
    const remainingAllowance = ethers.BigNumber.from('200');

    const { getByText } = renderWithProvider(() => (
      <SpendingLimitProgressBar
        totalAllowance={totalAllowance}
        remainingAllowance={remainingAllowance}
        symbol={USDC}
      />
    ));

    expect(getByText('Spending Limit')).toBeOnTheScreen();
    expect(getByText(`0/200 ${USDC}`)).toBeOnTheScreen();
  });

  it('renders with partial allowance consumed', () => {
    const totalAllowance = ethers.BigNumber.from('200');
    const remainingAllowance = ethers.BigNumber.from('150');

    const { getByText } = renderWithProvider(() => (
      <SpendingLimitProgressBar
        totalAllowance={totalAllowance}
        remainingAllowance={remainingAllowance}
        symbol={USDC}
      />
    ));

    expect(getByText('Spending Limit')).toBeOnTheScreen();
    expect(getByText(`50/200 ${USDC}`)).toBeOnTheScreen();
  });

  it('renders with most of allowance consumed', () => {
    const totalAllowance = ethers.BigNumber.from('200');
    const remainingAllowance = ethers.BigNumber.from('40');

    const { getByText } = renderWithProvider(() => (
      <SpendingLimitProgressBar
        totalAllowance={totalAllowance}
        remainingAllowance={remainingAllowance}
        symbol={USDC}
      />
    ));

    expect(getByText('Spending Limit')).toBeOnTheScreen();
    expect(getByText(`160/200 ${USDC}`)).toBeOnTheScreen();
  });

  it('renders with full allowance consumed', () => {
    const totalAllowance = ethers.BigNumber.from('200');
    const remainingAllowance = ethers.BigNumber.from('0');

    const { getByText } = renderWithProvider(() => (
      <SpendingLimitProgressBar
        totalAllowance={totalAllowance}
        remainingAllowance={remainingAllowance}
        symbol={USDC}
      />
    ));

    expect(getByText('Spending Limit')).toBeOnTheScreen();
    expect(getByText(`200/200 ${USDC}`)).toBeOnTheScreen();
  });

  it('handles zero total allowance', () => {
    const totalAllowance = ethers.BigNumber.from('0');
    const remainingAllowance = ethers.BigNumber.from('0');

    const { getByText } = renderWithProvider(() => (
      <SpendingLimitProgressBar
        totalAllowance={totalAllowance}
        remainingAllowance={remainingAllowance}
        symbol={USDC}
      />
    ));

    expect(getByText('Spending Limit')).toBeOnTheScreen();
    expect(getByText(`0/0 ${USDC}`)).toBeOnTheScreen();
  });

  it('handles undefined allowance values', () => {
    const { getByText } = renderWithProvider(() => (
      <SpendingLimitProgressBar symbol={USDC} />
    ));

    expect(getByText('Spending Limit')).toBeOnTheScreen();
    expect(getByText(`0/0 ${USDC}`)).toBeOnTheScreen();
  });

  it('handles large BigNumber values', () => {
    const totalAllowance = ethers.BigNumber.from('1000000000000000000');
    const remainingAllowance = ethers.BigNumber.from('500000000000000000');

    const { getByText } = renderWithProvider(() => (
      <SpendingLimitProgressBar
        totalAllowance={totalAllowance}
        remainingAllowance={remainingAllowance}
        symbol={USDC}
      />
    ));

    expect(getByText('Spending Limit')).toBeOnTheScreen();
    expect(
      getByText(`500000000000000000/1000000000000000000 ${USDC}`),
    ).toBeOnTheScreen();
  });

  it('handles remaining allowance exceeding total allowance', () => {
    const totalAllowance = ethers.BigNumber.from('100');
    const remainingAllowance = ethers.BigNumber.from('150');

    const { getByText } = renderWithProvider(() => (
      <SpendingLimitProgressBar
        totalAllowance={totalAllowance}
        remainingAllowance={remainingAllowance}
        symbol={USDC}
      />
    ));

    expect(getByText('Spending Limit')).toBeOnTheScreen();
    expect(getByText(`-50/100 ${USDC}`)).toBeOnTheScreen();
  });

  it('renders with different symbol', () => {
    const totalAllowance = ethers.BigNumber.from('1000');
    const remainingAllowance = ethers.BigNumber.from('500');

    const { getByText } = renderWithProvider(() => (
      <SpendingLimitProgressBar
        totalAllowance={totalAllowance}
        remainingAllowance={remainingAllowance}
        symbol="ETH"
      />
    ));

    expect(getByText('Spending Limit')).toBeOnTheScreen();
    expect(getByText('500/1000 ETH')).toBeOnTheScreen();
  });

  it('renders progress bar component', () => {
    const totalAllowance = ethers.BigNumber.from('200');
    const remainingAllowance = ethers.BigNumber.from('100');

    const { toJSON } = renderWithProvider(() => (
      <SpendingLimitProgressBar
        totalAllowance={totalAllowance}
        remainingAllowance={remainingAllowance}
        symbol={USDC}
      />
    ));

    expect(toJSON()).toBeTruthy();
  });

  it('handles serialized BigNumber objects', () => {
    const serializedTotal = JSON.parse(
      JSON.stringify(ethers.BigNumber.from('200')),
    );
    const serializedRemaining = JSON.parse(
      JSON.stringify(ethers.BigNumber.from('100')),
    );

    const { getByText } = renderWithProvider(() => (
      <SpendingLimitProgressBar
        totalAllowance={serializedTotal}
        remainingAllowance={serializedRemaining}
        symbol={USDC}
      />
    ));

    expect(getByText('Spending Limit')).toBeOnTheScreen();
    expect(getByText(`100/200 ${USDC}`)).toBeOnTheScreen();
  });

  it('calculates consumed amount correctly for 25% consumption', () => {
    const totalAllowance = ethers.BigNumber.from('400');
    const remainingAllowance = ethers.BigNumber.from('300');

    const { getByText } = renderWithProvider(() => (
      <SpendingLimitProgressBar
        totalAllowance={totalAllowance}
        remainingAllowance={remainingAllowance}
        symbol={USDC}
      />
    ));

    expect(getByText(`100/400 ${USDC}`)).toBeOnTheScreen();
  });

  it('calculates consumed amount correctly for 75% consumption', () => {
    const totalAllowance = ethers.BigNumber.from('400');
    const remainingAllowance = ethers.BigNumber.from('100');

    const { getByText } = renderWithProvider(() => (
      <SpendingLimitProgressBar
        totalAllowance={totalAllowance}
        remainingAllowance={remainingAllowance}
        symbol={USDC}
      />
    ));

    expect(getByText(`300/400 ${USDC}`)).toBeOnTheScreen();
  });

  it('calculates consumed amount correctly for 99% consumption', () => {
    const totalAllowance = ethers.BigNumber.from('100');
    const remainingAllowance = ethers.BigNumber.from('1');

    const { getByText } = renderWithProvider(() => (
      <SpendingLimitProgressBar
        totalAllowance={totalAllowance}
        remainingAllowance={remainingAllowance}
        symbol={USDC}
      />
    ));

    expect(getByText(`99/100 ${USDC}`)).toBeOnTheScreen();
  });
});
