import React, { useCallback, useState, useMemo } from 'react';
import { StyleSheet, View, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
// eslint-disable-next-line no-duplicate-imports
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useAppThemeFromContext } from '../../../util/theme';
import { Theme } from '../../../util/theme/models';
import { useSitesData } from '../../UI/Sites/hooks/useSiteData/useSitesData';
import SitesList from '../../UI/Sites/components/SitesList/SitesList';
import SiteSkeleton from '../../UI/Sites/components/SiteSkeleton/SiteSkeleton';
import SitesSearchFooter from '../../UI/Sites/components/SitesSearchFooter/SitesSearchFooter';
import { strings } from '../../../../locales/i18n';
import ListHeaderWithSearch from '../../UI/shared/ListHeaderWithSearch/ListHeaderWithSearch';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background.default,
      paddingBottom: 16,
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
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch all sites (no limit)
  const {
    sites,
    isLoading,
    refetch: refetchSites,
  } = useSitesData(searchQuery, 100);

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleSearchToggle = useCallback(() => {
    setIsSearchActive((prev) => {
      if (prev) {
        // Closing search, clear the query
        setSearchQuery('');
      }
      return !prev;
    });
  }, []);

  // Handle pull-to-refresh
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
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <View
        style={[
          styles.headerContainer,
          {
            paddingTop: insets.top,
          },
        ]}
      >
        <ListHeaderWithSearch
          defaultTitle={strings('trending.popular_sites')}
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
            sites={sites}
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
