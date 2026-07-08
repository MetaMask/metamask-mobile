import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Keyboard,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  BottomSheet,
  BottomSheetHeader,
  FontWeight,
  Text as DesignSystemText,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { baseStyles } from '../../../styles/common';
import PickerBase from '../../../component-library/components/Pickers/PickerBase';
import ListItemSelect from '../../../component-library/components/List/ListItemSelect';
import { VerticalAlignment } from '../../../component-library/components/List/ListItem';
import { useTheme } from '../../../util/theme';
import { useElevatedSurface } from '../../../util/theme/themeUtils';

const ROW_HEIGHT = 56;

export interface SelectOption {
  label: string;
  key: string | number;
  value: string;
}

export interface SelectComponentProps {
  defaultValue?: string;
  label?: string;
  selectedValue?: string;
  options: SelectOption[];
  onValueChange: (value: string) => void;
  testID?: string;
}

const createStyles = (backgroundMuted: string) =>
  StyleSheet.create({
    pickerTrigger: {
      backgroundColor: backgroundMuted,
      padding: 0,
      paddingTop: 12,
      paddingBottom: 12,
      paddingLeft: 16,
      paddingRight: 16,
      borderRadius: 12,
      borderWidth: 0,
    },
    selectedLabel: {
      flex: 1,
    },
    optionLabel: {
      width: '100%',
    },
  });

const SelectComponent: React.FC<SelectComponentProps> = ({
  defaultValue,
  label,
  selectedValue,
  options,
  onValueChange,
  testID,
}) => {
  const [pickerVisible, setPickerVisible] = useState(false);
  const sheetRef = useRef<BottomSheetRef>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const { colors } = useTheme();
  const surfaceClass = useElevatedSurface();
  const { height: screenHeight } = useWindowDimensions();
  const styles = useMemo(
    () => createStyles(colors.background.muted),
    [colors.background.muted],
  );

  const listStyle = useMemo(
    () => ({ maxHeight: screenHeight * 0.65 }),
    [screenHeight],
  );

  const hidePicker = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(() => {
      setPickerVisible(false);
    });
  }, []);

  const showPicker = useCallback(() => {
    Keyboard.dismiss();
    setPickerVisible(true);
  }, []);

  useEffect(() => {
    if (!pickerVisible || options.length <= 13 || !selectedValue) {
      return;
    }

    const selectedIndex = options.findIndex(
      (option) => option.value === selectedValue,
    );

    if (selectedIndex < 0) {
      return;
    }

    const timeoutId = setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        x: 0,
        y: selectedIndex * ROW_HEIGHT,
        animated: true,
      });
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [options, pickerVisible, selectedValue]);

  const getSelectedValue = useCallback(() => {
    const selectedOption = options.find(
      (option) => option.value === selectedValue,
    );

    if (selectedOption?.label) {
      return selectedOption.label;
    }

    return defaultValue ?? '';
  }, [defaultValue, options, selectedValue]);

  const handleValueChange = useCallback(
    (value: string) => {
      onValueChange(value);
      hidePicker();
    },
    [hidePicker, onValueChange],
  );

  return (
    <View style={baseStyles.flexGrow}>
      <PickerBase
        onPress={showPicker}
        testID={testID}
        style={styles.pickerTrigger}
      >
        <DesignSystemText
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
          style={styles.selectedLabel}
          numberOfLines={1}
        >
          {getSelectedValue()}
        </DesignSystemText>
      </PickerBase>
      {pickerVisible ? (
        <BottomSheet
          ref={sheetRef}
          onClose={() => setPickerVisible(false)}
          twClassName={surfaceClass}
        >
          <BottomSheetHeader onClose={hidePicker}>
            <DesignSystemText
              variant={TextVariant.HeadingMd}
              fontWeight={FontWeight.Bold}
            >
              {label}
            </DesignSystemText>
          </BottomSheetHeader>
          <ScrollView ref={scrollViewRef} style={listStyle}>
            {options.map((option) => (
              <ListItemSelect
                key={option.key}
                onPress={() => handleValueChange(option.value)}
                isSelected={selectedValue === option.value}
                isDisabled={false}
                gap={8}
                verticalAlignment={VerticalAlignment.Center}
              >
                <DesignSystemText
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextDefault}
                  style={styles.optionLabel}
                  numberOfLines={1}
                >
                  {option.label}
                </DesignSystemText>
              </ListItemSelect>
            ))}
          </ScrollView>
        </BottomSheet>
      ) : null}
    </View>
  );
};

export default SelectComponent;
