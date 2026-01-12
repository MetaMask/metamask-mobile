import React, { useRef, useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStyles } from '../../../../../component-library/hooks';
import { strings } from '../../../../../../locales/i18n';
import Text, {
  TextVariant,
  TextColor,
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
import HeaderCenter from '../../../../../component-library/components-temp/HeaderCenter';
import BottomSheetFooter from '../../../../../component-library/components/BottomSheets/BottomSheetFooter';
import SegmentedControl from '../../../../../component-library/components-temp/SegmentedControl';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectSlippage,
  setSlippage,
} from '../../../../../core/redux/slices/bridge';

const getSlippageOptions = (slippage: string | undefined): SlippageOption[] => {
  const baseOptions = [
    { label: '1%', value: '1' },
    { label: '2%', value: '2' },
    { label: '5%', value: '5' },
  ];

  return slippage === undefined
    ? [{ label: 'Auto', value: 'auto' }, ...baseOptions]
    : [{ label: '0.5%', value: '0.5' }, ...baseOptions];
};

export const SlippageModal = () => {
  const dispatch = useDispatch();

  const slippage = useSelector(selectSlippage);
  const slippageOptions = getSlippageOptions(slippage);
  const [selectedValue, setSelectedValue] = useState(slippage || 'auto');
  const { styles } = useStyles(createStyles, {});
  const navigation = useNavigation();
  const sheetRef = useRef<BottomSheetRef>(null);

  const handleOptionSelected = (option: string) => {
    setSelectedValue(option);
  };

  // We are setting undefined to auto slippage so that Lifi can use their default slippage for solana swaps.
  const handleApply = () => {
    dispatch(setSlippage(selectedValue === 'auto' ? undefined : selectedValue));
    navigation.goBack();
  };

  const handleClose = () => {
    navigation.goBack();
  };

  return (
    <BottomSheet ref={sheetRef}>
      <HeaderCenter title={strings('bridge.slippage')} onClose={handleClose} />
      <View style={styles.container}>
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          {strings('bridge.slippage_info')}
        </Text>

        <View style={styles.optionsContainer}>
          <SegmentedControl
            options={slippageOptions.map((option) => ({
              label: option.label,
              value: option.value,
              testID: `slippage-option-${option.value}`,
              buttonWidth: ButtonWidthTypes.Auto,
            }))}
            selectedValue={selectedValue}
            onValueChange={handleOptionSelected}
            size={ButtonSize.Sm}
            isButtonWidthFlexible
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
          style={styles.footer}
        />
      </View>
    </BottomSheet>
  );
};

export default SlippageModal;
