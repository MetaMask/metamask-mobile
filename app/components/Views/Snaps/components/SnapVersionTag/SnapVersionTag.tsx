///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
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
import stylesheet from './SnapVersionTag.styles';
import { useStyles } from '../../../../../component-library/hooks';
import { SemVerVersion } from '@metamask/utils';
import {
  SNAP_VERSION_BADGE,
  SNAP_VERSION_BADGE_VALUE,
} from './SnapVersionTag.constants';

interface SnapVersionTagProps extends React.ComponentProps<typeof View> {
  version: SemVerVersion;
}

const SnapVersionTag: React.FC<SnapVersionTagProps> = ({
  version,
}: SnapVersionTagProps) => {
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

export default React.memo(SnapVersionTag);
///: END:ONLY_INCLUDE_IF
