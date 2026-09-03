import React from 'react';
import { Text } from 'react-native';
import { MetaMetricsSwapsEventSource } from '@metamask/bridge-controller';
import { BigNumber } from 'ethers';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { createBridgeTestState, createMockToken } from '../../testUtils';
import { SwapsBanners } from './SwapsBanners';
import { SwapsBannersSelectorsIDs } from './SwapsBanners.testIds';
import { useSwapsBannersContext } from './SwapsBannersContext';

const sourceToken = createMockToken({
  address: '0x0000000000000000000000000000000000000000',
  symbol: 'ETH',
});
const destToken = createMockToken({ address: '0xdest', symbol: 'USDC' });

const state = createBridgeTestState({
  bridgeReducerOverrides: { sourceAmount: '1.5', sourceToken, destToken },
});

const ContextProbe = () => {
  const context = useSwapsBannersContext();

  return <Text testID="context-probe">{JSON.stringify(context)}</Text>;
};

const mockOnAdjustSourceAmount = jest.fn();

describe('SwapsBanners', () => {
  it('lays out the banners the order type composes', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <SwapsBanners onAdjustSourceAmount={mockOnAdjustSourceAmount}>
        <Text>first banner</Text>
        <Text>second banner</Text>
      </SwapsBanners>,
      { state },
    );

    expect(getByTestId(SwapsBannersSelectorsIDs.CONTAINER)).toBeOnTheScreen();
    expect(getByText('first banner')).toBeOnTheScreen();
    expect(getByText('second banner')).toBeOnTheScreen();
  });

  it('shares the swap being quoted with the banners', () => {
    const { getByTestId } = renderWithProvider(
      <SwapsBanners
        latestSourceAtomicBalance={BigNumber.from('1000')}
        location={MetaMetricsSwapsEventSource.TokenView}
        onAdjustSourceAmount={mockOnAdjustSourceAmount}
      >
        <ContextProbe />
      </SwapsBanners>,
      { state },
    );

    const context = JSON.parse(getByTestId('context-probe').props.children);

    expect(context).toEqual(
      expect.objectContaining({
        sourceAmount: '1.5',
        sourceToken: expect.objectContaining({ symbol: 'ETH' }),
        destToken: expect.objectContaining({ symbol: 'USDC' }),
        location: MetaMetricsSwapsEventSource.TokenView,
      }),
    );
  });

  it('reports the main view to analytics unless the order type says otherwise', () => {
    const { getByTestId } = renderWithProvider(
      <SwapsBanners onAdjustSourceAmount={mockOnAdjustSourceAmount}>
        <ContextProbe />
      </SwapsBanners>,
      { state },
    );

    const context = JSON.parse(getByTestId('context-probe').props.children);

    expect(context.location).toBe(MetaMetricsSwapsEventSource.MainView);
  });

  it('tells the engineer when a banner is rendered outside the container', () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => renderWithProvider(<ContextProbe />, { state })).toThrow(
      'useSwapsBannersContext must be used within SwapsBannersProvider',
    );
  });
});
