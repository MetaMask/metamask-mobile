import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import * as Keychain from 'react-native-keychain'; // eslint-disable-line import/no-namespace
import { StyleSheet, View } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import SettingsList from 'react-native-settings-list'; // eslint-disable-line import/default
import { strings } from '../../../locales/i18n';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.slate,
		flex: 1
	},
	separator: {
		marginTop: 15
	}
});

/**
 * View that contains all the different
 * app settings
 */
class Settings extends Component {
	static navigationOptions = {
		title: strings('settings.title'),
		headerTruncatedBackTitle: strings('navigation.back'),
		headerTitleStyle: {
			fontSize: 20,
			...fontStyles.normal
		}
	};

	static propTypes = {
		/**
		 * Object that contains the whole background state
		 */
		backgroundState: PropTypes.object,
		/**
		 * Object that contains the navigator
		 */
		navigation: PropTypes.object
	};
	logout = async () => {
		await Keychain.resetGenericPassword();
		this.props.navigation.navigate('Entry');
	};

	goToNetworkSettings = () => {
		this.props.navigation.push('NetworkSettings');
	};

	goToSeedWords = () => {
		this.props.navigation.push('SeedWords');
	};

	goToSyncWithExtension = () => {
		this.props.navigation.push('SyncWithExtension', { existingUser: true });
	};

	render() {
		const { CurrencyRateController, NetworkController, NetworkStatusController } = this.props.backgroundState;

		return (
			<View style={styles.wrapper} testID={'settings-screen'}>
				<SettingsList borderColor={colors.borderColor} defaultItemSize={50}>
					<SettingsList.Header headerStyle={styles.separator} />
					<SettingsList.Item
						title={'ETH'}
						titleInfo={`$ ${CurrencyRateController.conversionRate} USD`}
						hasNavArrow={false}
					/>
					<SettingsList.Header headerStyle={styles.separator} />
					<SettingsList.Item
						title={strings('settings.network')}
						titleInfo={NetworkController.provider.type}
						onPress={this.goToNetworkSettings}
					/>
					<SettingsList.Item
						title={strings('settings.network_status')}
						titleInfo={NetworkStatusController.networkStatus.infura[NetworkController.provider.type]}
						hasNavArrow={false}
					/>
					<SettingsList.Header headerStyle={styles.separator} />
					<SettingsList.Item title={strings('settings.seed_words')} onPress={this.goToSeedWords} />
					<SettingsList.Header headerStyle={styles.separator} />
					<SettingsList.Item
						title={strings('settings.sync_with_extension')}
						onPress={this.goToSyncWithExtension}
					/>
					<SettingsList.Header headerStyle={styles.separator} />
					<SettingsList.Item title={strings('settings.logout')} onPress={this.logout} />
				</SettingsList>
			</View>
		);
	}
}

const mapStateToProps = state => ({ backgroundState: state.backgroundState });
export default connect(mapStateToProps)(Settings);
