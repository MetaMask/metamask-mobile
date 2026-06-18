import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import FAIcon from 'react-native-vector-icons/FontAwesome';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import ListItem from '../../Base/ListItem';
import { toDateFormat } from '../../../util/date';
import { useTheme } from '../../../util/theme';
import { createStyles } from './ActivityListAccountImportTimeRow.styles';

interface ActivityListAccountImportTimeRowProps {
  importTime: number;
  navigation: AppNavigationProp;
}

export const ActivityListAccountImportTimeRow = ({
  importTime,
  navigation,
}: ActivityListAccountImportTimeRowProps) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const handlePress = () => {
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.IMPORT_WALLET_TIP,
    });
  };

  return (
    <View style={styles.row}>
      <TouchableOpacity
        onPress={handlePress}
        style={styles.rowBody}
        testID="activity-list-account-import-time-row"
      >
        <Text style={styles.importText}>
          {`${strings('transactions.import_wallet_row')} `}
          <FAIcon name="info-circle" />
        </Text>
        <ListItem.Date>{toDateFormat(importTime)}</ListItem.Date>
      </TouchableOpacity>
    </View>
  );
};

export default ActivityListAccountImportTimeRow;
