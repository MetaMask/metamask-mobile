import React from 'react';
import { act } from '@testing-library/react-native';
import { setDestToken } from '../../../../../../core/redux/slices/bridge';
import { ethToken1Address } from '../../../_mocks_/initialState';
import { createMockToken } from '../../../testUtils';
import { MISSING_PRICE_BANNER_DELAY_MS } from '../SwapsBanners.constants';
import { SwapsBannersSelectorsIDs } from '../SwapsBanners.testIds';
import { MissingAssetsPriceDataBanner } from './MissingAssetsPriceDataBanner';
import { createBannerState, renderBanner } from './testUtils';

// Has market data in the mocked state, so it resolves to a real fiat rate.
const pricedToken = createMockToken({
  address: ethToken1Address,
  symbol: 'TOKEN1',
});
// Absent from market data, so it has no fiat rate to price it with.
const unpricedToken = createMockToken({
  address: '0x00000000000000000000000000000000000000ff',
  symbol: 'MUSD',
});

describe('MissingAssetsPriceDataBanner', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const elapseDelay = () =>
    act(() => {
      jest.advanceTimersByTime(MISSING_PRICE_BANNER_DELAY_MS);
    });

  it('is shown when the destination token has no fiat rate', () => {
    const { getByTestId } = renderBanner(<MissingAssetsPriceDataBanner />, {
      state: createBannerState({ destToken: unpricedToken }),
    });
    elapseDelay();

    expect(
      getByTestId(SwapsBannersSelectorsIDs.MISSING_ASSETS_PRICE),
    ).toBeOnTheScreen();
  });

  it('is shown when the source token has no fiat rate', () => {
    const { getByTestId } = renderBanner(<MissingAssetsPriceDataBanner />, {
      state: createBannerState({
        sourceToken: unpricedToken,
        destToken: pricedToken,
      }),
    });
    elapseDelay();

    expect(
      getByTestId(SwapsBannersSelectorsIDs.MISSING_ASSETS_PRICE),
    ).toBeOnTheScreen();
  });

  it('is hidden while no amount has been entered', () => {
    const { queryByTestId } = renderBanner(<MissingAssetsPriceDataBanner />, {
      state: createBannerState({
        sourceAmount: '0',
        destToken: unpricedToken,
      }),
    });

    expect(
      queryByTestId(SwapsBannersSelectorsIDs.MISSING_ASSETS_PRICE),
    ).toBeNull();
  });

  it('is hidden when both tokens are priced', () => {
    const { queryByTestId } = renderBanner(<MissingAssetsPriceDataBanner />, {
      state: createBannerState({ destToken: pricedToken }),
    });

    expect(
      queryByTestId(SwapsBannersSelectorsIDs.MISSING_ASSETS_PRICE),
    ).toBeNull();
  });

  it('is not shown before the delay has elapsed', () => {
    const { queryByTestId } = renderBanner(<MissingAssetsPriceDataBanner />, {
      state: createBannerState({ destToken: unpricedToken }),
    });

    act(() => {
      jest.advanceTimersByTime(MISSING_PRICE_BANNER_DELAY_MS - 1);
    });

    expect(
      queryByTestId(SwapsBannersSelectorsIDs.MISSING_ASSETS_PRICE),
    ).toBeNull();
  });

  it('never shows when the price resolves before the delay has elapsed', () => {
    const { queryByTestId, store } = renderBanner(
      <MissingAssetsPriceDataBanner />,
      { state: createBannerState({ destToken: unpricedToken }) },
    );

    act(() => {
      jest.advanceTimersByTime(MISSING_PRICE_BANNER_DELAY_MS - 1);
    });
    act(() => {
      store.dispatch(setDestToken(pricedToken));
    });
    elapseDelay();

    expect(
      queryByTestId(SwapsBannersSelectorsIDs.MISSING_ASSETS_PRICE),
    ).toBeNull();
  });

  it('hides immediately once the price resolves after the banner is shown', () => {
    const { queryByTestId, store } = renderBanner(
      <MissingAssetsPriceDataBanner />,
      { state: createBannerState({ destToken: unpricedToken }) },
    );
    elapseDelay();
    expect(
      queryByTestId(SwapsBannersSelectorsIDs.MISSING_ASSETS_PRICE),
    ).toBeOnTheScreen();

    act(() => {
      store.dispatch(setDestToken(pricedToken));
    });

    expect(
      queryByTestId(SwapsBannersSelectorsIDs.MISSING_ASSETS_PRICE),
    ).toBeNull();
  });

  it('restarts the delay when the price goes missing again', () => {
    const { queryByTestId, store } = renderBanner(
      <MissingAssetsPriceDataBanner />,
      { state: createBannerState({ destToken: pricedToken }) },
    );

    act(() => {
      store.dispatch(setDestToken(unpricedToken));
    });

    expect(
      queryByTestId(SwapsBannersSelectorsIDs.MISSING_ASSETS_PRICE),
    ).toBeNull();

    elapseDelay();

    expect(
      queryByTestId(SwapsBannersSelectorsIDs.MISSING_ASSETS_PRICE),
    ).toBeOnTheScreen();
  });
});
