import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import SheetHeader from '../../../component-library/components/Sheet/SheetHeader';
import { ScrollView, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import IconCheck from 'react-native-vector-icons/MaterialCommunityIcons';
import React, { useRef } from 'react';
import {
  createNavigationDetails,
  useParams,
} from '../../../util/navigation/navUtils';
import { OptionsSheetParams } from './types';
import { useTheme } from '../../../util/theme';
import createStyles from './styles';
import Routes from '../../../constants/navigation/Routes';
import { SELECT_OPTION_PREFIX, SELECT_VALUE_TICK_PREFIX } from './constants';

export const createOptionsSheetNavDetails = (params: OptionsSheetParams) =>
  createNavigationDetails<OptionsSheetParams>(Routes.OPTIONS_SHEET)({
    ...params,
  });

const OptionsSheet = () => {
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const params = useParams<OptionsSheetParams>();
  const { colors } = useTheme();
  const { height: screenHeight } = useWindowDimensions();
  const styles = createStyles(colors, { screenHeight });

  const options = params.options;

  const onSelectedValueChange = (val?: string) => {
    if (!val) {
      return;
    }
    params.onValueChange(val);
    bottomSheetRef.current?.onCloseBottomSheet();
  };

  return (
    <BottomSheet ref={bottomSheetRef}>
      <SheetHeader title={params.label} />
      <ScrollView 
        style={styles.list}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.scrollContent}
        nestedScrollEnabled={true}
        scrollEnabled={true}
      >
        {options.map((option, index) => (
          <TouchableOpacity
            onPress={() =>
              option.value && onSelectedValueChange(option.value)
            }
            style={[
              styles.optionButton,
              index === 0 && { borderTopWidth: 0.5, borderTopColor: colors.border.muted }
            ]}
            key={option.key}
            testID={SELECT_OPTION_PREFIX + option.key}
            activeOpacity={0.7}
          >
            <Text style={styles.optionLabel} numberOfLines={1}>
              {option.label}
            </Text>
            {params.selectedValue === option.value ? (
              <IconCheck
                style={styles.icon}
                name="check"
                size={24}
                color={colors.primary.default}
                testID={SELECT_VALUE_TICK_PREFIX + option.key}
              />
            ) : null}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </BottomSheet>
  );
};

export default OptionsSheet;
