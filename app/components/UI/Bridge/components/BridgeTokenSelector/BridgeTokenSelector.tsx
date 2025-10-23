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

const createStyles = () => StyleSheet.create({
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
  });

export const BridgeTokenSelector: React.FC = () => {
  const navigation = useNavigation();
  const sheetRef = useRef<BottomSheetRef>(null);
  const { styles } = useStyles(createStyles, {});
  const [selectedChainId, setSelectedChainId] = useState<
    Hex | CaipChainId | undefined
  >(undefined);

  const handleClose = () => {
    navigation.goBack();
  };

  const handleChainSelect = (chainId?: Hex | CaipChainId) => {
    setSelectedChainId(chainId);
    // TODO: Implement token filtering based on selected chain
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
