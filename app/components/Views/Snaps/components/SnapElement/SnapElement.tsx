import React from 'react';
import { View } from 'react-native';
import Cell, {
  CellVariants,
} from '../../../../../component-library/components/Cells/Cell';
import { AvatarVariants } from '../../../../../component-library/components/Avatars/Avatar/Avatar.types';
import Icon, {
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import { Snap } from '@metamask/snaps-utils';

import stylesheet from './SnapElement.styles';
import { createSnapSettingsNavDetails } from '../../SnapSettings/SnapSettings';
import { useNavigation } from '@react-navigation/native';
import { SNAP_ElEMENT } from '../../../../../constants/test-ids';
import { useStyles } from '../../../../../component-library/hooks';

const SnapElement = (snap: Snap) => {
  const { styles } = useStyles(stylesheet, {});
  const { navigate } = useNavigation();

  const onPress = () => {
    navigate(...createSnapSettingsNavDetails({ snap }));
  };

  return (
    <View>
      <Cell
        testID={SNAP_ElEMENT}
        style={styles.snapCell}
        variant={CellVariants.Display}
        title={snap.manifest.proposedName}
        secondaryText={snap.id}
        onPress={onPress}
        avatarProps={{
          variant: AvatarVariants.Icon,
          name: IconName.Snaps,
        }}
      >
        <View style={styles.arrowContainer}>
          <Icon name={IconName.ArrowRight} />
        </View>
      </Cell>
    </View>
  );
};

export default SnapElement;
