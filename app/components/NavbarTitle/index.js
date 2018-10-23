import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Image, View, StyleSheet, Text } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import Networks from '../../util/networks';

const styles = StyleSheet.create({
	wrapper: {
		alignItems: 'center',
		flex: 1
	},
	network: {
		flexDirection: 'row'
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
		network: PropTypes.object.isRequired
	};

	render() {
		const { network } = this.props;
		const { color, name } = Networks[network.provider.type];
		return (
			<View style={styles.wrapper}>
				<Image source={metamask_name} style={styles.metamaskName} resizeMethod={'auto'} />
				<View style={styles.network}>
					<View style={[styles.networkIcon, color ? { backgroundColor: color } : null]} />
					<Text style={styles.networkName} testID={'navbar-title-network'}>
						{name}
					</Text>
				</View>
			</View>
		);
	}
}

const mapStateToProps = state => ({ network: state.backgroundState.NetworkController });
export default connect(mapStateToProps)(NavbarTitle);
