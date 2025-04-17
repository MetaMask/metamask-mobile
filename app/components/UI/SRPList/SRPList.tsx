import React from 'react';
import { FlatList, View } from 'react-native';
import { strings } from '../../../../locales/i18n';
import { SRPListProps } from './SRPList.types';
import { useStyles } from '../../hooks/useStyles';
import styleSheet from './SRPList.styles';
import SRPListItem from '../SRPListItem';
import { SRPListSelectorsIDs } from '../../../../e2e/selectors/MultiSRP/SRPList.selectors';
import { useHdKeyringsWithSnapAccounts } from '../../hooks/useHdKeyringsWithSnapAccounts';

const SRPList = ({ onKeyringSelect }: SRPListProps) => {
  const { styles } = useStyles(styleSheet, {});
  const hdKeyringsWithSnapAccounts = useHdKeyringsWithSnapAccounts();

  return (
    <View style={styles.base} testID={SRPListSelectorsIDs.SRP_LIST}>
      <FlatList
        data={hdKeyringsWithSnapAccounts}
        contentContainerStyle={styles.srpListContentContainer}
        renderItem={({ item, index }) => (
          <SRPListItem
            key={item.metadata.id}
            keyring={item}
            name={`${strings('accounts.secret_recovery_phrase')} ${index + 1}`}
            onActionComplete={() => onKeyringSelect(item.metadata.id)}
          />
        )}
        scrollEnabled
        nestedScrollEnabled
      />
    </View>
  );
};

export default SRPList;
