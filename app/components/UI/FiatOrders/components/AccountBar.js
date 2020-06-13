import React from 'react';
import PropTypes from 'prop-types';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { connect } from 'react-redux';

import { colors, fontStyles } from '../../../../styles/common';
import { toggleAccountsModal } from '../../../../actions/modals';
import EthereumAddress from '../../EthereumAddress';
import Identicon from '../../Identicon';

const styles = StyleSheet.create({
	container: {
		backgroundColor: colors.grey000,
		padding: 15,
		alignItems: 'center'
	},
	addressContainer: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center'
	},
	depositingText: {
		...fontStyles.thin,
		fontSize: 12,
		textAlign: 'center'
	},
	accountText: {
		...fontStyles.bold,
		textAlign: 'center',
		margin: 3
	}
});
const AccountBar = ({ toggleAccountsModal, selectedAddress, identities }) => (
	<TouchableOpacity style={styles.container} onPress={toggleAccountsModal}>
		<>
			<Text style={styles.depositingText}>Depositing to:</Text>
			<View style={styles.addressContainer}>
				<Identicon diameter={15} address={selectedAddress} />
				<Text style={styles.accountText}>
					{identities[selectedAddress].name} (<EthereumAddress address={selectedAddress} type={'short'} />)
				</Text>
			</View>
		</>
	</TouchableOpacity>
);

AccountBar.propTypes = {
	toggleAccountsModal: PropTypes.func.isRequired,
	selectedAddress: PropTypes.string.isRequired,
	identities: PropTypes.object.isRequired
};

const mapStateToProps = state => ({
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	identities: state.engine.backgroundState.PreferencesController.identities
});

const mapDispatchToProps = dispatch => ({
	toggleAccountsModal: () => dispatch(toggleAccountsModal())
});
export default connect(
	mapStateToProps,
	mapDispatchToProps
)(AccountBar);
