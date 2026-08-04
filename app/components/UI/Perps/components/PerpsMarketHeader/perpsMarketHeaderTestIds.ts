import {
  PerpsMarketDetailsViewSelectorsIDs,
  PerpsMarketHeaderSelectorsIDs,
  PerpsProMarketViewSelectorsIDs,
} from '../../Perps.testIds';
import type { PerpsMarketHeaderTestIDs } from './PerpsMarketHeader.types';

export const createProMarketHeaderTestIDs = (): PerpsMarketHeaderTestIDs => ({
  container: PerpsProMarketViewSelectorsIDs.HEADER,
  backButton: PerpsProMarketViewSelectorsIDs.HEADER_BACK_BUTTON,
  assetIcon: PerpsProMarketViewSelectorsIDs.HEADER_ASSET_ICON,
  assetName: PerpsProMarketViewSelectorsIDs.HEADER_SYMBOL,
  subtitle: PerpsProMarketViewSelectorsIDs.HEADER_SUBTITLE,
  marketListButton: PerpsProMarketViewSelectorsIDs.HEADER_MARKET_LIST_BUTTON,
  headerPrice: PerpsProMarketViewSelectorsIDs.HEADER_PRICE,
  headerPriceChange: PerpsProMarketViewSelectorsIDs.HEADER_PRICE_CHANGE,
  walletButton: PerpsProMarketViewSelectorsIDs.HEADER_WALLET_BUTTON,
  favoriteButton: PerpsProMarketViewSelectorsIDs.HEADER_FAVORITE_BUTTON,
});

export const createLiteMarketHeaderTestIDs = (): PerpsMarketHeaderTestIDs => ({
  container: PerpsMarketDetailsViewSelectorsIDs.HEADER,
  backButton: PerpsMarketHeaderSelectorsIDs.BACK_BUTTON,
  assetIcon: PerpsMarketHeaderSelectorsIDs.ASSET_ICON,
  assetName: PerpsMarketHeaderSelectorsIDs.ASSET_NAME,
  subtitle: PerpsMarketHeaderSelectorsIDs.SUBTITLE,
  marketListButton: PerpsMarketHeaderSelectorsIDs.MARKET_LIST_BUTTON,
  headerPrice: PerpsMarketHeaderSelectorsIDs.PRICE,
  headerPriceChange: PerpsMarketHeaderSelectorsIDs.PRICE_CHANGE,
  favoriteButton: PerpsMarketHeaderSelectorsIDs.FAVORITE_BUTTON,
});
