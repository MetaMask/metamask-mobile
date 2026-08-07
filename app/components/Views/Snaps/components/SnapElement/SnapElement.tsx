///: BEGIN:ONLY_INCLUDE_IF(snaps)
import React from 'react';
import { View } from 'react-native';
import Cell, {
  CellVariant,
} from '../../../../../component-library/components/Cells/Cell';
import { AvatarVariant } from '../../../../../component-library/components/Avatars/Avatar/Avatar.types';
import Icon, {
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import { Snap } from '@metamask/snaps-utils';

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
    <Cell
      testID={SNAP_ElEMENT}
      style={styles.snapCell}
      variant={CellVariant.Display}
      title={snap.manifest.proposedName}
      secondaryText={snap.id}
      onPress={onPress}
      avatarProps={{
        variant: AvatarVariant.Icon,
        name: IconName.Snaps,
      }}
    >
      <View style={styles.arrowContainer}>
        <Icon name={IconName.ArrowRight} />
      </View>
    </Cell>
  );
};

export default SnapElement;
///: END:ONLY_INCLUDE_IF
