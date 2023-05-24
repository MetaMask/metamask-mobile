import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../../../../util/theme';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { SnapPermissions as SnapPermissionsType } from '@metamask/snaps-utils';
import { createStyles } from './styles';

interface SnapPermissionsProps {
  permissions: SnapPermissionsType;
  installedAt: number;
}
interface KeyItem {
  key: string;
}

const SnapPermissions = ({
  permissions,
  installedAt,
}: SnapPermissionsProps) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const keys = Object.keys(permissions);
  const keyItems: KeyItem[] = keys.map((key) => ({ key }));

  return (
    <View style={styles.removeSection}>
      <Text variant={TextVariant.HeadingMD}>Permissions</Text>
      {keyItems.map((item) => (
        <Text key={item.key}>{item.key}</Text>
      ))}
    </View>
  );
};

export default React.memo(SnapPermissions);
