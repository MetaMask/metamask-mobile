import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../../../../util/theme';
import Cell, {
  CellVariants,
} from '../../../../../component-library/components/Cells/Cell';
import { AvatarVariants } from '../../../../../component-library/components/Avatars/Avatar/Avatar.types';
import Icon, {
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import { Snap } from '@metamask/snaps-utils';

import { createStyles } from './styles';
import { createSnapSettingsNavDetails } from '../../SnapSettings/SnapSettings';
import { useNavigation } from '@react-navigation/native';

const SnapElement = (snap: Snap) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { navigate } = useNavigation();

  const onPress = () => {
    navigate(...createSnapSettingsNavDetails({ snap }));
  };

  return (
    <View>
      <Cell
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
