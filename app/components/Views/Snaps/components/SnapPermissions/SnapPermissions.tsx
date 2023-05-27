import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useTheme } from '../../../../../util/theme';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Cell, {
  CellVariants,
} from '../../../../../component-library/components/Cells/Cell';
import { SnapPermissions as SnapPermissionsType } from '@metamask/snaps-utils';
import { createStyles } from './styles';
import { toDateFormat } from '../../../../../util/date';
import {
  SNAP_PERMISSIONS,
  SNAP_PERMISSION_CELL,
} from '../../../../../constants/test-ids';
import { strings } from '../../../../../../locales/i18n';
import Avatar, {
  AvatarSize,
  AvatarVariants,
} from '../../../../../component-library/components/Avatars/Avatar';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import Card from '../../../../../component-library/components/Cards/Card';

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

  const renderPermissionCell = (
    title: string,
    secondaryText: string,
    key: number,
  ) => (
    <Card key={key} style={styles.permissionCell}>
      <View testID={SNAP_PERMISSION_CELL} style={styles.cellBase}>
        <Icon
          style={styles.icon}
          name={IconName.Key}
          size={IconSize.Md}
          color={IconColor.Muted}
        />
        <View style={styles.cellBaseInfo}>
          <Text numberOfLines={2} variant={TextVariant.HeadingSMRegular}>
            {title}
          </Text>
          <Text
            numberOfLines={1}
            variant={TextVariant.BodyMD}
            style={styles.secondaryText}
          >
            {secondaryText}
          </Text>
        </View>
      </View>
    </Card>
  );

  return (
    <View testID={SNAP_PERMISSIONS} style={styles.section}>
      <Text variant={TextVariant.HeadingMD}>
        {strings(
          'app_settings.snaps.snap_permissions.permission_section_title',
        )}
      </Text>
      {keyItems.map((item, key) =>
        renderPermissionCell(
          strings(
            `app_settings.snaps.snap_permissions.human_readable_permission_titles.${item.key}`,
          ),
          snapInstalledDate,
          key,
        ),
      )}
    </View>
  );
};

export default React.memo(SnapPermissions);
