import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../../../../util/theme';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { SemVerVersion } from '@metamask/snaps-utils';
import { createStyles } from './styles';

interface SnapVersionBadgeProps {
  version: SemVerVersion;
}

const SnapVersionBadge = ({ version }: SnapVersionBadgeProps) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <View style={styles.versionBadgeContainer}>
      <Text
        variant={TextVariant.HeadingSMRegular}
        color={TextColor.Default}
        style={styles.versionBadgeItem}
      >
        {version}
      </Text>
      <Icon
        name={IconName.Export}
        size={IconSize.Sm}
        style={styles.versionBadgeItem}
      />
    </View>
  );
};

export default React.memo(SnapVersionBadge);
