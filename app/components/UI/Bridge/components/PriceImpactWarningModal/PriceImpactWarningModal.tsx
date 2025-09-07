import React, { useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../locales/i18n';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { View } from 'react-native';
import { useStyles } from '../../../../../component-library/hooks';
import createStyles from './PriceImpactWarningModal.styles';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootParamList } from '../../../../../util/navigation/types';

type PriceImpactWarningModalProps = StackScreenProps<
  RootParamList,
  'PriceImpactWarningModal'
>;

const PriceImpactWarningModal = ({ route }: PriceImpactWarningModalProps) => {
  const navigation = useNavigation();
  const sheetRef = useRef<BottomSheetRef>(null);
  const { styles } = useStyles(createStyles, {});

  const { isGasIncluded } = route.params;

  const handleClose = () => {
    navigation.goBack();
  };

  return (
    <BottomSheet ref={sheetRef}>
      <BottomSheetHeader onClose={handleClose}>
        <Text variant={TextVariant.HeadingMD}>
          {strings('bridge.price_impact_warning_title')}
        </Text>
      </BottomSheetHeader>
      <View style={styles.container}>
        <Text variant={TextVariant.BodyMD}>
          {isGasIncluded
            ? strings('bridge.price_impact_gasless_warning')
            : strings('bridge.price_impact_normal_warning')}
        </Text>
      </View>
    </BottomSheet>
  );
};

export default PriceImpactWarningModal;
