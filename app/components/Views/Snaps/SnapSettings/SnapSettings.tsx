import React, { useCallback, useEffect, useState } from 'react';
import { View, Switch } from 'react-native';

import Engine from '../../../../core/Engine';
import { useTheme } from '../../../../util/theme';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../component-library/components/Texts/Text';
import Cell, {
  CellVariants,
} from '../../../../component-library/components/Cells/Cell';
import { AvatarVariants } from '../../../../component-library/components/Avatars/Avatar/Avatar.types';
import Icon, {
  IconSize,
  IconName,
} from '../../../../component-library/components/Icons/Icon';

import { createStyles } from './styles';
import {
  createNavigationDetails,
  useParams,
} from '../../../../util/navigation/navUtils';
import Routes from '../../../../constants/navigation/Routes';
import { Snap } from '@metamask/snaps-utils';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';
import { useNavigation } from '@react-navigation/native';
import { SnapDetails } from '../components/SnapDetails';

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

  const removeSnap = useCallback(async () => {
    const { SnapController } = Engine.context as any;
    await SnapController.removeSnap(snap.id);
  }, [snap.id]);

  return (
    <View style={styles.snapSettingsContainer}>
      <SnapDetails snap={snap} />
    </View>
  );
};

export default SnapSettings;
