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

interface SnapPermissionsProps {
  permissions: SnapPermissionsType;
  installedAt: number;
}
interface SnapPermission {
  key: string;
}

const SnapPermissions = ({
  permissions,
  installedAt,
}: SnapPermissionsProps) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const keys = Object.keys(permissions);
  const keyItems: SnapPermission[] = keys.map((key) => ({ key }));

  const snapInstalledDate: string = useMemo(
    () => `Approved on ${toDateFormat(installedAt)}`,
    [installedAt],
  );

  return (
    <View style={styles.removeSection}>
      <Text variant={TextVariant.HeadingMD}>Permissions</Text>
      {keyItems.map((item, key) => (
        <Cell
          key={key}
          style={styles.snapCell}
          variant={CellVariants.Display}
          title={item.key}
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
