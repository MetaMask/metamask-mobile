import React, { useCallback, useState } from 'react';
import { View, Switch } from 'react-native';

import Engine from '../../../../../core/Engine';
import { useTheme } from '../../../../../util/theme';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Cell, {
  CellVariants,
} from '../../../../../component-library/components/Cells/Cell';
import { AvatarVariants } from '../../../../../component-library/components/Avatars/Avatar/Avatar.types';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import { Snap } from '@metamask/snaps-utils';
import { createStyles } from './styles';
import { SnapVersionBadge } from '../SnapVersionBadge';

interface SnapDetailsProps {
  snap: Snap;
}

const SnapDetails = ({ snap }: SnapDetailsProps) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [enabled, setEnabled] = useState<boolean>(snap.enabled);

  const enableSnap = useCallback(async () => {
    const { SnapController } = Engine.context as any;
    await SnapController.enableSnap(snap.id);
  }, [snap.id]);

  const stopSnap = useCallback(async () => {
    const { SnapController } = Engine.context as any;
    await SnapController.stopSnap(snap.id);
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

  return (
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
        <SnapVersionBadge version={snap.version} />
      </View>
    </View>
  );
};

export default React.memo(SnapDetails);
