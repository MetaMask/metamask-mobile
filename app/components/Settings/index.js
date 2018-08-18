import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import { persistor } from '../../store';
import SettingsList from 'react-native-settings-list'; // eslint-disable-line import/default

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
		title: 'Settings',
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
	logout = () => {
		persistor.purge();
	};

	goToNetworkSettings = () => {
		this.props.navigation.push('NetworkSettings');
	};

	goToSeedWords = () => {
		this.props.navigation.push('SeedWords');
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
						title="Network"
						titleInfo={NetworkController.provider.type}
						onPress={this.goToNetworkSettings}
					/>
					<SettingsList.Item
						title="Network Status"
						titleInfo={NetworkStatusController.networkStatus.infura[NetworkController.provider.type]}
						hasNavArrow={false}
					/>
					<SettingsList.Header headerStyle={styles.separator} />
					<SettingsList.Item title="Seed Words" onPress={this.goToSeedWords} />
					<SettingsList.Header headerStyle={styles.separator} />
					<SettingsList.Item title="Logout" onPress={this.logout} />
				</SettingsList>
			</View>
		);
	}
}

const mapStateToProps = state => ({ backgroundState: state.backgroundState });
export default connect(mapStateToProps)(Settings);
