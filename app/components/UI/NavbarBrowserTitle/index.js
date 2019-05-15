import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Platform, TouchableOpacity, View, StyleSheet, Text } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import Networks from '../../../util/networks';
import Icon from 'react-native-vector-icons/FontAwesome';
import { toggleNetworkModal } from '../../../actions/modals';

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
		marginRight: 10
	},
	currentUrl: {
		...fontStyles.normal,
		fontSize: 14,
		textAlign: 'center'
	},
	currentUrlAndroid: {
		maxWidth: '60%'
	}
});

/**
 * UI Component that renders inside the navbar
 * showing the view title and the selected network
 */
class NavbarBrowserTitle extends Component {
	static propTypes = {
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
		 * Action that toggles the network modal
		 */
		toggleNetworkModal: PropTypes.func
	};

	openNetworkList = () => {
		this.props.toggleNetworkModal();
	};

	render = () => {
		const { https, network, hostname } = this.props;
		const { color, name } = Networks[network.provider.type] || { ...Networks.rpc, color: null };

		return (
			<TouchableOpacity onPress={this.openNetworkList} style={styles.wrapper}>
				<View style={styles.currentUrlWrapper}>
					{https ? <Icon name="lock" size={14} style={styles.lockIcon} /> : null}
					<Text
						numberOfLines={1}
						style={[styles.currentUrl, Platform.OS === 'android' ? styles.currentUrlAndroid : {}]}
					>
						{hostname}
					</Text>
				</View>
				<View style={styles.network}>
					<View style={[styles.networkIcon, color ? { backgroundColor: color } : styles.otherNetworkIcon]} />
					<Text style={styles.networkName} testID={'navbar-title-network'}>
						{name}
					</Text>
				</View>
			</TouchableOpacity>
		);
	};
}

const mapStateToProps = state => ({ network: state.engine.backgroundState.NetworkController });
const mapDispatchToProps = dispatch => ({
	toggleNetworkModal: () => dispatch(toggleNetworkModal())
});
export default connect(
	mapStateToProps,
	mapDispatchToProps
)(NavbarBrowserTitle);
