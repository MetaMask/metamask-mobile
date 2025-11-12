import React, { useState, useCallback } from 'react';
import { Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Box } from '@metamask/design-system-react-native';
import ExploreSearchBar from '../ExploreSearchBar/ExploreSearchBar';
import ExploreSearchResults from '../ExploreSearchResults/ExploreSearchResults';

const ExploreSearchScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchCancel = useCallback(() => {
    setSearchQuery('');
    Keyboard.dismiss();
    navigation.goBack();
  }, [navigation]);

  return (
    <Box style={{ paddingTop: insets.top }} twClassName="flex-1 bg-default">
      <ExploreSearchBar
        type="interactive"
        isSearchFocused
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onCancel={handleSearchCancel}
      />

      <ExploreSearchResults searchQuery={searchQuery} />
    </Box>
  );
};

export default ExploreSearchScreen;
