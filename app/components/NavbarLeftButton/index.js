import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { TouchableOpacity, StyleSheet } from 'react-native';
import Identicon from '../Identicon';

const styles = StyleSheet.create({
	leftButton: {
		marginTop: 12,
		marginLeft: 12,
		marginBottom: 12
	}
});

/**
 * UI Component that renders on the top left of the navbar
 * showing an identicon for the selectedAddress
 */
class NavbarLeftButton extends Component {
	static propTypes = {
		/**
		 * Selected address as string
		 */
		address: PropTypes.string,
		/**
		 * action to be fired on press
		 */
		onPress: PropTypes.func
	};

	render() {
		const { address, onPress } = this.props;
		return (
			<TouchableOpacity style={styles.leftButton} onPress={onPress}>
				<Identicon diameter={30} address={address} />
			</TouchableOpacity>
		);
	}
}

const mapStateToProps = state => ({ address: state.backgroundState.PreferencesController.selectedAddress });
export default connect(mapStateToProps)(NavbarLeftButton);
