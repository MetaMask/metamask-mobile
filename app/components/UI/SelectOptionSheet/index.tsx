import React, { useRef, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { baseStyles } from '../../../styles/common';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Modal from 'react-native-modal';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import dismissKeyboard from 'react-native/Libraries/Utilities/dismissKeyboard';
import IconCheck from 'react-native-vector-icons/MaterialCommunityIcons';
import Device from '../../../util/device';
import { useTheme } from '../../../util/theme';
import createStyles, { ROW_HEIGHT } from './styles';

export interface iSelectOption {
  key?: string;
  value?: string;
  label?: string;
}

interface iSelectOptionSheet {
  defaultValue?: string;
  label: string;
  selectedValue?: string;
  options: iSelectOption[];
  onValueChange: (val: string | undefined) => void;
}

const SelectOptionSheet = ({
  defaultValue,
  label,
  selectedValue,
  options,
  onValueChange,
}: iSelectOptionSheet) => {
  const [pickerVisible, setPickerVisible] = useState(false);
  const scrollView = useRef<ScrollView>(null);
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const onSelectedValueChange = (val?: string) => {
    onValueChange(val);
    setTimeout(() => {
      setPickerVisible(false);
    }, 1000);
  };

  const hidePicker = () => {
    setPickerVisible(false);
  };

  const showPicker = () => {
    dismissKeyboard();
    setPickerVisible(true);
    Device.isIos() &&
      options.length > 13 &&
      options.forEach((item, i) => {
        if (item.value === selectedValue) {
          setTimeout(() => {
            scrollView?.current?.scrollTo({
              x: 0,
              y: i * ROW_HEIGHT,
              animated: true,
            });
          }, 100);
        }
      });
  };

  const getSelectedValue = () => {
    const el = options?.filter((o) => o.value === selectedValue);
    if (el.length && el[0].label) {
      return el[0].label;
    }
    if (defaultValue) {
      return defaultValue;
    }
    return '';
  };

  const renderDropdownSelector = () => (
    <View style={baseStyles.flexGrow}>
      <TouchableOpacity onPress={showPicker}>
        <View style={styles.dropdown}>
          <Text style={styles.selectedOption} numberOfLines={1}>
            {getSelectedValue()}
          </Text>
          <Icon
            name={'arrow-drop-down'}
            size={24}
            color={colors.icon.default}
            style={styles.iconDropdown}
          />
        </View>
      </TouchableOpacity>
      <Modal
        isVisible={pickerVisible}
        onBackdropPress={hidePicker}
        onBackButtonPress={hidePicker}
        style={styles.modal}
        useNativeDriver
        backdropColor={colors.overlay.default}
        backdropOpacity={1}
      >
        <View style={styles.modalView}>
          <View style={styles.accesoryBar}>
            <Text style={styles.label}>{label}</Text>
          </View>
          <ScrollView style={styles.list} ref={scrollView}>
            <View style={styles.listWrapper}>
              {options.map((option) => (
                <TouchableOpacity
                  onPress={() => onSelectedValueChange(option.value)}
                  style={styles.optionButton}
                  key={option.key}
                >
                  <Text style={styles.optionLabel} numberOfLines={1}>
                    {option.label}
                  </Text>
                  {selectedValue === option.value ? (
                    <IconCheck
                      style={styles.icon}
                      name="check"
                      size={24}
                      color={colors.primary.default}
                    />
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );

  return renderDropdownSelector();
};

export default SelectOptionSheet;
