import React, { useCallback, useMemo, useState } from 'react';
import { View, Switch } from 'react-native';

import Engine from '../../../../../core/Engine';
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
import stylesheet from './SnapDetails.styles';
import { SnapVersionBadge } from '../SnapVersionBadge';
import { toDateFormat } from '../../../../../util/date';
import {
  SNAP_DETAILS_CELL,
  SNAP_DETAILS_INSTALL_DATE,
  SNAP_DETAILS_INSTALL_ORIGIN,
  SNAP_DETAILS_SWITCH,
} from '../../../../../constants/test-ids';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';

interface SnapDetailsProps {
  snap: Snap;
}

const SnapDetails = ({ snap }: SnapDetailsProps) => {
  const { styles, theme } = useStyles(stylesheet, {});
  const { colors } = theme;
  const [enabled, setEnabled] = useState<boolean>(snap.enabled);

  const enableSnap = useCallback(async () => {
    const { SnapController } = Engine.context as any;
    await SnapController.enableSnap(snap.id);
  }, [snap.id]);

  const disableSnap = useCallback(async () => {
    const { SnapController } = Engine.context as any;
    await SnapController.disableSnap(snap.id);
  }, [snap.id]);

  const handleOnValueChange = useCallback(
    (newValue) => {
      setEnabled(newValue);
      if (newValue) {
        enableSnap();
      } else {
        disableSnap();
      }
    },
    [disableSnap, enableSnap],
  );

  const snapInstalledDate: string = useMemo(
    () =>
      strings('app_settings.snaps.snap_details.install_date', {
        date: toDateFormat(snap.versionHistory[0].date),
      }),
    [snap.versionHistory],
  );

  return (
    <View style={styles.snapInfoContainer}>
      <Cell
        testID={SNAP_DETAILS_CELL}
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
        <Text variant={TextVariant.HeadingSM}>
          {strings('app_settings.snaps.snap_details.enabled')}
        </Text>
        <Switch
          testID={SNAP_DETAILS_SWITCH}
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
        <Text variant={TextVariant.HeadingSM}>
          {strings('app_settings.snaps.snap_details.install_origin')}
        </Text>
        <View>
          <Text
            testID={SNAP_DETAILS_INSTALL_ORIGIN}
            variant={TextVariant.BodyMD}
            color={TextColor.Primary}
          >
            {snap.versionHistory[0].origin}
          </Text>
          <Text
            testID={SNAP_DETAILS_INSTALL_DATE}
            variant={TextVariant.BodyMD}
            color={TextColor.Muted}
          >
            {snapInstalledDate}
          </Text>
        </View>
      </View>
      <View style={styles.detailsContainer}>
        <Text variant={TextVariant.HeadingSM}>
          {strings('app_settings.snaps.snap_details.version')}
        </Text>
        <SnapVersionBadge version={snap.version} />
      </View>
    </View>
  );
};

export default React.memo(SnapDetails);
