import React from 'react';
import { strings } from '../../../../../../../locales/i18n';
import { __resetStockMarketHoursClockForTest } from '../../../hooks/useStockMarketHours';
import { SwapsBannersSelectorsIDs } from '../SwapsBanners.testIds';
import { OffHoursTradingBanner } from './OffHoursTradingBanner';
import {
  createBannerState,
  createStockRwaToken,
  PINNED_STOCK_MARKET_NOW,
  renderBanner,
} from './testUtils';

describe('OffHoursTradingBanner', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(PINNED_STOCK_MARKET_NOW);
    __resetStockMarketHoursClockForTest();
  });

  afterEach(() => {
    __resetStockMarketHoursClockForTest();
    jest.useRealTimers();
  });

  it('warns when the dest stock is in an off-hours window', () => {
    const nowMs = Date.now();

    const { getByText } = renderBanner(<OffHoursTradingBanner />, {
      state: createBannerState({
        destToken: createStockRwaToken({
          nowMs,
          inRegularHours: false,
          inOffHours: true,
        }),
        rwaEnabled: true,
      }),
    });

    expect(
      getByText(strings('bridge.off_hours_trading.title')),
    ).toBeOnTheScreen();
  });

  it('is hidden during regular market hours', () => {
    const nowMs = Date.now();

    const { queryByTestId } = renderBanner(<OffHoursTradingBanner />, {
      state: createBannerState({
        destToken: createStockRwaToken({
          nowMs,
          inRegularHours: true,
          inOffHours: false,
        }),
        rwaEnabled: true,
      }),
    });

    expect(
      queryByTestId(SwapsBannersSelectorsIDs.OFF_HOURS_TRADING),
    ).toBeNull();
  });
});
