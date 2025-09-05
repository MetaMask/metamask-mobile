import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import SheetHeader from '../../../component-library/components/Sheet/SheetHeader';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import IconCheck from 'react-native-vector-icons/MaterialCommunityIcons';
import React, { useRef } from 'react';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootParamList } from '../../../util/navigation/types';
import { useTheme } from '../../../util/theme';
import createStyles from './styles';
import { SELECT_OPTION_PREFIX, SELECT_VALUE_TICK_PREFIX } from './constants';

type OptionsSheetProps = StackScreenProps<RootParamList, 'OptionsSheet'>;

const OptionsSheet = ({ route }: OptionsSheetProps) => {
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const params = route.params;
  const { colors } = useTheme();
  const styles = createStyles(colors);

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
      <ScrollView style={styles.list}>
        <View style={styles.listWrapper}>
          {options.map((option) => (
            <TouchableOpacity
              onPress={() =>
                option.value && onSelectedValueChange(option.value)
              }
              style={styles.optionButton}
              key={option.key}
              testID={SELECT_OPTION_PREFIX + option.key}
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
        </View>
      </ScrollView>
    </BottomSheet>
  );
};

export default OptionsSheet;
