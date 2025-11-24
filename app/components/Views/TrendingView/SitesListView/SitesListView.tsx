import React, { useCallback, useState, useMemo } from 'react';
import { FlatList, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
// eslint-disable-next-line no-duplicate-imports
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import {
  Box,
  Text,
  TextVariant,
  Icon,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSitesData } from '../SectionSites/hooks/useSitesData';
import SiteRowItemWrapper from '../SectionSites/SiteRowItemWrapper';
import SiteSkeleton from '../SectionSites/SiteSkeleton/SiteSkeleton';
import type { SiteData } from '../SectionSites/SiteRowItem/SiteRowItem';
import HeaderBase, {
  HeaderBaseVariant,
} from '../../../../component-library/components/HeaderBase';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../component-library/components/Buttons/ButtonIcon';
import { IconName as IconNameType } from '../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../locales/i18n';
import ExploreSearchBar from '../ExploreSearchBar/ExploreSearchBar';

function looksLikeUrl(str: string): boolean {
  return /^(https?:\/\/)?[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+([/?].*)?$/.test(str);
}

const SitesListView: React.FC = () => {
  const tw = useTailwind();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);

  // Fetch all sites (no limit)
  const { sites, isLoading } = useSitesData({ limit: 100 });

  // Filter sites based on search query
  const filteredSites = useMemo(() => {
    if (!searchQuery.trim()) {
      return sites;
    }

    const query = searchQuery.toLowerCase();
    return sites.filter(
      (site) =>
        site.name.toLowerCase().includes(query) ||
        site.displayUrl.toLowerCase().includes(query) ||
        site.url.toLowerCase().includes(query),
    );
  }, [sites, searchQuery]);

  const handleBackPress = useCallback(() => {
    if (isSearchActive) {
      setIsSearchActive(false);
      setSearchQuery('');
    } else {
      navigation.goBack();
    }
  }, [navigation, isSearchActive]);

  const handleSearchPress = useCallback(() => {
    setIsSearchActive(true);
  }, []);

  const handleCancelSearch = useCallback(() => {
    setIsSearchActive(false);
    setSearchQuery('');
  }, []);

  const handlePressFooterLink = useCallback(
    (url: string) => {
      navigation.navigate('TrendingBrowser', {
        newTabUrl: url,
        timestamp: Date.now(),
        fromTrending: true,
      });
    },
    [navigation],
  );

  const renderSiteItem = ({ item }: { item: SiteData }) => (
    <SiteRowItemWrapper site={item} navigation={navigation} isViewAll />
  );

  const renderSkeleton = () => (
    <>
      {[...Array(10)].map((_, index) => (
        <SiteSkeleton key={`skeleton-${index}`} isViewAll />
      ))}
    </>
  );

  const renderFooter = useMemo(() => {
    if (!isSearchActive || searchQuery.length === 0) return null;

    const isUrl = looksLikeUrl(searchQuery.toLowerCase());
    const urlWithProtocol =
      isUrl && !searchQuery.startsWith('http')
        ? `https://${searchQuery}`
        : searchQuery;

    return (
      <Box>
        {isUrl && (
          <TouchableOpacity
            style={tw.style('flex-row items-center py-4 px-4')}
            onPress={() => handlePressFooterLink(urlWithProtocol)}
            testID="url-item"
          >
            <Box twClassName="flex-1">
              <Text
                variant={TextVariant.BodyMd}
                twClassName="text-primary"
                numberOfLines={1}
              >
                {searchQuery}
              </Text>
            </Box>
            <Box twClassName="ml-3">
              <Icon
                name={IconName.Arrow2UpRight}
                size={IconSize.Md}
                twClassName="text-primary"
              />
            </Box>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={tw.style('flex-row items-center py-4 px-4')}
          onPress={() =>
            handlePressFooterLink(
              `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`,
            )
          }
          testID="search-on-google-button"
        >
          <Box twClassName="flex-1 flex-row items-center">
            <Text
              variant={TextVariant.BodyMd}
              twClassName="text-primary shrink-0"
            >
              Search for {'"'}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              twClassName="text-primary shrink"
              numberOfLines={1}
            >
              {searchQuery}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              twClassName="text-primary shrink-0"
            >
              {'"'} on Google
            </Text>
          </Box>
          <Box twClassName="ml-3">
            <Icon
              name={IconName.Arrow2UpRight}
              size={IconSize.Md}
              twClassName="text-primary"
            />
          </Box>
        </TouchableOpacity>
      </Box>
    );
  }, [isSearchActive, searchQuery, handlePressFooterLink, tw]);

  return (
    <Box twClassName="flex-1 bg-default" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <Box twClassName="px-4 pt-4 pb-2">
        {isSearchActive ? (
          <ExploreSearchBar
            type="interactive"
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onCancel={handleCancelSearch}
          />
        ) : (
          <HeaderBase
            variant={HeaderBaseVariant.Display}
            startAccessory={
              <ButtonIcon
                size={ButtonIconSizes.Lg}
                onPress={handleBackPress}
                iconName={IconNameType.ArrowLeft}
                testID="back-button"
              />
            }
            endAccessory={
              <ButtonIcon
                size={ButtonIconSizes.Lg}
                onPress={handleSearchPress}
                iconName={IconNameType.Search}
                testID="search-button"
              />
            }
          >
            <Text variant={TextVariant.HeadingMd}>
              {strings('trending.popular_sites')}
            </Text>
          </HeaderBase>
        )}
      </Box>

      {/* Sites List */}
      <Box twClassName="flex-1">
        {isLoading ? (
          renderSkeleton()
        ) : (
          <FlatList
            data={filteredSites}
            renderItem={renderSiteItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={tw.style('pb-4')}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              !searchQuery.trim() ? (
                <Box twClassName="px-2 py-8 items-center">
                  <Text
                    variant={TextVariant.BodyMd}
                    twClassName="text-alternative"
                  >
                    {strings('trending.no_sites_found')}
                  </Text>
                </Box>
              ) : null
            }
            ListFooterComponent={renderFooter}
          />
        )}
      </Box>
    </Box>
  );
};

export default SitesListView;
