import React, { useEffect, useState } from 'react';
import { View, Switch } from 'react-native';

import Engine from '../../../../core/Engine';
import { useTheme } from '../../../../util/theme';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import Cell, {
  CellVariants,
} from '../../../../component-library/components/Cells/Cell';
import { AvatarVariants } from '../../../../component-library/components/Avatars/Avatar/Avatar.types';
import { IconName } from '../../../../component-library/components/Icons/Icon';

import { createStyles } from './styles';
import {
  createNavigationDetails,
  useParams,
} from '../../../../util/navigation/navUtils';
import Routes from '../../../../constants/navigation/Routes';
import { Snap } from '@metamask/snaps-utils';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';
import { useNavigation } from '@react-navigation/native';

interface SnapSettingsProps {
  snap: Snap;
}

export const createSnapSettingsNavDetails =
  createNavigationDetails<SnapSettingsProps>(Routes.SNAPS.SNAP_SETTINGS);

const SnapSettings = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation();

  const { snap } = useParams<SnapSettingsProps>();
  const [enabled, setEnabled] = useState<boolean>(true);

  useEffect(() => {
    navigation.setOptions(
      getNavigationOptionsTitle(
        `${snap.manifest.proposedName}`,
        navigation,
        false,
        colors,
        false,
      ),
    );
  }, [colors, navigation, snap.manifest.proposedName]);

  const ping = async () => {
    // eslint-disable-next-line no-console
    console.log('ping');
  };

  const stopSnap = async () => {
    const { SnapController } = Engine.context as any;
    await SnapController.stopSnap(snap.id);
  };

  const removeSnap = async () => {
    const { SnapController } = Engine.context as any;
    await SnapController.removeSnap(snap.id);
  };

  return (
    <View style={styles.snapSettingsContainer}>
      <View style={styles.snapInfoContainer}>
        <Cell
          style={styles.snapCell}
          variant={CellVariants.Display}
          title={snap.manifest.proposedName}
          secondaryText={snap.id}
          avatarProps={{
            variant: AvatarVariants.Icon,
            name: IconName.Snaps,
          }}
        />
        <View style={styles.toggleContainer}>
          <Text variant={TextVariant.HeadingSM}>Enabled</Text>
          <View style={styles.switchElement}>
            <Switch
              value={enabled}
              trackColor={{
                true: colors.primary.default,
                false: colors.border.muted,
              }}
              onValueChange={(newValue: boolean) => setEnabled(newValue)}
              ios_backgroundColor={colors.border.muted}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

export default SnapSettings;
