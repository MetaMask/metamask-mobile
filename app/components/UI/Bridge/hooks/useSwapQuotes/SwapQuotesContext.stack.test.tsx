import React, { useEffect } from 'react';
import { Pressable, Text } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';

import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { createBridgeTestState } from '../../testUtils';
import { BridgeTabKey } from '../../Views/BridgeView/BridgeView.constants';
import {
  BridgeQuoteDataProvider,
  useBridgeQuoteDataContext,
} from '../useBridgeQuoteData/BridgeQuoteDataContext';
import { useBridgeSession } from '../useBridgeSession';
import { BridgeSessionProvider } from '../useBridgeSession/BridgeSessionContext';
import { SwapQuotesProvider } from './SwapQuotesContext';

// Fetches the token balance over the network on mount.
jest.mock('../useLatestBalance', () => ({
  useLatestBalance: jest.fn(() => undefined),
}));

// getVersion() has no real app version to read in tests.
jest.mock('../../../../../util/remoteFeatureFlag', () => ({
  hasMinimumRequiredVersion: jest.fn(() => true),
}));

let mountCount = 0;

const QuoteConsumer = () => {
  const { renderedTab, setRenderedTab } = useBridgeSession();
  const { isLoading } = useBridgeQuoteDataContext();

  useEffect(() => {
    mountCount += 1;
  }, []);

  return (
    <>
      <Text testID="rendered-tab">{renderedTab}</Text>
      <Text testID="quote-loading">{String(isLoading)}</Text>
      <Pressable
        testID="switch-to-limit"
        onPress={() => setRenderedTab(BridgeTabKey.Limit)}
      >
        <Text>switch</Text>
      </Pressable>
    </>
  );
};

const renderQuoteConsumer = () =>
  renderWithProvider(
    <BridgeSessionProvider>
      <SwapQuotesProvider>
        <BridgeQuoteDataProvider>
          <QuoteConsumer />
        </BridgeQuoteDataProvider>
      </SwapQuotesProvider>
    </BridgeSessionProvider>,
    { state: createBridgeTestState() },
  );

describe('SwapQuotesProvider stack boundary', () => {
  beforeEach(() => {
    mountCount = 0;
  });

  it('resolves quote data on the market tab', () => {
    renderQuoteConsumer();

    expect(screen.getByTestId('rendered-tab')).toHaveTextContent(
      BridgeTabKey.Market,
    );
    expect(screen.getByTestId('quote-loading')).toHaveTextContent('false');
  });

  it('resolves quote data on the limit tab', () => {
    renderQuoteConsumer();

    fireEvent.press(screen.getByTestId('switch-to-limit'));

    expect(screen.getByTestId('rendered-tab')).toHaveTextContent(
      BridgeTabKey.Limit,
    );
    expect(screen.getByTestId('quote-loading')).toHaveTextContent('false');
  });

  it('keeps children mounted when the rendered tab changes', () => {
    renderQuoteConsumer();

    fireEvent.press(screen.getByTestId('switch-to-limit'));

    expect(mountCount).toBe(1);
  });
});
