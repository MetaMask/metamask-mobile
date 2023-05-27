import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useTheme } from '../../../../../util/theme';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Cell, {
  CellVariants,
} from '../../../../../component-library/components/Cells/Cell';
import { AvatarVariants } from '../../../../../component-library/components/Avatars/Avatar/Avatar.types';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import { SnapPermissions as SnapPermissionsType } from '@metamask/snaps-utils';
import { createStyles } from './styles';
import { toDateFormat } from '../../../../../util/date';
import {
  SNAP_PERMISSIONS,
  SNAP_PERMISSION_CELL,
} from '../../../../../constants/test-ids';
import { strings } from '../../../../../../locales/i18n';

interface SnapPermissionsProps {
  permissions: SnapPermissionsType;
  installedAt: number;
}

type PermissionKey = keyof SnapPermissionsType;

interface SnapPermission {
  key: PermissionKey;
}

const SnapPermissions = ({
  permissions,
  installedAt,
}: SnapPermissionsProps) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const keys = Object.keys(permissions) as PermissionKey[];
  const keyItems: SnapPermission[] = keys.map((key) => ({ key }));

  const snapInstalledDate: string = useMemo(
    () =>
      strings('app_settings.snaps.snap_permissions.approved_date', {
        date: toDateFormat(installedAt),
      }),
    [installedAt],
  );

  return (
    <View testID={SNAP_PERMISSIONS} style={styles.removeSection}>
      <Text variant={TextVariant.HeadingMD}>
        {strings(
          'app_settings.snaps.snap_permissions.permission_section_title',
        )}
      </Text>
      {keyItems.map((item, key) => (
        <Cell
          testID={SNAP_PERMISSION_CELL}
          key={key}
          style={styles.snapCell}
          variant={CellVariants.Display}
          title={strings(
            `app_settings.snaps.snap_permissions.human_readable_permission_titles.${item.key}`,
          )}
          secondaryText={snapInstalledDate}
          avatarProps={{
            variant: AvatarVariants.Icon,
            name: IconName.Key,
          }}
        />
      ))}
    </View>
  );
};

export default React.memo(SnapPermissions);
