import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import EthereumAddress from '../../EthereumAddress';
import Identicon from '../../Identicon';
import Text from '../../../Base/Text';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../../../util/theme';

const createStyles = (colors) =>
	StyleSheet.create({
		selector: {
			flexShrink: 1,
		},
		accountText: {
			flexShrink: 1,
			marginVertical: 3,
			marginHorizontal: 5,
		},
		container: {
			backgroundColor: colors.background.alternative,
			paddingVertical: 8,
			paddingHorizontal: 10,
			borderRadius: 100,
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			flexShrink: 1,
		},
	});
const Account = ({ selectedAddress, identities }) => {
	const { colors } = useTheme();
	const styles = createStyles(colors);
	return (
		<View style={styles.container}>
			<Identicon diameter={15} address={selectedAddress} />
			<Text style={styles.accountText} primary centered numberOfLines={1}>
				{identities[selectedAddress]?.name} (
				<EthereumAddress address={selectedAddress} type={'short'} />)
			</Text>
		</View>
	);
};

Account.propTypes = {
	selectedAddress: PropTypes.string.isRequired,
	identities: PropTypes.object.isRequired,
};

const mapStateToProps = (state) => ({
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	identities: state.engine.backgroundState.PreferencesController.identities,
});

export default connect(mapStateToProps)(Account);
