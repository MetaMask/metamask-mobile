import React, { useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStyles } from '../../../../../hooks/useStyles';
import Label from '../../../../../../component-library/components/Form/Label';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import { Theme } from '../../../../../../util/theme/models';
import { createStateSelectorModalNavigationDetails } from '../../Views/Modals/StateSelectorModal';
import { US_STATES } from '../../constants';

interface StateSelectorProps {
  label: string;
  selectedValue?: string;
  onValueChange: (value: string) => void;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  defaultValue?: string;
}

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    label: {
      marginBottom: 6,
    },
    field: {
      flexDirection: 'column',
      marginBottom: 16,
    },
    error: {
      color: theme.colors.error.default,
      fontSize: 12,
      marginTop: 4,
    },
    selectorContainer: {
      position: 'relative',
    },
    selectorTouchable: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: theme.colors.border.default,
      borderRadius: 8,
      backgroundColor: theme.colors.background.default,
      minHeight: 48,
    },
    selectorText: {
      flex: 1,
      color: theme.colors.text.default,
      fontSize: 16,
    },
    placeholderText: {
      color: theme.colors.text.muted,
      fontSize: 16,
    },
    icon: {
      marginLeft: 8,
    },
  });
};

const StateSelector: React.FC<StateSelectorProps> = ({
  label,
  selectedValue,
  onValueChange,
  error,
  containerStyle,
  defaultValue,
}) => {
  const navigation = useNavigation();
  const { styles, theme } = useStyles(styleSheet, {});

  const selectedStateName = US_STATES.find(
    (state) => state.code === selectedValue,
  )?.name;

  const handlePress = useCallback(() => {
    navigation.navigate(
      ...createStateSelectorModalNavigationDetails({
        selectedState: selectedValue,
        onStateSelect: onValueChange,
      }),
    );
  }, [navigation, selectedValue, onValueChange]);

  return (
    <View style={[styles.field, containerStyle]}>
      <Label variant={TextVariant.BodyMD} style={styles.label}>
        {label}
      </Label>
      <View style={styles.selectorContainer}>
        <TouchableOpacity
          style={[
            styles.selectorTouchable,
            error && { borderColor: theme.colors.error.default },
          ]}
          onPress={handlePress}
          activeOpacity={0.7}
        >
          <Text
            style={
              selectedStateName
                ? styles.selectorText
                : [styles.selectorText, styles.placeholderText]
            }
            numberOfLines={1}
          >
            {selectedStateName || defaultValue || 'Select a state'}
          </Text>
          <Icon
            name={IconName.ArrowDown}
            size={IconSize.Sm}
            color={theme.colors.icon.alternative}
            style={styles.icon}
          />
        </TouchableOpacity>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

export default StateSelector;
