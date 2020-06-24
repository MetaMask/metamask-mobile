/* eslint-disable import/no-commonjs */
import React from 'react';
import { TouchableOpacity, Image as ImageRN, Platform } from 'react-native';
import PropTypes from 'prop-types';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';

import Svg, { Path } from 'react-native-svg';
import { colors } from '../../../styles/common';

const styles = {
	fixMaterialCommunityIcon: {
		marginBottom: -2
	},
	image: {
		height: 24,
		width: 24
	}
};

const iosFaceId = require('../../../images/ios-face-id.png');
const androidFaceRecognition = require('../../../images/android-face-recognition.png');

const renderIcon = type => {
	if (Platform.OS === 'ios') {
		if (type === 'TouchID') return <Ionicons color={colors.black} size={28} name="ios-finger-print" />;
		if (type === 'FaceID') return <ImageRN style={styles.image} source={iosFaceId} />;
	}

	if (Platform.OS === 'android') {
		if (type === 'Fingerprint') return <MaterialIcon color={colors.black} size={28} name="fingerprint" />;
		if (type === 'Face') return <ImageRN style={styles.image} source={androidFaceRecognition} />;
		if (type === 'Iris')
			return (
				<Svg width="24" height="24" viewBox="0 0 52 32" fill="none" xmlns="http://www.w3.org/2000/svg">
					<Path
						d="M51.9228 15.9422C47.0238 6.10959 37.0886 0 26.0037 0C14.9137 0 4.97852 6.10959 0.0795871 15.9422C-0.108638 16.314 0.0490642 16.7662 0.425514 16.9521C0.532344 17.0024 0.649348 17.0275 0.761266 17.0275C1.04106 17.0275 1.31577 16.8717 1.44803 16.6054C2.47564 14.5455 3.73216 12.6613 5.182 10.9732C5.17691 11.1239 5.17183 11.2746 5.17183 11.4304C5.17183 22.7703 14.5118 32 25.9986 32C37.4854 32 46.8254 22.7753 46.8254 11.4304C46.8254 11.2796 46.8203 11.1239 46.8153 10.9732C48.2651 12.6613 49.5267 14.5505 50.5492 16.6054C50.7375 16.9772 51.1902 17.133 51.5717 16.9471C51.9533 16.7662 52.1059 16.314 51.9228 15.9422ZM31.7268 8.22986C31.7268 9.99843 30.2769 11.4354 28.4812 11.4354C26.6854 11.4354 25.2356 10.0035 25.2356 8.22986C25.2356 6.45627 26.6905 5.02434 28.4812 5.02434C30.2718 5.02434 31.7268 6.45627 31.7268 8.22986ZM26.0037 30.4927C15.3614 30.4927 6.70306 21.9413 6.70306 11.4304C6.70306 10.6817 6.75393 9.94316 6.84041 9.21966C10.7321 5.43633 15.6921 2.88397 21.1506 1.92935C17.7625 3.66777 15.4479 7.15465 15.4479 11.1791C15.4479 16.937 20.1738 21.6046 26.0037 21.6046C31.8336 21.6046 36.5596 16.937 36.5596 11.1791C36.5596 7.14963 34.2449 3.66274 30.8569 1.92935C36.3103 2.88397 41.2753 5.43633 45.167 9.21966C45.2535 9.94316 45.3044 10.6817 45.3044 11.4304C45.2993 21.9413 36.641 30.4927 26.0037 30.4927Z"
						fill="#242424"
					/>
				</Svg>
			);
	}

	return <Ionicons color={colors.black} size={28} name="ios-finger-print" />;
};

const BiometryButton = ({ onPress, hidden, type }) => {
	if (hidden) return null;

	return (
		<TouchableOpacity hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }} onPress={onPress}>
			{renderIcon(type)}
		</TouchableOpacity>
	);
};

BiometryButton.propTypes = {
	onPress: PropTypes.func,
	hidden: PropTypes.bool,
	type: PropTypes.string
};

export default BiometryButton;
