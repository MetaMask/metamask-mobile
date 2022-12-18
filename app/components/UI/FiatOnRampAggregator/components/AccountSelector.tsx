import React from 'react';

import { StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';

import EthereumAddress from '../../EthereumAddress';
import JSIdenticon from '../../Identicon';
import BaseText from '../../../Base/Text';
import JSSelectorButton from '../../../Base/SelectorButton';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../constants/navigation/Routes';

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
  const navigation = useNavigation();
  const selectedAddress = useSelector(
    (state: any) =>
      state.engine.backgroundState.PreferencesController.selectedAddress,
  );

  const identities = useSelector(
    (state: any) =>
      state.engine.backgroundState.PreferencesController.identities,
  );

  const openAccountSelector = () =>
    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.ACCOUNT_SELECTOR,
    });

  return (
    <SelectorButton onPress={openAccountSelector} style={styles.selector}>
      <Identicon diameter={15} address={selectedAddress} />
      <Text style={styles.accountText} primary centered numberOfLines={1}>
        {identities[selectedAddress]?.name} (
        <EthereumAddress address={selectedAddress} type={'short'} />)
      </Text>
    </SelectorButton>
  );
};

export default AccountSelector;
