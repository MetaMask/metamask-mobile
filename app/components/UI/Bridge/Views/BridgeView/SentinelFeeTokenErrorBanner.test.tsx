import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { SentinelFeeTokenErrorBanner } from './SentinelFeeTokenErrorBanner';

const TEST_IDS = {
  unsupportedPair: 'fee-token-unsupported-banner',
  unavailable: 'fee-tokens-unavailable-banner',
  retryButton: 'fee-token-retry-button',
};

function renderBanner(
  reason: React.ComponentProps<typeof SentinelFeeTokenErrorBanner>['reason'],
  onRetry = jest.fn(),
) {
  return render(
    <SentinelFeeTokenErrorBanner
      reason={reason}
      unsupportedPairMessage="Unsupported token pair"
      unavailableMessage="Fee tokens unavailable"
      retryLabel="Try again"
      onRetry={onRetry}
      testIDs={TEST_IDS}
    />,
  );
}

describe('SentinelFeeTokenErrorBanner', () => {
  it('renders the supplied unsupported-pair message', () => {
    renderBanner('unsupported-pair');

    expect(screen.getByTestId(TEST_IDS.unsupportedPair)).toHaveTextContent(
      'Unsupported token pair',
    );
  });

  it('retries after a cold fetch failure', () => {
    const onRetry = jest.fn();
    renderBanner('unavailable', onRetry);

    fireEvent.press(screen.getByTestId(TEST_IDS.retryButton));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders nothing while Sentinel fee tokens load', () => {
    renderBanner('loading');

    expect(
      screen.queryByTestId(TEST_IDS.unsupportedPair),
    ).not.toBeOnTheScreen();
    expect(screen.queryByTestId(TEST_IDS.unavailable)).not.toBeOnTheScreen();
  });
});
