import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet } from 'react-native';
import BaseTitle from '../../../Base/Title';

const style = StyleSheet.create({
	hero: {
		margin: 5,
	},
});

const Title = ({ style: externalStyle, ...props }) => (
	<BaseTitle style={[props.hero && style.hero, externalStyle]} {...props} />
);

Title.defaultProps = {
	hero: false,
	style: undefined,
};

Title.propTypes = {
	hero: PropTypes.bool,
	style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
};

export default Title;
