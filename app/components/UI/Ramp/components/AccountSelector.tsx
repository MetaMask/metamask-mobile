import React from 'react';

import { StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';

import EthereumAddress from '../../EthereumAddress';
import JSIdenticon from '../../Identicon';
import Text from '../../../Base/Text';
import JSSelectorButton from '../../../Base/SelectorButton';
import { useNavigation } from '@react-navigation/native';
import { createAccountSelectorNavDetails } from '../../../Views/AccountSelector';
import { selectIdentities } from '../../../../selectors/preferencesController';
import selectSelectedInternalAccount from '../../../../selectors/accountsController';
import { toChecksumAddress } from 'ethereumjs-util';

// TODO: Convert into typescript and correctly type
const SelectorButton = JSSelectorButton as any;
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
  const checksummedSelectedAddress = toChecksumAddress(
    selectedInternalAccount.address,
  );

  const identities = useSelector(selectIdentities);

  const openAccountSelector = () =>
    navigation.navigate(...createAccountSelectorNavDetails());

  return (
    <SelectorButton onPress={openAccountSelector} style={styles.selector}>
      <Identicon diameter={15} address={checksummedSelectedAddress} />
      <Text style={styles.accountText} primary centered numberOfLines={1}>
        {identities[checksummedSelectedAddress]?.name.length > 13
          ? `${identities[checksummedSelectedAddress]?.name.substr(0, 13)}...`
          : identities[checksummedSelectedAddress]?.name}{' '}
        (
        <EthereumAddress address={checksummedSelectedAddress} type={'short'} />)
      </Text>
    </SelectorButton>
  );
};

export default AccountSelector;
