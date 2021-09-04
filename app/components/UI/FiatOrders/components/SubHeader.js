import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet } from 'react-native';
import Text from '../../../Base/Text';

const style = StyleSheet.create({
	subHeader: {
		margin: 5,
	},
});

const SubHeader = ({ style: externalStyle, ...props }) => <Text style={[style.subHeader, externalStyle]} {...props} />;

SubHeader.defaultProps = {
	style: undefined,
};
SubHeader.propTypes = {
	style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
};

export default SubHeader;
