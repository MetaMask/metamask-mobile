import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import BottomSheetHeader from '../../../../component-library/components/BottomSheets/BottomSheetHeader';
import BottomSheet from '../../../../component-library/components/BottomSheets/BottomSheet';
import { strings } from '../../../../../locales/i18n';
import { ButtonIconSizes } from '../../../../component-library/components/Buttons/ButtonIcon';
import { useNavigation } from '@react-navigation/native';

const styles = StyleSheet.create({
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
});

interface BridgeNetworkSelectorBaseProps {
  children: React.ReactNode;
}

export const BridgeNetworkSelectorBase: React.FC<
  BridgeNetworkSelectorBaseProps
> = ({ children }) => {
  const navigation = useNavigation();

  return (
    <BottomSheet isFullscreen>
      <BottomSheetHeader
        onClose={() => navigation.goBack()}
        closeButtonProps={{
          testID: 'bridge-network-selector-close-button',
          size: ButtonIconSizes.Lg,
        }}
      >
        <Text variant={TextVariant.HeadingMD} style={styles.headerTitle}>
          {strings('bridge.select_network')}
        </Text>
      </BottomSheetHeader>

      <ScrollView>{children}</ScrollView>
    </BottomSheet>
  );
};
