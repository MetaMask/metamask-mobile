import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import Engine from '../../core/Engine';
import SettingsList from 'react-native-settings-list'; // eslint-disable-line import/default
import { strings } from '../../../locales/i18n';
import Icon from 'react-native-vector-icons/MaterialIcons';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.slate,
		flex: 1
	},
	separator: {
		marginTop: 15
	},
	iconRemove: {
		height: 30,
		marginLeft: 10,
		alignSelf: 'center'
	}
});

/**
 * View that contains all the different
 * network settings
 */
class NetworkSettings extends Component {
	static navigationOptions = () => ({
		title: strings('network.title'),
		headerTitleStyle: {
			fontSize: 20,
			...fontStyles.normal
		}
	});

	static propTypes = {
		/**
		 * Object that contains the whole background state
		 */
		provider: PropTypes.object,
		/**
		 * A list of custom RPCs to provide the user
		 */
		frequentRpcList: PropTypes.array
	};

	changeNetwork = type => {
		const { NetworkController } = Engine.context;
		NetworkController.setProviderType(type);
	};

	mainnet = () => {
		this.changeNetwork('mainnet');
	};

	rinkeby = () => {
		this.changeNetwork('rinkeby');
	};

	ropsten = () => {
		this.changeNetwork('ropsten');
	};

	setRpcTarget = rpcTarget => {
		const { NetworkController } = Engine.context;
		NetworkController.setRpcTarget(rpcTarget);
	};

	removeRpcTarget = rpcTarget => {
		const { PreferencesController } = Engine.context;
		PreferencesController.removeFromFrequentRpcList(rpcTarget);
	};

	render() {
		const { provider, frequentRpcList } = this.props;

		return (
			<View style={styles.wrapper} testID={'network-settings-screen'}>
				<SettingsList borderColor={colors.borderColor} defaultItemSize={50}>
					<SettingsList.Header headerStyle={styles.separator} />
					<SettingsList.Item
						title={'mainnet'}
						titleInfo={provider.type === 'mainnet' ? strings('network.selected') : null}
						onPress={this.mainnet}
						hasNavArrow={false}
					/>
					<SettingsList.Item
						title={'ropsten'}
						titleInfo={provider.type === 'ropsten' ? strings('network.selected') : null}
						onPress={this.ropsten}
						hasNavArrow={false}
					/>
					<SettingsList.Item
						title={'rinkeby'}
						titleInfo={provider.type === 'rinkeby' ? strings('network.selected') : null}
						onPress={this.rinkeby}
						hasNavArrow={false}
					/>
					{frequentRpcList.map(url => {
						const rpcUrlSelected = provider.type === 'rpc' && provider.rpcTarget === url;
						return (
							<SettingsList.Item
								icon={
									rpcUrlSelected ? null : (
										<View style={styles.iconRemove}>
											<Icon
												name="remove-circle"
												size={25}
												color={colors.fontTertiary}
												onPress={() => this.removeRpcTarget(url)} // eslint-disable-line
											/>
										</View>
									)
								}
								title={url}
								titleInfo={rpcUrlSelected ? strings('network.selected') : null}
								key={url}
								onPress={() => this.setRpcTarget(url)} // eslint-disable-line
								hasNavArrow={false}
							/>
						);
					})}
				</SettingsList>
			</View>
		);
	}
}

const mapStateToProps = state => ({
	frequentRpcList: state.backgroundState.PreferencesController.frequentRpcList,
	provider: state.backgroundState.NetworkController.provider
});

export default connect(mapStateToProps)(NetworkSettings);
