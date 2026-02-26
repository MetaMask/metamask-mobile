import React, { useState, useCallback } from 'react';
import { Keyboard, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useNavigation,
  NavigationProp,
  ParamListBase,
} from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
import ExploreSearchBar from '../../components/ExploreSearchBar/ExploreSearchBar';
import ExploreSearchResults from '../../components/ExploreSearchResults/ExploreSearchResults';
import { PerpsStreamProvider } from '../../../../UI/Perps/providers/PerpsStreamManager';
import { PerpsConnectionProvider } from '../../../../UI/Perps/providers/PerpsConnectionProvider';
import {
  looksLikeUrl,
  getSearchUrl,
  navigateToBrowser,
} from '../../../../UI/Sites/utils/search';
import { selectSearchEngine } from '../../../../../reducers/browser/selectors';

const ExploreSearchScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [searchQuery, setSearchQuery] = useState('');
  const searchEngine = useSelector(selectSearchEngine);

  const handleSearchCancel = useCallback(() => {
    setSearchQuery('');
    Keyboard.dismiss();
    navigation.goBack();
  }, [navigation]);

  const handleSearchSubmit = useCallback(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    const url = looksLikeUrl(trimmed.toLowerCase())
      ? trimmed
      : getSearchUrl(trimmed, searchEngine);
    navigateToBrowser(navigation, url);
  }, [searchQuery, searchEngine, navigation]);

  return (
    <Box
      style={{ paddingTop: insets.top + (Platform.OS === 'android' ? 16 : 0) }}
      twClassName="flex-1 bg-default"
    >
      <Box twClassName="px-4 pb-3">
        <ExploreSearchBar
          type="interactive"
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onCancel={handleSearchCancel}
          onSubmit={handleSearchSubmit}
        />
      </Box>

      <PerpsConnectionProvider suppressErrorView>
        <PerpsStreamProvider>
          <ExploreSearchResults searchQuery={searchQuery} />
        </PerpsStreamProvider>
      </PerpsConnectionProvider>
    </Box>
  );
};

export default ExploreSearchScreen;
