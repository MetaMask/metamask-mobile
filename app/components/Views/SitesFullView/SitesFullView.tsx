import React, { useCallback, useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
// eslint-disable-next-line no-duplicate-imports
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useAppThemeFromContext, useTheme } from '../../../util/theme';
import { Theme } from '../../../util/theme/models';
import { useSitesData } from '../../UI/Sites/hooks/useSiteData/useSitesData';
import SitesList from '../../UI/Sites/components/SitesList/SitesList';
import SiteSkeleton from '../../UI/Sites/components/SiteSkeleton/SiteSkeleton';
import SitesSearchFooter from '../../UI/Sites/components/SitesSearchFooter/SitesSearchFooter';
import { strings } from '../../../../locales/i18n';
import HeaderCenter from '../../../component-library/components-temp/HeaderCenter';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../component-library/components/Icons/Icon';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  IconName as DSIconName,
} from '@metamask/design-system-react-native';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background.default,
    },
    headerContainer: {
      backgroundColor: theme.colors.background.default,
    },
    searchHeaderContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: theme.colors.background.default,
    },
    searchBarContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background.muted,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: Platform.OS === 'ios' ? 12 : 4,
      marginRight: 8,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: theme.colors.text.default,
      marginLeft: 8,
    },
    listContainer: {
      flex: 1,
      paddingLeft: 16,
      paddingRight: 16,
    },
  });

const SitesFullView: React.FC = () => {
  const theme = useAppThemeFromContext();
  const { colors } = useTheme();
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
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <View
        style={[
          styles.headerContainer,
          {
            paddingTop: insets.top,
          },
        ]}
      >
        {isSearchActive ? (
          <View
            style={styles.searchHeaderContainer}
            testID="sites-full-view-search-header"
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              style={styles.searchBarContainer}
            >
              <Icon
                name={IconName.Search}
                size={IconSize.Sm}
                color={IconColor.Alternative}
              />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={strings('trending.search_sites')}
                placeholderTextColor={colors.text.muted}
                autoFocus
                style={styles.searchInput}
                testID="sites-full-view-search-input"
              />
            </Box>
            <TouchableOpacity
              onPress={handleSearchToggle}
              testID="sites-full-view-search-cancel"
            >
              <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
                {strings('browser.cancel')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <HeaderCenter
            title={strings('trending.popular_sites')}
            onBack={handleBackPress}
            endButtonIconProps={[
              {
                iconName: DSIconName.Search,
                onPress: handleSearchToggle,
                testID: 'sites-full-view-search-toggle',
              },
            ]}
            testID="sites-full-view-header"
          />
        )}
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
