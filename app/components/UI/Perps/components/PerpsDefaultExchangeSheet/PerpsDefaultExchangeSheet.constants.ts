import hyperliquidLogo from './assets/hyperliquid.png';
import lighterLogo from './assets/lighter.png';
import type { PerpsDefaultExchangeOption } from './PerpsDefaultExchangeSheet.types';

/**
 * Sample exchanges for Storybook, matching the Default exchange frame.
 */
export const PERPS_DEFAULT_EXCHANGE_STORY_OPTIONS: PerpsDefaultExchangeOption[] =
  [
    {
      id: 'lighter',
      name: 'Lighter',
      logoSource: lighterLogo,
      maxLeverage: '50',
      makerFee: '0.103%',
      takerFee: '0.103%',
      openInterest: '$747.9M',
    },
    {
      id: 'hyperliquid',
      name: 'Hyperliquid',
      logoSource: hyperliquidLogo,
      maxLeverage: '50',
      makerFee: '0.113%',
      takerFee: '0.143%',
      openInterest: '$7.48B',
    },
  ];

export const PERPS_DEFAULT_EXCHANGE_STORY_SELECTED_ID = 'hyperliquid';
