import React, { useState, useCallback } from 'react';
import { Keyboard, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Box } from '@metamask/design-system-react-native';
import ExploreSearchBar from '../../components/ExploreSearchBar/ExploreSearchBar';
import ExploreSearchResults from '../../components/ExploreSearchResults/ExploreSearchResults';
import { PerpsStreamProvider } from '../../../../UI/Perps/providers/PerpsStreamManager';
import { PerpsConnectionProvider } from '../../../../UI/Perps/providers/PerpsConnectionProvider';

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
        />
      </Box>

      <PerpsConnectionProvider>
        <PerpsStreamProvider>
          <ExploreSearchResults searchQuery={searchQuery} />
        </PerpsStreamProvider>
      </PerpsConnectionProvider>
    </Box>
  );
};

export default ExploreSearchScreen;
