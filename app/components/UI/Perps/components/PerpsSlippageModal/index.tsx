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
import createStyles from './PerpsSlippageModal.styles';
import { SlippageOption } from './PerpsSlippageModal.types';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
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
        { label: '3%', value: '3' },
        { label: '10%', value: '10' },
    ];

    return slippage === undefined
        ? [{ label: 'Auto', value: 'auto' }, ...baseOptions]
        : [{ label: '0.5%', value: '0.5' }, ...baseOptions];
};

export const PerpsSlippageModal = () => {
    const dispatch = useDispatch();

    const slippage = useSelector(selectSlippage);
    const slippageOptions = getSlippageOptions(slippage);
    const [selectedValue, setSelectedValue] = useState(slippage || 'auto');
    const theme = useTheme();
    const styles = createStyles(theme);
    const navigation = useNavigation();
    const sheetRef = useRef<BottomSheetRef>(null);

    const handleOptionSelected = (option: string) => {
        setSelectedValue(option);
    };

    // We are setting undefined to auto slippage so that the system can use their default slippage for perps deposits.
    const handleApply = () => {
        dispatch(setSlippage(selectedValue === 'auto' ? undefined : selectedValue));
        navigation.goBack();
    };

    const handleClose = () => {
        navigation.goBack();
    };

    return (
        <BottomSheet ref={sheetRef}>
            <BottomSheetHeader onClose={handleClose}>
                <Text variant={TextVariant.HeadingMD}>
                    {strings('perps.deposit.slippage')}
                </Text>
            </BottomSheetHeader>
            <View style={styles.container}>
                <Text style={styles.description}>
                    {strings('perps.deposit.slippage_info')}
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
                            label: strings('perps.deposit.apply'),
                            onPress: handleApply,
                            size: ButtonSize.Lg,
                        },
                    ]}
                />
            </View>
        </BottomSheet>
    );
};

export default PerpsSlippageModal;
