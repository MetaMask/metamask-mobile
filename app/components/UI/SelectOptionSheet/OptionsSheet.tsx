import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../component-library/components/BottomSheets/BottomSheetHeader';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import React, { useRef, useMemo } from 'react';
import {
  createNavigationDetails,
  useParams,
} from '../../../util/navigation/navUtils';
import { OptionsSheetParams } from './types';
import { useTheme } from '../../../util/theme';
import createStyles from './styles';
import Routes from '../../../constants/navigation/Routes';
import { SELECT_OPTION_PREFIX } from './constants';

export const createOptionsSheetNavDetails = (params: OptionsSheetParams) =>
  createNavigationDetails(Routes.OPTIONS_SHEET)({
    ...params,
  });

const OptionsSheet = () => {
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const params = useParams<OptionsSheetParams>();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  // Sort options alphabetically by label, keeping 'all' at the top
  const sortedOptions = useMemo(() => {
    const allOption = params.options.find((opt) => opt.key === 'all');
    const otherOptions = params.options
      .filter((opt) => opt.key !== 'all')
      .sort((a, b) => {
        const labelA = a.label || '';
        const labelB = b.label || '';
        return labelA.localeCompare(labelB);
      });

    return allOption ? [allOption, ...otherOptions] : otherOptions;
  }, [params.options]);

  const onSelectedValueChange = (val?: string) => {
    if (!val) {
      return;
    }
    params.onValueChange(val);
    bottomSheetRef.current?.onCloseBottomSheet();
  };

  const handleClose = () => {
    bottomSheetRef.current?.onCloseBottomSheet();
  };

  return (
    <BottomSheet ref={bottomSheetRef}>
      <BottomSheetHeader onClose={handleClose}>
        {params.label}
      </BottomSheetHeader>
      <ScrollView style={styles.list}>
        <View style={styles.listWrapper}>
          {sortedOptions.map((option) => {
            const isSelected = option.value === params.selectedValue;
            return (
              <TouchableOpacity
                onPress={() =>
                  option.value && onSelectedValueChange(option.value)
                }
                style={[
                  styles.optionButton,
                  isSelected && styles.optionButtonSelected,
                ]}
                key={option.key}
                testID={SELECT_OPTION_PREFIX + option.key}
              >
                <Text style={styles.optionLabel} numberOfLines={1}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </BottomSheet>
  );
};

export default OptionsSheet;
