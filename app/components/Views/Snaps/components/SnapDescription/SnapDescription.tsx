import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../../../../util/theme';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { createStyles } from './styles';

interface SnapDescriptionProps {
  snapName: string;
  snapDescription: string;
}

const SnapDescription = ({
  snapName,
  snapDescription,
}: SnapDescriptionProps) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.snapInfoContainer}>
      <View style={styles.titleContainer}>
        <View style={styles.iconContainer}>
          <Icon
            name={IconName.SnapsMobile}
            size={IconSize.Sm}
            color={IconColor.Primary}
          />
        </View>
        <Text style={styles.snapCell} variant={TextVariant.BodyMD}>
          {snapName}
        </Text>
      </View>
      <View style={styles.detailsContainerWithBorder}>
        <Text variant={TextVariant.BodyMD}>{snapDescription}</Text>
      </View>
    </View>
  );
};

export default React.memo(SnapDescription);
