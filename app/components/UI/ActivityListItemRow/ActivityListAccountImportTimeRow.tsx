import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import {
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import ListItem from '../../Base/ListItem';
import { toDateFormat } from '../../../util/date';
import { useTheme } from '../../../util/theme';
import { createStyles } from './ActivityListAccountImportTimeRow.styles';

interface ActivityListAccountImportTimeRowProps {
  importTime: number;
  onPress: () => void;
}

export const ActivityListAccountImportTimeRow = ({
  importTime,
  onPress,
}: ActivityListAccountImportTimeRowProps) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.row}>
      <TouchableOpacity
        onPress={onPress}
        style={styles.rowBody}
        testID="activity-list-account-import-time-row"
      >
        <View style={styles.importTextContainer}>
          <Text style={styles.importText}>
            {strings('transactions.import_wallet_row')}
          </Text>
          <Icon
            name={IconName.Info}
            size={IconSize.Sm}
            color={IconColor.IconAlternative}
          />
        </View>
        <ListItem.Date>{toDateFormat(importTime)}</ListItem.Date>
      </TouchableOpacity>
    </View>
  );
};

export default ActivityListAccountImportTimeRow;
