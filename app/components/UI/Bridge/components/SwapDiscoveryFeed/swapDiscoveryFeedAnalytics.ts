import type { TrendingAsset } from '@metamask/assets-controllers';
import { getCaipChainIdFromAssetId } from '../../../Trending/components/TrendingTokenRowItem/utils';
import {
  trackExploreInteracted,
  type ExploreSectionName,
} from '../../../../Views/TrendingView/search/analytics';

export const SWAP_DISCOVERY_SOURCE = 'swaps';

export const trackDiscoverySeeAll = (sectionName: ExploreSectionName): void => {
  trackExploreInteracted({
    interaction_type: 'section_see_all_tapped',
    section_name: sectionName,
    source: SWAP_DISCOVERY_SOURCE,
  });
};

export const trackDiscoveryItemTap = ({
  sectionName,
  assetType,
  index,
  token,
}: {
  sectionName: ExploreSectionName;
  assetType: 'token' | 'stock';
  index: number;
  token: TrendingAsset;
}): void => {
  trackExploreInteracted({
    interaction_type: 'section_item_tapped',
    section_name: sectionName,
    asset_type: assetType,
    position: index,
    token_symbol: token.symbol,
    chain_id: getCaipChainIdFromAssetId(token.assetId),
    item_clicked: token.assetId,
    source: SWAP_DISCOVERY_SOURCE,
  });
};
