import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, Text } from 'react-native';
import { colors, fontStyles } from '../../styles/common';

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

export default class NavbarTitle extends Component {
	static propTypes = {
		network: PropTypes.object.isRequired,
		title: PropTypes.string.isRequired
	};

	render() {
		const { network, title } = this.props;
		return (
			<View style={styles.wrapper}>
				<Text style={styles.title}>{title}</Text>
				<View style={styles.network}>
					<View
						style={[
							styles.networkIcon,
							network && network.color ? { backgroundColor: network.color } : null
						]}
					/>
					<Text style={styles.networkName}>{network && network.name}</Text>
				</View>
			</View>
		);
	}
}
