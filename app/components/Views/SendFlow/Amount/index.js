import React, { PureComponent } from 'react';
import { colors } from '../../../../styles/common';
import { StyleSheet, Text, SafeAreaView, View } from 'react-native';
import { connect } from 'react-redux';
import { setRecipient, newTransaction } from '../../../../actions/newTransaction';
import { getSendFlowTitle } from '../../../UI/Navbar';
import StyledButton from '../../../UI/StyledButton';
import PropTypes from 'prop-types';

const styles = StyleSheet.create({
	wrapper: {
		flex: 1,
		backgroundColor: colors.white
	}
});

/**
 * View that wraps the wraps the "Send" screen
 */
class Amount extends PureComponent {
	static navigationOptions = ({ navigation }) => getSendFlowTitle('send.amount', navigation);

	static propTypes = {
		/**
		 * Object that represents the navigator
		 */
		navigation: PropTypes.object
	};

	onNext = () => {
		const { navigation } = this.props;
		navigation.navigate('Confirm');
	};

	render = () => (
		<SafeAreaView style={styles.wrapper}>
			<Text>Amount</Text>
			<View style={styles.buttonNextWrapper}>
				<StyledButton type={'confirm'} containerStyle={styles.buttonNext} onPress={this.onNext}>
					Next
				</StyledButton>
			</View>
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
)(Amount);
