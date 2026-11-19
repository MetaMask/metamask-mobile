/**
 * DepositSelectField
 *
 * A dropdown/picker field component for deposit forms, used for selecting from
 * a list of options (e.g. source of funds, employment status, nationality).
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { useStyles } from '../../../../hooks/useStyles';
import { Label, Icon, IconName } from '@metamask/design-system-react-native';
import Text from '../../../../../component-library/components/Texts/Text';
import { Theme } from '../../../../../util/theme/models';
import { TextVariant } from '../../../../../component-library/components/Texts/Text/Text.types';

interface DepositSelectFieldProps {
  label: string;
  placeholder?: string;
  options: Array<{ name: string; value: string }>;
  selectedValue: string;
  onValueChange: (value: string) => void;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    label: {
      marginBottom: 6,
    },
    field: {
      flexDirection: 'column',
      marginBottom: 16,
    },
    selectButton: {
      borderWidth: 1,
      borderColor: colors.border.default,
      borderRadius: 8,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.background.default,
    },
    selectButtonText: {
      color: colors.text.default,
    },
    selectButtonPlaceholder: {
      color: colors.text.muted,
    },
    error: {
      color: colors.error.default,
      fontSize: 12,
      marginTop: 4,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.background.default,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      maxHeight: '70%',
    },
    modalHeader: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.default,
    },
    modalTitle: {
      textAlign: 'center',
    },
    optionItem: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
    },
    optionItemSelected: {
      backgroundColor: colors.primary.muted,
    },
    optionText: {
      color: colors.text.default,
    },
  });
};

const DepositSelectField: React.FC<DepositSelectFieldProps> = ({
  label,
  placeholder = 'Select an option',
  options,
  selectedValue,
  onValueChange,
  error,
  containerStyle,
}) => {
  const { styles, theme } = useStyles(styleSheet, {});
  const [modalVisible, setModalVisible] = useState(false);

  const selectedOption = options.find((opt) => opt.value === selectedValue);
  const displayText = selectedOption?.name || placeholder;

  const handleSelect = (value: string) => {
    onValueChange(value);
    setModalVisible(false);
  };

  return (
    <View style={[styles.field, containerStyle]}>
      <Label style={styles.label}>{label}</Label>
      <TouchableOpacity
        style={styles.selectButton}
        onPress={() => setModalVisible(true)}
      >
        <Text
          variant={TextVariant.BodyMd}
          style={
            selectedOption
              ? styles.selectButtonText
              : styles.selectButtonPlaceholder
          }
        >
          {displayText}
        </Text>
        <Icon name={IconName.ArrowDown} />
      </TouchableOpacity>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text variant={TextVariant.HeadingMd} style={styles.modalTitle}>
                {label}
              </Text>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    item.value === selectedValue && styles.optionItemSelected,
                  ]}
                  onPress={() => handleSelect(item.value)}
                >
                  <Text
                    variant={TextVariant.BodyMd}
                    style={styles.optionText}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default DepositSelectField;
