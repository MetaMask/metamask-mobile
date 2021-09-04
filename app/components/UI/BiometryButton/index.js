/* eslint-disable import/no-commonjs */
import React from 'react';
import { TouchableOpacity, Image as ImageRN, Platform } from 'react-native';
import PropTypes from 'prop-types';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { colors } from '../../../styles/common';

const styles = {
	fixCenterIcon: {
		marginBottom: -3,
	},
	image: {
		height: 24,
		width: 24,
	},
	hitSlop: {
		top: 10,
		left: 10,
		bottom: 10,
		right: 10,
	},
};

const iosFaceId = require('../../../images/ios-face-id.png');
const androidFaceRecognition = require('../../../images/android-face-recognition.png');
const androidIris = require('../../../images/android-iris.png');

const renderIcon = (type) => {
	if (Platform.OS === 'ios') {
		if (type === 'TouchID')
			return <Ionicons color={colors.black} size={28} style={styles.fixCenterIcon} name="ios-finger-print" />;
		if (type === 'FaceID') return <ImageRN style={styles.image} source={iosFaceId} />;
	}

	if (Platform.OS === 'android') {
		if (type === 'Fingerprint')
			return <MaterialIcon color={colors.black} style={styles.fixCenterIcon} size={28} name="fingerprint" />;
		if (type === 'Face') return <ImageRN style={styles.image} source={androidFaceRecognition} />;
		if (type === 'Iris') return <ImageRN style={styles.image} source={androidIris} />;
	}

	return <Ionicons color={colors.black} style={styles.fixCenterIcon} size={28} name="ios-finger-print" />;
};

const BiometryButton = ({ onPress, hidden, type }) => {
	if (hidden) return null;

	return (
		<TouchableOpacity hitSlop={styles.hitSlop} onPress={onPress}>
			{renderIcon(type)}
		</TouchableOpacity>
	);
};

BiometryButton.propTypes = {
	/**
	 * Callback for when the button is pressed
	 */
	onPress: PropTypes.func,
	/**
	 * If this button should not appear
	 */
	hidden: PropTypes.bool,
	/**
	 * Type of biometry icon
	 */
	type: PropTypes.string,
};

export default BiometryButton;
