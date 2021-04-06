import PropTypes from 'prop-types';
import React, { PureComponent } from 'react';
import { StyleSheet, Text, ScrollView, View } from 'react-native';
import { connect } from 'react-redux';
import StyledButton from '../../../UI/StyledButton';
import { colors, fontStyles } from '../../../../styles/common';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';
import { strings } from '../../../../../locales/i18n';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
		padding: 24,
		paddingBottom: 48
	},
	title: {
		...fontStyles.normal,
		color: colors.fontPrimary,
		fontSize: 20,
		lineHeight: 20
	},
	desc: {
		...fontStyles.normal,
		color: colors.grey500,
		fontSize: 14,
		lineHeight: 20,
		marginTop: 12
	},
	setting: {
		marginVertical: 18
	},
	clearHistoryConfirm: {
		marginTop: 18
	}
});

/**
 * Main view for app Experimental Settings
 */
class ExperimentalSettings extends PureComponent {
	static propTypes = {
		/**
		/* navigation object required to push new views
		*/
		navigation: PropTypes.object
	};

	static navigationOptions = ({ navigation }) =>
		getNavigationOptionsTitle(strings('app_settings.experimental_title'), navigation);

	goToWalletConnectSessions = () => {
		this.props.navigation.navigate('WalletConnectSessionsView');
	};

	render = () => (
		<ScrollView style={styles.wrapper}>
			<View style={styles.setting}>
				<View>
					<Text style={styles.title}>{strings('experimental_settings.wallet_connect_dapps')}</Text>
					<Text style={styles.desc}>{strings('experimental_settings.wallet_connect_dapps_desc')}</Text>
					<StyledButton
						type="normal"
						onPress={this.goToWalletConnectSessions}
						containerStyle={styles.clearHistoryConfirm}
					>
						{strings('experimental_settings.wallet_connect_dapps_cta')}
					</StyledButton>
				</View>
			</View>
		</ScrollView>
	);
}

const mapStateToProps = state => ({
	selectedAddress: state.engine.backgroundState.PreferencesController.selectedAddress
});

export default connect(mapStateToProps)(ExperimentalSettings);
