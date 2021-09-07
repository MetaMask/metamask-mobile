import React from 'react';
import PropTypes from 'prop-types';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../../../../app/styles/common';

const Radio = ({ selected }) => (
	<Svg width="12" height="12" viewBox="0 0 12 12">
		{selected ? (
			<Circle cx="6" cy="6" r="4" stroke={colors.blue} strokeWidth="4" fill="none" />
		) : (
			<Circle cx="6" cy="6" r="5.5" stroke="#D2D8DD" fill="none" />
		)}
	</Svg>
);

Radio.propTypes = {
	selected: PropTypes.bool,
};

export default Radio;
