import React from 'react';
import { View } from 'react-native';
import { useStyles } from '../../../../hooks/useStyles';
import stylesheet from './SnapPermissionCell.styles';
import {
  SNAP_PERMISSIONS_DATE,
  SNAP_PERMISSIONS_TITLE,
  SNAP_PERMISSION_CELL,
} from '../../../../../constants/test-ids';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import Card from '../../../../../component-library/components/Cards/Card';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';

interface SnapPermissionCellProps {
  title: string;
  secondaryText: string;
}

const SnapPermissionCell = ({
  title,
  secondaryText,
}: SnapPermissionCellProps) => {
  const { styles } = useStyles(stylesheet, {});
  return (
    <Card style={styles.permissionCell}>
      <View testID={SNAP_PERMISSION_CELL} style={styles.cellBase}>
        <View style={styles.iconWrapper}>
          <Icon
            name={IconName.Key}
            size={IconSize.Md}
            color={IconColor.Muted}
          />
        </View>
        <View style={styles.cellBaseInfo}>
          <Text
            testID={SNAP_PERMISSIONS_TITLE}
            numberOfLines={2}
            variant={TextVariant.HeadingSMRegular}
          >
            {title}
          </Text>
          <Text
            testID={SNAP_PERMISSIONS_DATE}
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
};

export default React.memo(SnapPermissionCell);
