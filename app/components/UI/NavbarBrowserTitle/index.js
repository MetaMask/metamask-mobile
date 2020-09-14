import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { TouchableOpacity, View, StyleSheet, Text, Image } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import Networks from '../../../util/networks';
import Icon from 'react-native-vector-icons/FontAwesome';
import Device from '../../../util/Device';

const styles = StyleSheet.create({
	wrapper: {
		alignItems: 'center',
		flex: 1
	},
	network: {
		flexDirection: 'row',
		marginBottom: 5
	},
	networkName: {
		marginTop: -3,
		fontSize: 11,
		lineHeight: 11,
		color: colors.fontSecondary,
		...fontStyles.normal
	},
	networkIcon: {
		width: 5,
		height: 5,
		borderRadius: 100,
		marginRight: 5
	},
	currentUrlWrapper: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		flex: 1
	},
	lockIcon: {
		marginTop: 2,
		marginLeft: 10
	},
	currentUrl: {
		...fontStyles.normal,
		fontSize: 14,
		textAlign: 'center'
	},
	currentUrlAndroid: {
		maxWidth: '60%'
	},
	siteIcon: {
		width: 16,
		height: 16,
		marginRight: 4
	}
});

/**
 * UI PureComponent that renders inside the navbar
 * showing the view title and the selected network
 */
class NavbarBrowserTitle extends PureComponent {
	static propTypes = {
		/**
		 * Object representing the navigator
		 */
		navigation: PropTypes.object,
		/**
		 * String representing the current url
		 */
		url: PropTypes.string,
		/**
		 * Object representing the selected the selected network
		 */
		network: PropTypes.object.isRequired,
		/**
		 * hostname of the current webview
		 */
		hostname: PropTypes.string.isRequired,
		/**
		 * Boolean that specifies if it is a secure website
		 */
		https: PropTypes.bool,
		/**
		 * Boolean that specifies if there is an error
		 */
		error: PropTypes.bool,
		/**
		 * Website icon
		 */
		icon: PropTypes.string
	};

	onTitlePress = () => {
		const showUrlModal = this.props.navigation.getParam('showUrlModal', () => null);
		showUrlModal({ urlInput: this.props.url });
	};

	getNetworkName(network) {
		let name = { ...Networks.rpc, color: null }.name;

		if (network && network.provider) {
			if (network.provider.nickname) {
				name = network.provider.nickname;
			} else if (network.provider.type) {
				const currentNetwork = Networks[network.provider.type];
				if (currentNetwork && currentNetwork.name) {
					name = currentNetwork.name;
				}
			}
		}

		return name;
	}

	render = () => {
		const { https, network, hostname, error, icon } = this.props;
		const color = (Networks[network.provider.type] && Networks[network.provider.type].color) || null;
		const name = this.getNetworkName(network);
		return (
			<TouchableOpacity onPress={this.onTitlePress} style={styles.wrapper}>
				<View style={styles.currentUrlWrapper}>
					{icon && <Image style={styles.siteIcon} source={{ uri: icon }} />}
					<Text
						numberOfLines={1}
						ellipsizeMode={'head'}
						style={[styles.currentUrl, Device.isAndroid() ? styles.currentUrlAndroid : {}]}
					>
						{hostname}
					</Text>
					{https && !error ? <Icon name="lock" size={14} style={styles.lockIcon} /> : null}
				</View>
				<View style={styles.network}>
					<View style={[styles.networkIcon, { backgroundColor: color || colors.red }]} />
					<Text style={styles.networkName} testID={'navbar-title-network'}>
						{name}
					</Text>
				</View>
			</TouchableOpacity>
		);
	};
}

const mapStateToProps = state => ({ network: state.engine.backgroundState.NetworkController });

export default connect(mapStateToProps)(NavbarBrowserTitle);
