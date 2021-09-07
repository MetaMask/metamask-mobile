import React from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, Image } from 'react-native';
import { colors } from '../../../../styles/common';
import Text from '../../../Base/Text';

// eslint-disable-next-line import/no-commonjs
const piggyBank = require('../../../../images/piggybank.png');

const styles = StyleSheet.create({
	header: {
		paddingVertical: 10,
		paddingHorizontal: 15,
		borderWidth: 1,
		borderColor: colors.blue,
		borderTopRightRadius: 10,
		borderTopLeftRadius: 10,
		backgroundColor: colors.blue000,
	},
	headerWithPiggy: {
		paddingLeft: 15 + 32 + 10,
	},
	piggyBar: {
		position: 'absolute',
		top: -1,
		left: 21,
		height: 0,
		width: 19,
		borderTopWidth: 1,
		borderColor: colors.blue000,
	},
	piggyBank: {
		position: 'absolute',
		top: -12,
		left: 15,
		width: 32,
		height: 44,
	},
	headerText: {
		color: colors.blue,
	},
	body: {
		paddingVertical: 10,
		paddingHorizontal: 15,
		borderWidth: 1,
		borderTopWidth: 0,
		borderColor: colors.blue,
		borderBottomRightRadius: 10,
		borderBottomLeftRadius: 10,
	},
	separator: {
		height: 0,
		width: '100%',
		borderTopWidth: 1,
		marginVertical: 6,
		borderTopColor: colors.grey100,
	},
});

const QuotesSummary = (props) => <View {...props} />;

const Header = ({ style, savings, children, ...props }) => (
	<View style={[styles.header, savings && styles.headerWithPiggy, style]} {...props}>
		{savings && (
			<>
				<View style={styles.piggyBar} />
				<Image style={styles.piggyBank} source={piggyBank} />
			</>
		)}
		{children}
	</View>
);

const Body = ({ style, ...props }) => <View style={[styles.body, style]} {...props} />;
const HeaderText = ({ style, ...props }) => <Text style={[styles.headerText, style]} {...props} />;
const Separator = ({ style }) => <View style={[styles.separator, style]} />;

QuotesSummary.Body = Body;
QuotesSummary.Header = Header;
QuotesSummary.HeaderText = HeaderText;
QuotesSummary.Separator = Separator;

Header.propTypes = {
	style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
	/** Wether the piggybank is shown or not */
	savings: PropTypes.bool,
	children: PropTypes.node,
};

Body.propTypes = {
	style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
};

HeaderText.propTypes = {
	style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
};

Separator.propTypes = {
	style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
};

export default QuotesSummary;
