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
  const [enabled, setEnabled] = useState<boolean>(snap.enabled);

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

  const enableSnap = useCallback(async () => {
    const { SnapController } = Engine.context as any;
    await SnapController.enableSnap(snap.id);
  }, [snap.id]);

  const stopSnap = useCallback(async () => {
    const { SnapController } = Engine.context as any;
    await SnapController.stopSnap(snap.id);
  }, [snap.id]);

  const removeSnap = useCallback(async () => {
    const { SnapController } = Engine.context as any;
    await SnapController.removeSnap(snap.id);
  }, [snap.id]);

  const handleOnValueChange = useCallback(
    (newValue) => {
      setEnabled(newValue);
      if (newValue) {
        enableSnap();
      } else {
        stopSnap();
      }
    },
    [enableSnap, stopSnap],
  );

  const versionBadge = () => (
    <View style={styles.versionBadgeContainer}>
      <Text
        variant={TextVariant.HeadingSMRegular}
        color={TextColor.Default}
        style={styles.versionBadgeItem}
      >
        {snap.version}
      </Text>
      <Icon
        name={IconName.Export}
        size={IconSize.Sm}
        style={styles.versionBadgeItem}
      />
    </View>
  );

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
        <View style={styles.detailsContainerWithBorder}>
          <Text variant={TextVariant.HeadingSM}>Enabled</Text>
          <Switch
            value={enabled}
            trackColor={{
              true: colors.primary.default,
              false: colors.border.muted,
            }}
            onValueChange={handleOnValueChange}
            ios_backgroundColor={colors.border.muted}
          />
        </View>
        <View style={styles.detailsContainer}>
          <Text variant={TextVariant.HeadingSM}>Install Origin</Text>
          <View>
            <Text variant={TextVariant.BodyMD} color={TextColor.Primary}>
              {snap.versionHistory[0].origin}
            </Text>
            <Text variant={TextVariant.BodyMD} color={TextColor.Muted}>
              {snap.versionHistory[0].date}
            </Text>
          </View>
        </View>
        <View style={styles.detailsContainer}>
          <Text variant={TextVariant.HeadingSM}>Version</Text>
          {versionBadge()}
        </View>
      </View>
    </View>
  );
};

export default SnapSettings;
