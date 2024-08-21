// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck - Snaps team directory
///: BEGIN:ONLY_INCLUDE_IF(external-snaps)
import React, { useCallback, useMemo, useState } from 'react';
import { View, Switch } from 'react-native';

import Engine from '../../../../../core/Engine';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Cell, {
  CellVariant,
} from '../../../../../component-library/components/Cells/Cell';
import { AvatarVariant } from '../../../../../component-library/components/Avatars/Avatar/Avatar.types';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import { Snap } from '@metamask/snaps-utils';
import stylesheet from './SnapDetails.styles';
import { SnapVersionBadge } from '../SnapVersionTag';
import { toDateFormat } from '../../../../../util/date';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import Label from '../../../../../component-library/components/Form/Label';
import {
  SNAP_DETAILS_CELL,
  SNAP_DETAILS_INSTALL_DATE,
  SNAP_DETAILS_INSTALL_ORIGIN,
  SNAP_DETAILS_SWITCH,
} from './SnapDetails.constants';

interface SnapDetailsProps {
  snap: Snap;
}

const SnapDetails = ({ snap }: SnapDetailsProps) => {
  const { styles, theme } = useStyles(stylesheet, {});
  const { colors } = theme;
  const [enabled, setEnabled] = useState<boolean>(snap.enabled);

  const toggleSnap = useCallback(
    (enable) => {
      const { SnapController } = Engine.context;

      if (!SnapController) return;

      enable
        ? SnapController.enableSnap(snap.id)
        : SnapController.disableSnap(snap.id);
      setEnabled(enable);
    },
    [snap.id],
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
        variant={CellVariant.Display}
        title={snap.manifest.proposedName}
        secondaryText={snap.id}
        avatarProps={{
          variant: AvatarVariant.Icon,
          name: IconName.Snaps,
        }}
      />
      <View style={styles.detailsContainerWithBorder}>
        <Label>{strings('app_settings.snaps.snap_details.enabled')}</Label>
        <Switch
          testID={SNAP_DETAILS_SWITCH}
          value={enabled}
          trackColor={{
            true: colors.primary.default,
            false: colors.border.muted,
          }}
          onValueChange={toggleSnap}
          ios_backgroundColor={colors.border.muted}
        />
      </View>
      <View style={styles.detailsContainer}>
        <Label>
          {strings('app_settings.snaps.snap_details.install_origin')}
        </Label>
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
        <Label>{strings('app_settings.snaps.snap_details.version')}</Label>
        <SnapVersionBadge version={snap.version} />
      </View>
    </View>
  );
};

export default React.memo(SnapDetails);
///: END:ONLY_INCLUDE_IF
