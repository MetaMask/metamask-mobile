import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';
// import Device from '../../util/device';
import { fontStyles } from '../../styles/common';
import Text from './Text';
import { useAppThemeFromContext } from '../../util/theme';

const ListItem = ({ style, ...props }) => {
	const styles = StyleSheet.create({
		wrapper: {
			padding: 15,
			// TODO(wachunei): check if this can be removed without breaking anything
			// minHeight: Device.isIos() ? 55 : 100
		},
	});
	return <View style={[styles.wrapper, style]} {...props} />;
};

const ListItemDate = ({ style, ...props }) => {
	const { colors } = useAppThemeFromContext();
	const styles = StyleSheet.create({
		date: {
			color: colors.textAlternative,
			fontSize: 12,
			marginBottom: 10,
			...fontStyles.normal,
		},
	});
	return <Text style={[styles.date, style]} {...props} />;
};
const ListItemContent = ({ style, ...props }) => {
	const styles = StyleSheet.create({
		content: {
			flexDirection: 'row',
			alignItems: 'center',
		},
	});
	return <View style={[styles.content, style]} {...props} />;
};
const ListItemActions = ({ style, ...props }) => {
	const styles = StyleSheet.create({
		actions: {
			flexDirection: 'row',
			paddingTop: 10,
			paddingLeft: 40,
		},
	});
	return <View style={[styles.actions, style]} {...props} />;
};
const ListItemIcon = ({ style, ...props }) => {
	const styles = StyleSheet.create({
		icon: {
			flexDirection: 'row',
			alignItems: 'center',
		},
	});
	return <View style={[styles.icon, style]} {...props} />;
};
const ListItemBody = ({ style, ...props }) => {
	const styles = StyleSheet.create({
		body: {
			flex: 1,
			marginLeft: 15,
		},
	});
	return <View style={[styles.body, style]} {...props} />;
};
const ListItemTitle = ({ style, ...props }) => {
	const { colors } = useAppThemeFromContext();
	const styles = StyleSheet.create({
		title: {
			fontSize: 15,
			color: colors.textDefault,
		},
	});
	return <Text style={[styles.title]} {...props} />;
};
const ListItemAmounts = ({ style, ...props }) => {
	const styles = StyleSheet.create({
		amounts: {
			flex: 0.6,
			alignItems: 'flex-end',
		},
	});
	return <View style={[styles.amounts, style]} {...props} />;
};
const ListItemAmount = ({ style, ...props }) => {
	const { colors } = useAppThemeFromContext();
	const styles = StyleSheet.create({
		amount: {
			fontSize: 15,
			color: colors.textDefault,
		},
	});
	return <Text style={[styles.amount, style]} {...props} />;
};
const ListItemFiatAmount = ({ style, ...props }) => {
	const { colors } = useAppThemeFromContext();
	const styles = StyleSheet.create({
		fiatAmount: {
			fontSize: 12,
			color: colors.textAlternative,
			textTransform: 'uppercase',
		},
	});
	return <Text style={[styles.fiatAmount, style]} {...props} />;
};

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
