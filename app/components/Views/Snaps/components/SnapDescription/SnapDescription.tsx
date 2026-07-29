///: BEGIN:ONLY_INCLUDE_IF(snaps)
import React from 'react';
import { View } from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import stylesheet from './SnapDescription.styles';
import { useStyles } from '../../../../../component-library/hooks';
import { SNAP_DESCRIPTION } from './SnapDescription.constants';

interface SnapDescriptionProps {
  snapDescription: string;
}

const SnapDescription = ({ snapDescription }: SnapDescriptionProps) => {
  const { styles } = useStyles(stylesheet, {});

  return (
    <View style={styles.snapInfoContainer}>
      <Text
        testID={SNAP_DESCRIPTION}
        variant={TextVariant.BodyMD}
        color={TextColor.Alternative}
        style={styles.description}
      >
        {snapDescription}
      </Text>
    </View>
  );
};

export default React.memo(SnapDescription);
///: END:ONLY_INCLUDE_IF
