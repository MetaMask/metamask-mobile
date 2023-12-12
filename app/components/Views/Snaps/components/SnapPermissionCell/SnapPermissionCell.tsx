///: BEGIN:ONLY_INCLUDE_IF(snaps)
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useStyles } from '../../../../hooks/useStyles';
import stylesheet from './SnapPermissionCell.styles';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import Card from '../../../../../component-library/components/Cards/Card';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../locales/i18n';
import { toDateFormat } from '../../../../../util/date';
import {
  SNAP_PERMISSIONS_DATE,
  SNAP_PERMISSIONS_TITLE,
  SNAP_PERMISSION_CELL,
} from './SnapPermissionCell.constants';

export interface SnapPermissionCellProps {
  title: string;
  date?: number;
}

const SnapPermissionCell = ({ title, date }: SnapPermissionCellProps) => {
  const snapInstalledDate: string = useMemo(
    () =>
      date
        ? strings('app_settings.snaps.snap_permissions.approved_date', {
            date: toDateFormat(date),
          })
        : strings(
            'app_settings.snaps.snap_permissions.permission_requested_now',
          ),
    [date],
  );

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
            {snapInstalledDate}
          </Text>
        </View>
      </View>
    </Card>
  );
};

export default React.memo(SnapPermissionCell);
///: END:ONLY_INCLUDE_IF
