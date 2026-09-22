import React from 'react';
import { ethToken1Address } from '../../../_mocks_/initialState';
import { createMockToken } from '../../../testUtils';
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
  it('is shown when the destination token has no fiat rate', () => {
    const { getByTestId } = renderBanner(<MissingAssetsPriceDataBanner />, {
      state: createBannerState({ destToken: unpricedToken }),
    });

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
});
