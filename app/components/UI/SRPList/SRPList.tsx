import React from 'react';
import { FlatList, View } from 'react-native';
import { strings } from '../../../../locales/i18n';
import { useSelector } from 'react-redux';
import { selectHdKeyrings } from '../../../selectors/keyringController';
import { SRPListProps } from './SRPList.types';
import { useStyles } from '../../hooks/useStyles';
import styleSheet from './SRPList.styles';
import SRPListItem from '../SRPListItem';

const SRPList = ({ onKeyringSelect }: SRPListProps) => {
  const { styles } = useStyles(styleSheet, {});
  const hdKeyrings = useSelector(selectHdKeyrings);

  return (
    <View style={styles.base} testID="srp-list">
      <FlatList
        data={hdKeyrings}
        contentContainerStyle={styles.srpListContentContainer}
        renderItem={({ item, index }) => (
          <SRPListItem
            testID={`srp-list-item-${index}`}
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
