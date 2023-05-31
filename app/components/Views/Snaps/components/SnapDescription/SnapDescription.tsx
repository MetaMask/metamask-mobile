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
import {
  SNAP_DESCRIPTION,
  SNAP_DESCRIPTION_TITLE,
} from '../../../../../constants/test-ids';
import { useStyles } from '../../../../../component-library/hooks';

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
    <View style={styles.snapInfoContainer}>
      <View style={styles.titleContainer}>
        <View style={styles.iconContainer}>
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
      <View style={styles.detailsContainerWithBorder}>
        <Text testID={SNAP_DESCRIPTION} variant={TextVariant.BodyMD}>
          {snapDescription}
        </Text>
      </View>
    </View>
  );
};

export default React.memo(SnapDescription);
