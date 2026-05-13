import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Box } from '@metamask/design-system-react-native';
import type { ListRenderItem } from '@shopify/flash-list';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import type { SiteData } from '../../../UI/Sites/components/SiteRowItem/SiteRowItem';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import SiteTileRowItem from '../feeds/dapps/SiteTileRowItem';
import SiteTileSkeleton from '../feeds/dapps/SiteTileSkeleton';
import { useFavoritesFeed } from '../feeds/dapps/useFavoritesFeed';
import { useNetworksFeed } from '../feeds/dapps/useNetworksFeed';
import { useRecentsFeed } from '../feeds/dapps/useRecentsFeed';
import { FavoriteSiteRowItem, SiteRowItem } from '../feeds/sites/SiteRowItem';
import SiteSkeleton from '../../../UI/Sites/components/SiteSkeleton/SiteSkeleton';
import { useSitesFeed } from '../feeds/sites/useSitesFeed';
import CardList from '../components/CardList';
import ExploreScroll from '../components/ExploreScroll';
import SectionHeader from '../components/SectionHeader';
import TileCarousel from '../components/TileCarousel';
import type { TabProps } from '../hooks/useExploreRefresh';
import { trackExploreInteracted } from '../search/analytics';

const DappsTab: React.FC<TabProps> = ({ refresh, refreshing, onRefresh }) => {
  const navigation = useNavigation<AppNavigationProp>();

  const recents = useRecentsFeed({ refresh });
  const favorites = useFavoritesFeed({ refresh });
  const networks = useNetworksFeed();
  const sites = useSitesFeed({ refresh });

  const renderFavorite: ListRenderItem<SiteData> = useCallback(
    ({ item, index }) => (
      <FavoriteSiteRowItem
        site={item}
        onCardPress={() =>
          trackExploreInteracted({
            interaction_type: 'section_item_tapped',
            tab_name: 'Sites',
            section_name: 'sites_favorites',
            asset_type: 'dapp',
            position: index,
            item_clicked: item.url,
          })
        }
      />
    ),
    [],
  );

  const renderSite: ListRenderItem<SiteData> = useCallback(
    ({ item, index }) => (
      <SiteRowItem
        site={item}
        onCardPress={() =>
          trackExploreInteracted({
            interaction_type: 'section_item_tapped',
            tab_name: 'Sites',
            section_name: 'sites_popular',
            asset_type: 'dapp',
            position: index,
            item_clicked: item.url,
          })
        }
      />
    ),
    [],
  );

  const showRecents = recents.isLoading || recents.data.length > 0;
  const showFavorites = favorites.isLoading || favorites.data.length > 0;
  const showSites = sites.isLoading || sites.data.length > 0;

  return (
    <ExploreScroll refreshing={refreshing} onRefresh={onRefresh}>
      {showRecents && (
        <Box>
          <SectionHeader
            title={strings('autocomplete.recents')}
            testID="section-header-view-all-dapps_recents"
          />
          <TileCarousel<SiteData>
            data={recents.data}
            isLoading={recents.isLoading}
            renderItem={(site, index) => (
              <SiteTileRowItem
                site={site}
                onCardPress={() =>
                  trackExploreInteracted({
                    interaction_type: 'section_item_tapped',
                    tab_name: 'Sites',
                    section_name: 'sites_recents',
                    asset_type: 'dapp',
                    position: index,
                    item_clicked: site.url,
                  })
                }
              />
            )}
            keyExtractor={(site) => site.url}
            Skeleton={SiteTileSkeleton}
            compactSectionTail
            testID="explore-dapps_recents-carousel"
          />
        </Box>
      )}

      {showFavorites && (
        <Box>
          <SectionHeader
            title={strings('autocomplete.favorites')}
            onViewAll={() =>
              navigation.navigate(Routes.SITES_FULL_VIEW, { mode: 'favorites' })
            }
            testID="section-header-view-all-dapps_favorites"
            tabName="Sites"
            sectionName="sites_favorites"
          />
          <CardList<SiteData>
            data={favorites.data}
            isLoading={favorites.isLoading}
            renderItem={renderFavorite}
            Skeleton={SiteSkeleton}
            idPrefix="dapps_favorites"
          />
        </Box>
      )}

      <Box>
        <SectionHeader
          title={strings('trending.ecosystems')}
          subtitle={strings('trending.ecosystems_subtitle')}
          testID="section-header-view-all-dapps_networks"
        />
        <TileCarousel<SiteData>
          data={networks.data}
          isLoading={false}
          renderItem={(site, index) => (
            <SiteTileRowItem
              site={site}
              onCardPress={() =>
                trackExploreInteracted({
                  interaction_type: 'section_item_tapped',
                  tab_name: 'Sites',
                  section_name: 'sites_ecosystems',
                  asset_type: 'dapp',
                  position: index,
                  item_clicked: site.url,
                })
              }
            />
          )}
          keyExtractor={(site) => site.url}
          Skeleton={SiteTileSkeleton}
          testID="explore-dapps_networks-carousel"
        />
      </Box>

      {showSites && (
        <Box>
          <SectionHeader
            title={strings('trending.popular')}
            onViewAll={() => navigation.navigate(Routes.SITES_FULL_VIEW)}
            testID="section-header-view-all-sites"
            tabName="Sites"
            sectionName="sites_popular"
          />
          <CardList<SiteData>
            data={sites.data}
            isLoading={sites.isLoading}
            renderItem={renderSite}
            Skeleton={SiteSkeleton}
            idPrefix="sites"
          />
        </Box>
      )}
    </ExploreScroll>
  );
};

export default DappsTab;
