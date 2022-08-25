import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet } from 'react-native';
import { connect } from 'react-redux';
import { useNavigation } from '@react-navigation/native';

import EthereumAddress from '../../EthereumAddress';
import Identicon from '../../Identicon';
import Text from '../../../Base/Text';
import SelectorButton from '../../../Base/SelectorButton';
import Routes from '../../../../constants/navigation/Routes';

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
const AccountSelector = ({ selectedAddress, identities }) => {
  const navigation = useNavigation();

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

AccountSelector.propTypes = {
  selectedAddress: PropTypes.string.isRequired,
  identities: PropTypes.object.isRequired,
};

const mapStateToProps = (state) => ({
  selectedAddress:
    state.engine.backgroundState.PreferencesController.selectedAddress,
  identities: state.engine.backgroundState.PreferencesController.identities,
});

export default connect(mapStateToProps, null)(AccountSelector);
