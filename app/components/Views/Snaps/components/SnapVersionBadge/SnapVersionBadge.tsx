import React from 'react';
import { View } from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { SemVerVersion } from '@metamask/snaps-utils';
import stylesheet from './SnapVersionBadge.styles';
import {
  SNAP_VERSION_BADGE,
  SNAP_VERSION_BADGE_VALUE,
} from '../../../../../constants/test-ids';
import { useStyles } from '../../../../../component-library/hooks';

interface SnapVersionBadgeProps extends React.ComponentProps<typeof View> {
  version: SemVerVersion;
}

const SnapVersionBadge: React.FC<SnapVersionBadgeProps> = ({
  version,
}: SnapVersionBadgeProps) => {
  const { styles } = useStyles(stylesheet, {});
  return (
    <View testID={SNAP_VERSION_BADGE} style={styles.versionBadgeContainer}>
      <Text
        testID={SNAP_VERSION_BADGE_VALUE}
        variant={TextVariant.HeadingSMRegular}
        color={TextColor.Default}
        style={styles.versionBadgeItem}
      >
        {`v${version}`}
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
