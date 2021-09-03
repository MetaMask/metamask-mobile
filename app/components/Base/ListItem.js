import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';
// import Device from '../../util/device';
import { colors, fontStyles } from '../../styles/common';
import Text from './Text';

const styles = StyleSheet.create({
	wrapper: {
		padding: 15,
		// TODO(wachunei): check if this can be removed without breaking anything
		// minHeight: Device.isIos() ? 55 : 100
	},
	date: {
		color: colors.fontSecondary,
		fontSize: 12,
		marginBottom: 10,
		...fontStyles.normal,
	},
	content: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	actions: {
		flexDirection: 'row',
		paddingTop: 10,
		paddingLeft: 40,
	},
	icon: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	body: {
		flex: 1,
		marginLeft: 15,
	},
	amounts: {
		flex: 0.6,
		alignItems: 'flex-end',
	},
	title: {
		fontSize: 15,
		color: colors.fontPrimary,
	},
	amount: {
		fontSize: 15,
		color: colors.fontPrimary,
	},
	fiatAmount: {
		fontSize: 12,
		color: colors.fontSecondary,
		textTransform: 'uppercase',
	},
});

const ListItem = ({ style, ...props }) => <View style={[styles.wrapper, style]} {...props} />;

const ListItemDate = ({ style, ...props }) => <Text style={[styles.date, style]} {...props} />;
const ListItemContent = ({ style, ...props }) => <View style={[styles.content, style]} {...props} />;
const ListItemActions = ({ style, ...props }) => <View style={[styles.actions, style]} {...props} />;
const ListItemIcon = ({ style, ...props }) => <View style={[styles.icon, style]} {...props} />;
const ListItemBody = ({ style, ...props }) => <View style={[styles.body, style]} {...props} />;
const ListItemTitle = ({ style, ...props }) => <Text style={[styles.title, style]} {...props} />;
const ListItemAmounts = ({ style, ...props }) => <View style={[styles.amounts, style]} {...props} />;
const ListItemAmount = ({ style, ...props }) => <Text style={[styles.amount, style]} {...props} />;
const ListItemFiatAmount = ({ style, ...props }) => <Text style={[styles.fiatAmount, style]} {...props} />;

ListItem.Date = ListItemDate;
ListItem.Content = ListItemContent;
ListItem.Actions = ListItemActions;
ListItem.Icon = ListItemIcon;
ListItem.Body = ListItemBody;
ListItem.Title = ListItemTitle;
ListItem.Amounts = ListItemAmounts;
ListItem.Amount = ListItemAmount;
ListItem.FiatAmount = ListItemFiatAmount;

export default ListItem;

/**
 * Any other external style defined in props will be applied
 */
const stylePropType = PropTypes.oneOfType([PropTypes.object, PropTypes.array]);

ListItem.propTypes = {
	style: stylePropType,
};
ListItemDate.propTypes = {
	style: stylePropType,
};
ListItemContent.propTypes = {
	style: stylePropType,
};
ListItemActions.propTypes = {
	style: stylePropType,
};
ListItemIcon.propTypes = {
	style: stylePropType,
};
ListItemBody.propTypes = {
	style: stylePropType,
};
ListItemTitle.propTypes = {
	style: stylePropType,
};
ListItemAmounts.propTypes = {
	style: stylePropType,
};
ListItemAmount.propTypes = {
	style: stylePropType,
};
ListItemFiatAmount.propTypes = {
	style: stylePropType,
};
