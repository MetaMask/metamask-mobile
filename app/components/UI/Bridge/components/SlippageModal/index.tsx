import React, { useRef, useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import createStyles from './SlippageModal.styles';
import { SlippageOption } from './SlippageModal.types';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import BottomSheetFooter from '../../../../../component-library/components/BottomSheets/BottomSheetFooter';
import SegmentedControl from '../../../../../component-library/components-temp/SegmentedControl';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectSlippage,
  setSlippage,
} from '../../../../../core/redux/slices/bridge';

const SLIPPAGE_OPTIONS: SlippageOption[] = [
  { label: '0.5%', value: '0.5' },
  { label: '1%', value: '1' },
  { label: '3%', value: '3' },
  { label: '10%', value: '10' },
];

export const SlippageModal = () => {
  const dispatch = useDispatch();

  const slippage = useSelector(selectSlippage);
  const [selectedValue, setSelectedValue] = useState(slippage || '');
  const theme = useTheme();
  const styles = createStyles(theme);
  const navigation = useNavigation();
  const sheetRef = useRef<BottomSheetRef>(null);

  const handleOptionSelected = (option: string) => {
    setSelectedValue(option);
  };

  const handleApply = () => {
    dispatch(setSlippage(selectedValue));
    navigation.goBack();
  };

  const handleClose = () => {
    navigation.goBack();
  };

  return (
    <BottomSheet ref={sheetRef}>
      <BottomSheetHeader onClose={handleClose}>
        <Text variant={TextVariant.HeadingMD}>
          {strings('bridge.slippage')}
        </Text>
      </BottomSheetHeader>
      <View style={styles.container}>
        <Text style={styles.description}>
          {strings('bridge.slippage_info')}
        </Text>

        <View style={styles.optionsContainer}>
          <SegmentedControl
            options={SLIPPAGE_OPTIONS.map((option) => ({
              label: option.label,
              value: option.value,
              testID: `slippage-option-${option.value}`,
              buttonWidth: ButtonWidthTypes.Full,
            }))}
            selectedValue={selectedValue}
            onValueChange={handleOptionSelected}
            size={ButtonSize.Sm}
            isButtonWidthFlexible={false}
            style={styles.segmentedControl}
          />
        </View>
        <BottomSheetFooter
          buttonPropsArray={[
            {
              variant: ButtonVariants.Secondary,
              label: strings('bridge.apply'),
              onPress: handleApply,
              size: ButtonSize.Lg,
            },
          ]}
        />
      </View>
    </BottomSheet>
  );
};

export default SlippageModal;
