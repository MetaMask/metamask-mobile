import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Platform, TouchableOpacity, StyleSheet } from 'react-native';
import { toggleCollectibleContractModal } from '../../actions/modals';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import { colors } from '../../styles/common';

const styles = StyleSheet.create({
	infoButton: {
		paddingLeft: Platform.OS === 'android' ? 22 : 18,
		paddingRight: Platform.OS === 'android' ? 22 : 18,
		marginTop: 5
	},
	infoIcon: {
		color: colors.primary
	}
});

/**
 * UI Component that renders inside the navbar
 * showing an information icon
 */
class NavbarCollectibleContractInformation extends Component {
	static propTypes = {
		/**
		 * Action that toggles the collectible contract information
		 */
		toggleCollectibleContractModal: PropTypes.func
	};

	openCollectibleContractInformation = () => {
		this.props.toggleCollectibleContractModal();
	};

	render = () => (
		<TouchableOpacity style={styles.infoButton} onPress={this.openCollectibleContractInformation}>
			<IonicIcon name="ios-information-circle-outline" size={28} style={styles.infoIcon} />
		</TouchableOpacity>
	);
}

const mapDispatchToProps = dispatch => ({
	toggleCollectibleContractModal: () => dispatch(toggleCollectibleContractModal())
});
export default connect(
	null,
	mapDispatchToProps
)(NavbarCollectibleContractInformation);
