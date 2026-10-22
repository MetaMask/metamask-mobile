import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import {
  selectMoneyAccountPlusSubscription,
  selectSubscriptionBenefits,
} from '../../../../../../selectors/subscriptionController';
import OrangeFeesTooltipContent from './OrangeFeesTooltipContent';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const mockUseSelector = useSelector as jest.Mock;

const mockState = ({
  benefits,
  subscription,
}: {
  benefits?: unknown;
  subscription?: unknown;
}) => {
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectSubscriptionBenefits) return benefits;
    if (selector === selectMoneyAccountPlusSubscription) return subscription;
    return undefined;
  });
};

const TEST_ID = 'orange-fees';

const buildBenefits = (perps: Record<string, unknown>) => ({
  swaps: {
    capMicroUsd: 500_000_000,
    consumedMicroUsd: 0,
    remainingMicroUsd: 500_000_000,
    exhausted: false,
  },
  predict: {
    capTxCount: 10,
    consumedTxCount: 0,
    remainingTxCount: 10,
    exhausted: false,
  },
  perps,
});

describe('OrangeFeesTooltipContent', () => {
  afterEach(() => {
    mockUseSelector.mockReset();
  });

  it('explains the benefit with the default allowance when no usage is loaded', () => {
    mockState({});

    render(<OrangeFeesTooltipContent testID={TEST_ID} />);

    expect(
      screen.getByText(
        'Orange covers the MetaMask fee on up to $1,000 of position size each billing period. The provider fee still applies.',
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId(`${TEST_ID}-remaining`)).not.toBeOnTheScreen();
  });

  it('uses the allowance and remaining amount from the benefits snapshot', () => {
    mockState({
      benefits: buildBenefits({
        capMicroUsd: 2_000_000_000,
        consumedMicroUsd: 750_000_000,
        remainingMicroUsd: 1_250_000_000,
        exhausted: false,
      }),
      subscription: { currentPeriodEnd: '2026-11-15T12:00:00.000Z' },
    });

    render(<OrangeFeesTooltipContent testID={TEST_ID} />);

    expect(
      screen.getByText(/up to \$2,000 of position size/),
    ).toBeOnTheScreen();
    expect(screen.getByTestId(`${TEST_ID}-remaining`)).toHaveTextContent(
      /^You have \$1,250 left until .*2026\.$/,
    );
  });

  it('omits the remaining line without a billing period end', () => {
    mockState({
      benefits: buildBenefits({
        capMicroUsd: 1_000_000_000,
        consumedMicroUsd: 0,
        remainingMicroUsd: 1_000_000_000,
        exhausted: false,
      }),
    });

    render(<OrangeFeesTooltipContent testID={TEST_ID} />);

    expect(screen.queryByTestId(`${TEST_ID}-remaining`)).not.toBeOnTheScreen();
  });
});
