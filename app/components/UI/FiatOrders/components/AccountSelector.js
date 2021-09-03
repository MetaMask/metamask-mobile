import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet } from 'react-native';
import { connect } from 'react-redux';

import { toggleAccountsModal } from '../../../../actions/modals';
import EthereumAddress from '../../EthereumAddress';
import Identicon from '../../Identicon';
import Text from '../../../Base/Text';
import SelectorButton from '../../../Base/SelectorButton';

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
const AccountSelector = ({ toggleAccountsModal, selectedAddress, identities }) => (
	<SelectorButton onPress={toggleAccountsModal} style={styles.selector}>
		<Identicon diameter={15} address={selectedAddress} />
		<Text style={styles.accountText} primary centered numberOfLines={1}>
			{identities[selectedAddress]?.name} (<EthereumAddress address={selectedAddress} type={'short'} />)
		</Text>
	</SelectorButton>
);

AccountSelector.propTypes = {
	toggleAccountsModal: PropTypes.func.isRequired,
	selectedAddress: PropTypes.string.isRequired,
	identities: PropTypes.object.isRequired,
};

const mapStateToProps = (state) => ({
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	identities: state.engine.backgroundState.PreferencesController.identities,
});

const mapDispatchToProps = (dispatch) => ({
	toggleAccountsModal: () => dispatch(toggleAccountsModal()),
});
export default connect(mapStateToProps, mapDispatchToProps)(AccountSelector);
