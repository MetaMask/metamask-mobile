import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { View, StyleSheet, Text } from 'react-native';
import { colors, fontStyles } from '../../styles/common';
import Networks from '../../util/networks';

const styles = StyleSheet.create({
	wrapper: {
		alignItems: 'center',
		flex: 1
	},
	title: {
		fontSize: 18,
		...fontStyles.normal
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
	}
});

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

	render() {
		const { network, title } = this.props;
		const { color, name } = Networks[network.provider.type];
		return (
			<View style={styles.wrapper}>
				<Text style={styles.title}>{title}</Text>
				<View style={styles.network}>
					<View style={[styles.networkIcon, color ? { backgroundColor: color } : null]} />
					<Text style={styles.networkName}>{name}</Text>
				</View>
			</View>
		);
	}
}

const mapStateToProps = state => ({ network: state.backgroundState.network });
export default connect(mapStateToProps)(NavbarTitle);
