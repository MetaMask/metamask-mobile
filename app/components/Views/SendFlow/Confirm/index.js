import React, { PureComponent } from 'react';
import { colors } from '../../../../styles/common';
import { StyleSheet, Text, SafeAreaView } from 'react-native';
import { connect } from 'react-redux';
import { setRecipient, newTransaction } from '../../../../actions/newTransaction';
import { getSendFlowTitle } from '../../../UI/Navbar';

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		backgroundColor: colors.white
	}
});

/**
 * View that wraps the wraps the "Send" screen
 */
class Confirm extends PureComponent {
	static navigationOptions = ({ navigation }) => getSendFlowTitle('send.amount', navigation);

	static propTypes = {};

	render = () => (
		<SafeAreaView style={styles.wrapper}>
			<Text>Confirm</Text>
		</SafeAreaView>
	);
}

const mapStateToProps = state => ({
	accounts: state.engine.backgroundState.AccountTrackerController.accounts,
	addressBook: state.engine.backgroundState.AddressBookController.addressBook,
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress,
	identities: state.engine.backgroundState.PreferencesController.identities,
	keyrings: state.engine.backgroundState.KeyringController.keyrings,
	ticker: state.engine.backgroundState.NetworkController.provider.ticker,
	network: state.engine.backgroundState.NetworkController.network
});

const mapDispatchToProps = dispatch => ({
	newTransaction: () => dispatch(newTransaction()),
	setRecipient: (from, to, ensRecipient) => dispatch(setRecipient(from, to, ensRecipient))
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(Confirm);
