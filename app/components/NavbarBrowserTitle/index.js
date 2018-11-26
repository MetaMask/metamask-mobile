import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { View, StyleSheet, Text } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import Networks from '../../util/networks';
import Icon from 'react-native-vector-icons/FontAwesome';

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
		flex: 1,
		marginHorizontal: 10
	},
	lockIcon: {
		marginTop: 2,
		marginRight: 10
	},
	currentUrl: {
		...fontStyles.normal,
		fontSize: 14,
		textAlign: 'center'
	}
});

const metamask_name = require('../../images/metamask-name.png'); // eslint-disable-line

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
		https: PropTypes.bool
	};

	render = () => {
		const { https, network, hostname } = this.props;
		const { color, name } = Networks[network.provider.type];
		return (
			<View style={styles.wrapper}>
				<View style={styles.currentUrlWrapper}>
					{https ? <Icon name="lock" size={14} style={styles.lockIcon} /> : null}
					<Text style={styles.currentUrl}>{hostname}</Text>
				</View>
				<View style={styles.network}>
					<View style={[styles.networkIcon, color ? { backgroundColor: color } : null]} />
					<Text style={styles.networkName} testID={'navbar-title-network'}>
						{name}
					</Text>
				</View>
			</View>
		);
	};
}

const mapStateToProps = state => ({ network: state.backgroundState.NetworkController });
export default connect(mapStateToProps)(NavbarBrowserTitle);
