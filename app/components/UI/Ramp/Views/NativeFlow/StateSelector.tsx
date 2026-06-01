import React, { useCallback } from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStyles } from '../../../../hooks/useStyles';
import Pressable from '../../../../../component-library/components-temp/Pressable';
import {
  Label,
  Text,
  Icon,
  IconName,
  IconSize,
  IconColor,
} from '@metamask/design-system-react-native';
import { createStateSelectorModalNavigationDetails } from '../Modals/StateSelectorModal';
import { US_STATES } from '../../Deposit/constants';
import { createStateSelectorStyles } from '../../Deposit/components/StateSelector/StateSelector.styles';
import { strings } from '../../../../../../locales/i18n';

interface StateSelectorProps {
  label: string;
  selectedValue?: string;
  onValueChange: (value: string) => void;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  defaultValue?: string;
  testID?: string;
}

const StateSelector: React.FC<StateSelectorProps> = ({
  label,
  selectedValue,
  onValueChange,
  error,
  containerStyle,
  defaultValue,
  testID,
}) => {
  const navigation = useNavigation();
  const { styles } = useStyles(createStateSelectorStyles, {});

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
      <Label style={styles.label}>{label}</Label>
      <View style={styles.selectorContainer}>
        <Pressable
          style={styles.selectorTouchable}
          onPress={handlePress}
          testID={testID}
        >
          <Text
            style={
              selectedStateName
                ? styles.selectorText
                : [styles.selectorText, styles.placeholderText]
            }
            numberOfLines={1}
          >
            {selectedStateName ||
              defaultValue ||
              strings('deposit.enter_address.select_a_state')}
          </Text>
          <Icon
            name={IconName.ArrowDown}
            size={IconSize.Sm}
            color={IconColor.IconAlternative}
            style={styles.icon}
          />
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

export default StateSelector;
