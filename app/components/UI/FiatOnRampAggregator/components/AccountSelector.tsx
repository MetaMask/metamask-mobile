import React, { useCallback } from 'react';

import { StyleSheet } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

import { toggleAccountsModal } from '../../../../actions/modals';
import EthereumAddress from '../../EthereumAddress';
import JSIdenticon from '../../Identicon';
import BaseText from '../../../Base/Text';
import JSSelectorButton from '../../../Base/SelectorButton';

// TODO: Convert into typescript and correctly type
const SelectorButton = JSSelectorButton as any;
const Text = BaseText as any;
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
  const dispatch = useDispatch();
  const selectedAddress = useSelector(
    (state: any) =>
      state.engine.backgroundState.PreferencesController.selectedAddress,
  );

  const identities = useSelector(
    (state: any) =>
      state.engine.backgroundState.PreferencesController.identities,
  );

  const handleToggleAccountsModal = useCallback(() => {
    dispatch(toggleAccountsModal());
  }, [dispatch]);
  return (
    <SelectorButton onPress={handleToggleAccountsModal} style={styles.selector}>
      <Identicon diameter={15} address={selectedAddress} />
      <Text style={styles.accountText} primary centered numberOfLines={1}>
        {identities[selectedAddress]?.name} (
        <EthereumAddress address={selectedAddress} type={'short'} />)
      </Text>
    </SelectorButton>
  );
};

export default AccountSelector;
