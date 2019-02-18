import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { TouchableOpacity, View, StyleSheet, Text } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import Networks from '../../../util/networks';
import { toggleNetworkModal } from '../../../actions/modals';

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
	title: {
		fontSize: 18,
		...fontStyles.normal
	},
	otherNetworkIcon: {
		backgroundColor: colors.transparent,
		borderColor: colors.borderColor,
		borderWidth: 1
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
		title: PropTypes.string,
		/**
		 * Action that toggles the network modal
		 */
		toggleNetworkModal: PropTypes.func
	};

	openNetworkList = () => {
		this.props.toggleNetworkModal();
	};

	render = () => {
		const { network, title } = this.props;
		const { color, name } = Networks[network.provider.type] || { ...Networks.rpc, color: null };

		return (
			<TouchableOpacity onPress={this.openNetworkList} style={styles.wrapper}>
				{title ? <Text style={styles.title}>{title}</Text> : null}
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
)(NavbarTitle);
