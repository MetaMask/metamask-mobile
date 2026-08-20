import React from 'react';
import { strings } from '../../../../../../../locales/i18n';
import { SwapsBannersSelectorsIDs } from '../SwapsBanners.testIds';
import { MarketClosedBanner } from './MarketClosedBanner';
import {
  createBannerState,
  createStockRwaToken,
  renderBanner,
} from './testUtils';

describe('MarketClosedBanner', () => {
  it('warns when the dest stock market is fully closed', () => {
    const nowMs = Date.now();

    const { getByText } = renderBanner(<MarketClosedBanner />, {
      state: createBannerState({
        destToken: createStockRwaToken({
          nowMs,
          inRegularHours: false,
          inOffHours: false,
        }),
        rwaEnabled: true,
      }),
    });

    expect(getByText(strings('bridge.market_closed.title'))).toBeOnTheScreen();
  });

  it('is hidden while dest stock is in off-hours', () => {
    const nowMs = Date.now();

    const { queryByTestId } = renderBanner(<MarketClosedBanner />, {
      state: createBannerState({
        destToken: createStockRwaToken({
          nowMs,
          inRegularHours: false,
          inOffHours: true,
        }),
        rwaEnabled: true,
      }),
    });

    expect(queryByTestId(SwapsBannersSelectorsIDs.MARKET_CLOSED)).toBeNull();
  });
});
