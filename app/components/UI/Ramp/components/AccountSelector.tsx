import React from 'react';
import { StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';

import EthereumAddress from '../../EthereumAddress';
import JSIdenticon from '../../Identicon';
import Text from '../../../Base/Text';
import JSSelectorButton from '../../../Base/SelectorButton';
import { useNavigation } from '@react-navigation/native';
import { createAccountSelectorNavDetails } from '../../../Views/AccountSelector';
import { selectSelectedInternalAccount } from '../../../../selectors/accountsController';
import { toChecksumHexAddress } from '@metamask/controller-utils';

// TODO: Convert into typescript and correctly type
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SelectorButton = JSSelectorButton as any;
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Identicon = JSIdenticon as any;

const styles = StyleSheet.create({
  selector: {
    flexShrink: 1,
  },
  accountText: {
    flexShrink: 1,
    marginVertical: 3,
    marginHorizontal: 5,
  },
});

const AccountSelector = () => {
  const navigation = useNavigation();
  const selectedInternalAccount = useSelector(selectSelectedInternalAccount);

  const openAccountSelector = () =>
    navigation.navigate(...createAccountSelectorNavDetails());

  return (
    <SelectorButton onPress={openAccountSelector} style={styles.selector}>
      {selectedInternalAccount ? (
        <>
          <Identicon
            diameter={15}
            address={toChecksumHexAddress(selectedInternalAccount.address)}
          />
          <Text style={styles.accountText} primary centered numberOfLines={1}>
            {selectedInternalAccount.metadata.name.length > 13
              ? `${selectedInternalAccount.metadata.name.substr(0, 13)}...`
              : selectedInternalAccount.metadata.name}{' '}
            (
            <EthereumAddress
              address={toChecksumHexAddress(selectedInternalAccount.address)}
              type={'short'}
            />
            )
          </Text>
        </>
      ) : (
        <Text style={styles.accountText}>Account is loading...</Text>
      )}
    </SelectorButton>
  );
};

export default AccountSelector;
