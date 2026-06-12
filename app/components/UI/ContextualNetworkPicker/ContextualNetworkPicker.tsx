import React from 'react';
import { ImageSourcePropType, View } from 'react-native';
import { useTheme } from '../../../util/theme';
import createStyles from './ContextualNetworkPicker.styles';
import PickerBase from '../../../component-library/components/Pickers/PickerBase/PickerBase';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../component-library/components/Avatars/Avatar';
import { IconSize } from '../../../component-library/components/Icons/Icon';
import Text from '../../../component-library/components/Texts/Text';
import { NETWORK_SELECTOR_TEST_IDS } from '../../../constants/networkSelector';

interface ContextualNetworkPickerProps {
  onPress: () => void;
  networkName: string;
  networkImageSource?: ImageSourcePropType;
  disabled?: boolean;
}

const ContextualNetworkPicker = ({
  onPress,
  networkName,
  networkImageSource,
  disabled = false,
}: ContextualNetworkPickerProps) => {
  const { colors } = useTheme();
  const styles = createStyles(colors, disabled);
  const noop = () => {
    // eslint-disable-next-line no-empty-function
  };
  return (
    <View style={styles.accountSelectorWrapper}>
      <PickerBase
        onPress={disabled ? noop : onPress}
        iconSize={IconSize.Xs}
        style={styles.base}
      >
        <View style={styles.row}>
          <View style={styles.avatarWrapper}>
            <Avatar
              variant={AvatarVariant.Network}
              size={AvatarSize.Xs}
              name={networkName}
              imageSource={networkImageSource}
              testID={NETWORK_SELECTOR_TEST_IDS.CONTEXTUAL_NETWORK_PICKER}
              accessibilityLabel={networkName}
              style={styles.avatar}
            />
          </View>
          <Text style={styles.networkName}>{networkName}</Text>
        </View>
      </PickerBase>
    </View>
  );
};

export default ContextualNetworkPicker;
