///: BEGIN:ONLY_INCLUDE_IF(external-snaps)
import React from 'react';
import { View } from 'react-native';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import stylesheet from './SnapDescription.styles';
import { useStyles } from '../../../../../component-library/hooks';
import {
  SNAP_DESCRIPTION,
  SNAP_DESCRIPTION_TITLE,
} from './SnapDescription.constants';

interface SnapDescriptionProps {
  snapName: string;
  snapDescription: string;
}

const SnapDescription = ({
  snapName,
  snapDescription,
}: SnapDescriptionProps) => {
  const { styles } = useStyles(stylesheet, {});

  return (
    <View accessibilityRole="none" accessible={false} style={styles.snapInfoContainer}>
      <View accessibilityRole="none" accessible={false} style={styles.titleContainer}>
        <View accessibilityRole="none" accessible={false} style={styles.iconContainer}>
          <Icon
            name={IconName.SnapsMobile}
            size={IconSize.Sm}
            color={IconColor.Primary}
          />
        </View>
        <Text
          testID={SNAP_DESCRIPTION_TITLE}
          style={styles.snapCell}
          variant={TextVariant.BodyMD}
        >
          {snapName}
        </Text>
      </View>
      <View accessibilityRole="none" accessible={false} style={styles.detailsContainerWithBorder}>
        <Text testID={SNAP_DESCRIPTION} variant={TextVariant.BodyMD}>
          {snapDescription}
        </Text>
      </View>
    </View>
  );
};

export default React.memo(SnapDescription);
///: END:ONLY_INCLUDE_IF
