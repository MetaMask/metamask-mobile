import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Platform, Image, View, StyleSheet, Text } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import Networks from '../../util/networks';

const styles = StyleSheet.create({
	wrapper: {
		alignItems: 'center',
		flex: 1
	},
	network: {
		flexDirection: 'row',
		marginLeft: Platform.OS === 'android' ? -52 : 0
	},
	networkName: {
		fontSize: 11,
		color: colors.fontSecondary,
		...fontStyles.normal
	},
	networkIcon: {
		width: 5,
		height: 5,
		borderRadius: 100,
		marginRight: 5,
		marginTop: 5
	},
	metamaskName: {
		width: 94,
		height: 12,
		marginBottom: 5
	},
	title: {
		fontSize: 18,
		marginLeft: Platform.OS === 'android' ? -52 : 0,
		...fontStyles.normal
	},
	otherNetworkIcon: {
		backgroundColor: colors.transparent,
		borderColor: colors.borderColor,
		borderWidth: 1
	}
});

const metamask_name = require('../../images/metamask-name.png'); // eslint-disable-line

/**
 * UI Component that renders inside the navbar
 * showing the view title and the selected network
 */
class NavbarTitle extends Component {
	static propTypes = {
		/**
		 * Object representing the selected the selected network
		 */
		network: PropTypes.object.isRequired,
		/**
		 * Name of the current view
		 */
		title: PropTypes.string.isRequired
	};

	render = () => {
		const { network, title } = this.props;
		const { color, name } = Networks[network.provider.type] || { ...Networks.rpc, color: null };

		return (
			<View style={styles.wrapper}>
				{!title ? (
					<Image source={metamask_name} style={styles.metamaskName} resizeMethod={'auto'} />
				) : (
					<Text style={styles.title}>{title}</Text>
				)}
				<View style={styles.network}>
					<View style={[styles.networkIcon, color ? { backgroundColor: color } : styles.otherNetworkIcon]} />
					<Text style={styles.networkName} testID={'navbar-title-network'}>
						{name}
					</Text>
				</View>
			</View>
		);
	};
}

const mapStateToProps = state => ({ network: state.engine.backgroundState.NetworkController });
export default connect(mapStateToProps)(NavbarTitle);
