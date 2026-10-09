import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { BridgeViewSelectorsIDs } from '../BridgeView.testIds';
import { LimitOrderFeeTokenErrorBanner } from './LimitOrderFeeTokenErrorBanner';

describe('LimitOrderFeeTokenErrorBanner', () => {
  it('renders the unsupported-pair message', () => {
    render(
      <LimitOrderFeeTokenErrorBanner
        reason="unsupported-pair"
        onRetry={jest.fn()}
      />,
    );

    expect(
      screen.getByTestId(
        BridgeViewSelectorsIDs.LIMIT_FEE_TOKEN_UNSUPPORTED_BANNER,
      ),
    ).toBeOnTheScreen();
  });

  it('retries after a cold fetch failure', () => {
    const onRetry = jest.fn();
    render(
      <LimitOrderFeeTokenErrorBanner reason="unavailable" onRetry={onRetry} />,
    );

    fireEvent.press(
      screen.getByTestId(BridgeViewSelectorsIDs.LIMIT_FEE_TOKEN_RETRY_BUTTON),
    );

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders nothing while Sentinel fee tokens load', () => {
    render(
      <LimitOrderFeeTokenErrorBanner reason="loading" onRetry={jest.fn()} />,
    );

    expect(
      screen.queryByTestId(
        BridgeViewSelectorsIDs.LIMIT_FEE_TOKEN_UNSUPPORTED_BANNER,
      ),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(
        BridgeViewSelectorsIDs.LIMIT_FEE_TOKENS_UNAVAILABLE_BANNER,
      ),
    ).not.toBeOnTheScreen();
  });
});
