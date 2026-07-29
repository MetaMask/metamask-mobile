///: BEGIN:ONLY_INCLUDE_IF(snaps)
import React from 'react';
import { Pressable, View } from 'react-native';
import Icon, {
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import { Snap } from '@metamask/snaps-utils';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';

import stylesheet from './SnapElement.styles';
import { useStyles } from '../../../../../component-library/hooks';
import SNAP_ElEMENT from './SnapElement.constants';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { navigateWithDetails } from '../../../../../util/navigation/navUtils';
import { createSnapSettingsNavDetails } from '../../SnapSettings/SnapSettings';

const SnapElement = (snap: Snap) => {
  const { styles } = useStyles(stylesheet, {});
  const navigation = useNavigation<AppNavigationProp>();

  const onPress = () => {
    navigateWithDetails(navigation, createSnapSettingsNavDetails({ snap }));
  };

  return (
    <Pressable
      testID={SNAP_ElEMENT}
      style={styles.snapCell}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={snap.manifest.proposedName}
    >
      <View style={styles.snapInfo}>
        <Text variant={TextVariant.BodyMDMedium} numberOfLines={1}>
          {snap.manifest.proposedName}
        </Text>
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Alternative}
          numberOfLines={1}
          style={styles.snapId}
        >
          {snap.id}
        </Text>
      </View>
      <View style={styles.arrowContainer}>
        <Icon name={IconName.ArrowRight} />
      </View>
    </Pressable>
  );
};

export default SnapElement;
///: END:ONLY_INCLUDE_IF
