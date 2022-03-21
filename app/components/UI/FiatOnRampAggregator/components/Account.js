import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import EthereumAddress from '../../EthereumAddress';
import Identicon from '../../Identicon';
import Text from '../../../Base/Text';
import { colors } from '../../../../styles/common';
import { View, StyleSheet, TouchableOpacity } from 'react-native';

const styles = StyleSheet.create({
	selector: {
		flexShrink: 1,
	},
	accountText: {
		flexShrink: 1,
		marginVertical: 3,
		marginHorizontal: 5,
	},
	container: {
		backgroundColor: colors.grey000,
		paddingVertical: 8,
		paddingHorizontal: 10,
		borderRadius: 100,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
	},
});
const Account = ({ selectedAddress, identities }) => (
	<TouchableOpacity style={styles.selector}>
		<View style={styles.container}>
			<Identicon diameter={15} address={selectedAddress} />
			<Text style={styles.accountText} primary centered numberOfLines={1}>
				{identities[selectedAddress]?.name} (
				<EthereumAddress address={selectedAddress} type={'short'} />)
			</Text>
		</View>
	</TouchableOpacity>
);

Account.propTypes = {
	selectedAddress: PropTypes.string.isRequired,
	identities: PropTypes.object.isRequired,
};

const mapStateToProps = (state) => ({
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	identities: state.engine.backgroundState.PreferencesController.identities,
});

export default connect(mapStateToProps)(Account);
