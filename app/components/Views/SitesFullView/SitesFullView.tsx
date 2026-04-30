import React, { useCallback, useState, useMemo } from 'react';
import { Platform, StyleSheet, View, RefreshControl } from 'react-native';
import { useDispatch } from 'react-redux';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useAppThemeFromContext } from '../../../util/theme';
import { Theme } from '../../../util/theme/models';
import { useSitesData } from '../../UI/Sites/hooks/useSiteData/useSitesData';
import { useBrowserFavoritesSites } from '../../UI/Sites/hooks/useBrowserFavoritesSites/useBrowserFavoritesSites';
import SitesList from '../../UI/Sites/components/SitesList/SitesList';
import SiteSkeleton from '../../UI/Sites/components/SiteSkeleton/SiteSkeleton';
import SitesSearchFooter from '../../UI/Sites/components/SitesSearchFooter/SitesSearchFooter';
import { removeBookmark } from '../../../actions/bookmarks';
import {
  bookmarkUrlForRemoval,
  type SiteData,
} from '../../UI/Sites/components/SiteRowItem/SiteRowItem';
import { strings } from '../../../../locales/i18n';
import ListHeaderWithSearch from '../../UI/shared/ListHeaderWithSearch/ListHeaderWithSearch';

type SitesFullViewParams = { mode?: 'favorites' } | undefined;

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background.default,
    },
    headerContainer: {
      backgroundColor: theme.colors.background.default,
    },
    listContainer: {
      flex: 1,
      paddingLeft: 16,
      paddingRight: 16,
    },
  });

const SitesFullView: React.FC = () => {
  const theme = useAppThemeFromContext();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<{ params: SitesFullViewParams }, 'params'>>();
  const isFavorites = route.params?.mode === 'favorites';

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Always call both hooks unconditionally (Rules of Hooks).
  // useSitesData has a module-level cache so the API is only called once.
  const {
    sites: popularSites,
    isLoading: popularLoading,
    refetch: popularRefetch,
  } = useSitesData(isFavorites ? '' : searchQuery);
  const {
    data: favoriteSites,
    isLoading: favoritesLoading,
    refetch: favoritesRefetch,
  } = useBrowserFavoritesSites(isFavorites ? searchQuery : '');

  const sites = isFavorites ? favoriteSites : popularSites;
  const isLoading = isFavorites ? favoritesLoading : popularLoading;
  const refetchSites = isFavorites ? favoritesRefetch : popularRefetch;
  const title = isFavorites
    ? strings('autocomplete.favorites')
    : strings('trending.popular_sites');

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleSearchToggle = useCallback(() => {
    setIsSearchActive((prev) => {
      if (prev) setSearchQuery('');
      return !prev;
    });
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      refetchSites?.();
    } catch (error) {
      console.warn('Failed to refresh sites:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refetchSites]);

  const renderSkeleton = () => (
    <>
      {[...Array(15)].map((_, index) => (
        <SiteSkeleton key={`skeleton-${index}`} />
      ))}
    </>
  );

  const renderFooter = useMemo(() => {
    if (!isSearchActive) return null;
    return <SitesSearchFooter searchQuery={searchQuery} />;
  }, [isSearchActive, searchQuery]);

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={
        Platform.OS === 'ios' ? ['left', 'right'] : ['left', 'right', 'bottom']
      }
    >
      <View
        style={[
          styles.headerContainer,
          {
            paddingTop: insets.top,
          },
        ]}
      >
        <ListHeaderWithSearch
          defaultTitle={title}
          isSearchVisible={isSearchActive}
          searchQuery={searchQuery}
          searchPlaceholder={strings('trending.search_sites')}
          cancelText={strings('browser.cancel')}
          onSearchQueryChange={setSearchQuery}
          onBack={handleBackPress}
          onSearchToggle={handleSearchToggle}
          testID="sites-full-view-header"
        />
      </View>

      {isLoading ? (
        <View style={styles.listContainer}>{renderSkeleton()}</View>
      ) : (
        <View style={styles.listContainer}>
          <SitesList
            key={searchQuery ? 'filtered' : 'all'}
            sites={sites}
            onRemoveFavorite={
              isFavorites
                ? (site: SiteData) =>
                    dispatch(
                      removeBookmark({
                        url: bookmarkUrlForRemoval(site),
                        name: site.name,
                      }),
                    )
                : undefined
            }
            refreshControl={
              <RefreshControl
                colors={[theme.colors.primary.default]}
                tintColor={theme.colors.icon.default}
                refreshing={refreshing}
                onRefresh={handleRefresh}
              />
            }
            ListFooterComponent={renderFooter}
          />
        </View>
      )}
    </SafeAreaView>
  );
};

SitesFullView.displayName = 'SitesFullView';

export default SitesFullView;
