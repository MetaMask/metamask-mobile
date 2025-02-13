import React from 'react';
import { View } from 'react-native';
import { strings } from '../../../../locales/i18n';
import { useSelector } from 'react-redux';
import { selectKeyrings } from '../../../selectors/keyringController';
import ExtendedKeyringTypes from '../../../constants/keyringTypes';
import { SRPListProps } from './SRPList.types';
import { useStyles } from '../../hooks/useStyles';
import styleSheet from './SRPList.styles';
import SRPListItem from '../SRPListItem';

const SRPList = ({ onKeyringSelect }: SRPListProps) => {
  const { styles } = useStyles(styleSheet, {});
  const keyrings = useSelector(selectKeyrings);

  return (
    <View style={styles.base} testID="srp-list">
      {keyrings
        .filter((keyring) => keyring.type === ExtendedKeyringTypes.hd)
        .map((keyring, index) => (
          <SRPListItem
            key={keyring.metadata.id}
            keyring={keyring}
            name={`${strings('accounts.secret_recovery_phrase')} ${index + 1}`}
            onActionComplete={() => onKeyringSelect(keyring.metadata.id)}
          />
        ))}
    </View>
  );
};

export default SRPList;
