import React from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../styles/common';

const styles = StyleSheet.create({
	wrapper: {
		borderWidth: 1,
		borderColor: colors.grey050,
		borderRadius: 8,
		padding: 16,
	},
	row: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginVertical: 3,
	},
	rowEnd: {
		justifyContent: 'flex-end',
	},
	rowLast: {
		marginBottom: 0,
		marginTop: 3,
	},
	col: {
		flexDirection: 'row',
		flex: 1,
		flexWrap: 'wrap',
	},
	separator: {
		borderBottomWidth: 1,
		borderBottomColor: colors.grey050,
		marginVertical: 6,
	},
});

const Summary = ({ style, ...props }) => <View style={[styles.wrapper, style]} {...props} />;
const SummaryRow = ({ style, end, last, ...props }) => (
	<View style={[styles.row, end && styles.rowEnd, last && styles.rowLast, style]} {...props} />
);
const SummaryCol = ({ style, end, ...props }) => <View style={[styles.col, end && styles.rowEnd, style]} {...props} />;
const SummarySeparator = ({ style, ...props }) => <View style={[styles.separator, style]} {...props} />;

Summary.Row = SummaryRow;
Summary.Col = SummaryCol;
Summary.Separator = SummarySeparator;
export default Summary;

/**
 * Any other external style defined in props will be applied
 */
const stylePropType = PropTypes.oneOfType([PropTypes.object, PropTypes.array]);

Summary.propTypes = {
	style: stylePropType,
};
SummaryRow.propTypes = {
	style: stylePropType,
	/**
	 * Aligns content to the end of the row
	 */
	end: PropTypes.bool,
	/**
	 * Add style to the last row of the summary
	 */
	last: PropTypes.bool,
};
SummaryCol.propTypes = {
	style: stylePropType,
	/**
	 * Aligns content to the end of the row
	 */
	end: PropTypes.bool,
};
SummarySeparator.propTypes = {
	style: stylePropType,
};
