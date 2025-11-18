import React, { useState, useMemo, useCallback } from 'react';
import { FlatList, Keyboard } from 'react-native';
import { useNavigation } from '@react-navigation/native';
// eslint-disable-next-line no-duplicate-imports
import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSitesData } from '../SectionSites/hooks/useSitesData';
import SiteRowItemWrapper from '../SectionSites/SiteRowItemWrapper';
import SiteSkeleton from '../SectionSites/SiteSkeleton/SiteSkeleton';
import ExploreSearchBar from '../ExploreSearchBar/ExploreSearchBar';
import type { SiteData } from '../SectionSites/SiteRowItem/SiteRowItem';

const SitesListView: React.FC = () => {
  const tw = useTailwind();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleSearchCancel = useCallback(() => {
    setSearchQuery('');
    Keyboard.dismiss();
    navigation.goBack();
  }, [navigation]);

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

  return (
    <Box twClassName="flex-1 bg-default" style={{ paddingTop: insets.top }}>
      {/* Search Bar */}
      <Box twClassName="px-4 pb-3">
        <ExploreSearchBar
          type="interactive"
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onCancel={handleSearchCancel}
        />
      </Box>

      {/* Sites List */}
      <Box twClassName="flex-1">
        <Box twClassName="px-4 py-3">
          <Text variant={TextVariant.HeadingLg}>Popular sites</Text>
        </Box>

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
              <Box twClassName="px-2 py-8 items-center">
                <Text
                  variant={TextVariant.BodyMd}
                  twClassName="text-alternative"
                >
                  No sites found
                </Text>
              </Box>
            }
          />
        )}
      </Box>
    </Box>
  );
};

export default SitesListView;
