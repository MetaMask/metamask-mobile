import React, { useCallback } from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import TouchableOpacity from '../../../../../Base/TouchableOpacity';
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
import { createStateSelectorModalNavigationDetails } from '../../Views/Modals/StateSelectorModal';
import { US_STATES } from '../../constants';
import { createStateSelectorStyles } from './StateSelector.styles';
import { strings } from '../../../../../../../locales/i18n';

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
  const { styles, theme } = useStyles(createStateSelectorStyles, {});

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
          style={styles.selectorTouchable}
          onPress={handlePress}
          activeOpacity={0.7}
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
