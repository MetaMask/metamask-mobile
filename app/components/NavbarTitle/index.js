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

class NavbarTitle extends Component {
	static propTypes = {
		network: PropTypes.object.isRequired,
		title: PropTypes.string.isRequired
	};

	render() {
		const { network, title } = this.props;
		const networkInfo = Networks[network.provider.type];
		return (
			<View style={styles.wrapper}>
				<Text style={styles.title}>{title}</Text>
				<View style={styles.network}>
					<View
						style={[styles.networkIcon, networkInfo.color ? { backgroundColor: networkInfo.color } : null]}
					/>
					<Text style={styles.networkName}>{networkInfo.name}</Text>
				</View>
			</View>
		);
	}
}

const mapStateToProps = state => ({ network: state.backgroundState.network });
export default connect(mapStateToProps)(NavbarTitle);
