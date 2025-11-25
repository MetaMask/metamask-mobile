import React, { useCallback, useState, useMemo } from 'react';
import { FlatList, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
// eslint-disable-next-line no-duplicate-imports
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import {
  Box,
  Icon,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSitesData } from '../../UI/Sites/hooks/useSiteData/useSitesData';
import SiteRowItemWrapper from '../../UI/Sites/components/SiteRowItemWrapper/SiteRowItemWrapper';
import SiteSkeleton from '../../UI/Sites/components/SiteSkeleton/SiteSkeleton';
import type { SiteData } from '../../UI/Sites/components/SiteRowItem/SiteRowItem';
import HeaderBase, {
  HeaderBaseVariant,
} from '../../../component-library/components/HeaderBase';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../component-library/components/Buttons/ButtonIcon';
import { IconName as IconNameType } from '../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { strings } from '../../../../locales/i18n';
import ExploreSearchBar from '../TrendingView/ExploreSearchBar/ExploreSearchBar';

function looksLikeUrl(str: string): boolean {
  return /^(https?:\/\/)?[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+([/?].*)?$/.test(str);
}

const SitesFullView: React.FC = () => {
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
                variant={TextVariant.BodyMD}
                color={TextColor.Primary}
                numberOfLines={1}
              >
                {searchQuery}
              </Text>
            </Box>
            <Box twClassName="ml-3">
              <Icon name={IconName.Arrow2UpRight} size={IconSize.Md} />
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
            <Text variant={TextVariant.BodyMD} color={TextColor.Primary}>
              Search for {'"'}
            </Text>
            <Text
              variant={TextVariant.BodyMD}
              color={TextColor.Primary}
              numberOfLines={1}
              style={tw.style('shrink')}
            >
              {searchQuery}
            </Text>
            <Text variant={TextVariant.BodyMD} color={TextColor.Primary}>
              {'"'} on Google
            </Text>
          </Box>
          <Box twClassName="ml-3">
            <Icon name={IconName.Arrow2UpRight} size={IconSize.Md} />
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
            placeholder={strings('trending.search_sites')}
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
            style={tw.style('flex-row items-center gap-1')}
          >
            <Text variant={TextVariant.HeadingLG} color={TextColor.Default}>
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
            ListFooterComponent={renderFooter}
          />
        )}
      </Box>
    </Box>
  );
};

export default SitesFullView;
