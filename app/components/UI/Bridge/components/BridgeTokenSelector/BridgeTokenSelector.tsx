import React, { useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../locales/i18n';
import { ScrollView } from 'react-native-gesture-handler';
import { NetworkPills } from './NetworkPills';
import { Hex, CaipChainId } from '@metamask/utils';
import { useStyles } from '../../../../../component-library/hooks';
import TextFieldSearch from '../../../../../component-library/components/Form/TextFieldSearch';
import { Theme } from '../../../../../util/theme/models';

const createStyles = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    scrollView: {
      flexGrow: 0,
    },
    contentContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    buttonContainer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    searchInput: {
      marginVertical: 12,
      marginHorizontal: 8,
      borderRadius: 12,
      borderWidth: 0,
      backgroundColor: theme.colors.background.section,
    },
  });
};

export const BridgeTokenSelector: React.FC = () => {
  const navigation = useNavigation();
  const sheetRef = useRef<BottomSheetRef>(null);
  const { styles } = useStyles(createStyles, {});
  const [selectedChainId, setSelectedChainId] = useState<
    Hex | CaipChainId | undefined
  >(undefined);
  const [searchString, setSearchString] = useState<string>('');

  const handleClose = () => {
    navigation.goBack();
  };

  const handleChainSelect = (chainId?: Hex | CaipChainId) => {
    setSelectedChainId(chainId);
    // TODO: Implement token filtering based on selected chain
  };

  const handleSearchTextChange = (text: string) => {
    setSearchString(text);
    // TODO: Implement token search functionality
  };

  return (
    <BottomSheet ref={sheetRef}>
      <BottomSheetHeader onClose={handleClose}>
        <Text variant={TextVariant.HeadingMD}>
          {strings('bridge.select_token')}
        </Text>
      </BottomSheetHeader>

      <NetworkPills
        selectedChainId={selectedChainId}
        onChainSelect={handleChainSelect}
      />

      <TextFieldSearch
        value={searchString}
        onChangeText={handleSearchTextChange}
        placeholder={strings('swaps.search_token')}
        testID="bridge-token-search-input"
        style={styles.searchInput}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Token list will be implemented here */}
      </ScrollView>
    </BottomSheet>
  );
};
