///: BEGIN:ONLY_INCLUDE_IF(external-snaps)
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

const SnapElement = (snap: Snap) => {
  const { styles } = useStyles(stylesheet, {});
  const { navigate } = useNavigation();

  const onPress = () => {
    navigate('SnapSettings', { snap });
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
