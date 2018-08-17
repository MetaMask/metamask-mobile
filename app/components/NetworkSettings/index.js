import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import Engine from '../../core/Engine';
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
 * network settings
 */
class NetworkSettings extends Component {
	static navigationOptions = {
		title: 'Network',
		headerTitleStyle: {
			fontSize: 20,
			...fontStyles.normal
		}
	};

	static propTypes = {
		/**
		 * Object that contains the whole background state
		 */
		backgroundState: PropTypes.object
	};

	changeNetwork(type) {
		const { NetworkController } = Engine.context;
		NetworkController.setProviderType(type);
	}

	mainnet = () => {
		this.changeNetwork('mainnet');
	};

	rinkeby = () => {
		this.changeNetwork('rinkeby');
	};

	ropsten = () => {
		this.changeNetwork('ropsten');
	};

	logout = () => {
		persistor.purge();
	};

	render() {
		const { NetworkController } = this.props.backgroundState;

		return (
			<View style={styles.wrapper}>
				<SettingsList borderColor={colors.borderColor} defaultItemSize={50}>
					<SettingsList.Header headerStyle={styles.separator} />
					<SettingsList.Item
						title={'mainnet'}
						titleInfo={NetworkController.provider.type === 'mainnet' ? 'selected' : null}
						onPress={this.mainnet}
						hasNavArrow={false}
					/>
					<SettingsList.Item
						title={'ropsten'}
						titleInfo={NetworkController.provider.type === 'ropsten' ? 'selected' : null}
						onPress={this.ropsten}
						hasNavArrow={false}
					/>
					<SettingsList.Item
						title={'rinkeby'}
						titleInfo={NetworkController.provider.type === 'rinkeby' ? 'selected' : null}
						onPress={this.rinkeby}
						hasNavArrow={false}
					/>
				</SettingsList>
			</View>
		);
	}
}

const mapStateToProps = state => ({ backgroundState: state.backgroundState });
export default connect(mapStateToProps)(NetworkSettings);
