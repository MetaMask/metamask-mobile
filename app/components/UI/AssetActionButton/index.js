import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicon from 'react-native-vector-icons/Ionicons';
import { colors } from '../../../styles/common';
import Device from '../../../util/Device';
import Text from '../../Base/Text';

const styles = StyleSheet.create({
	button: {
		flex: 1,
		justifyContent: 'center',
		alignContent: 'center',
		alignItems: 'center'
	},
	disabledButton: {
		opacity: 0.5
	},
	buttonIconWrapper: {
		width: 36,
		height: 36,
		borderRadius: 18,
		paddingTop: Device.isAndroid() ? 2 : 4,
		paddingLeft: 1,
		justifyContent: 'center',
		alignContent: 'center',
		backgroundColor: colors.blue
	},
	buttonIcon: {
		justifyContent: 'center',
		alignContent: 'center',
		textAlign: 'center',
		color: colors.white
	},
	buttonText: {
		marginTop: 8,
		color: colors.blue,
		fontSize: 14
	},
	receive: {
		right: Device.isIos() ? 1 : 0,
		bottom: 1,
		transform: [{ rotate: '90deg' }]
	}
});

function getIcon(type) {
	switch (type) {
		case 'send': {
			return <MaterialCommunityIcon name={'arrow-top-right'} size={20} style={styles.buttonIcon} />;
		}
		case 'receive': {
			return (
				<MaterialCommunityIcon
					name={'keyboard-tab'}
					size={20}
					color={colors.white}
					style={[styles.buttonIcon, styles.receive]}
				/>
			);
		}
		case 'add': {
			return <Ionicon name={'ios-add'} size={30} style={styles.buttonIcon} />;
		}
		case 'information': {
			return <Ionicon name={'md-information'} size={30} style={styles.buttonIcon} />;
		}
		case 'swap': {
			return <MaterialCommunityIcon name={'repeat'} size={22} style={styles.buttonIcon} />;
		}
		default: {
			return null;
		}
	}
}

function AssetActionButton({ onPress, icon, label, disabled }) {
	return (
		<TouchableOpacity
			onPress={onPress}
			style={[styles.button, disabled && styles.disabledButton]}
			disabled={disabled}
		>
			<View style={styles.buttonIconWrapper}>{icon && (typeof icon === 'string' ? getIcon(icon) : icon)}</View>
			<Text centered style={styles.buttonText}>
				{label}
			</Text>
		</TouchableOpacity>
	);
}

AssetActionButton.propTypes = {
	onPress: PropTypes.func,
	icon: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
	label: PropTypes.string,
	disabled: PropTypes.bool
};

export default AssetActionButton;
