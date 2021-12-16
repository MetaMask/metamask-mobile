import React from 'react';
import PropTypes from 'prop-types';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { fontStyles } from '../../../../../styles/common';

import Text from '../../../../Base/Text';
import InfoIcon from '../InfoIcon';
import Modal from './Modal';
import Device from '../../../../../util/device';
import { useAppThemeFromContext } from '../../../../../util/theme';

const PaymentMethod = ({ onPress, ...props }) => {
	const { colors } = useAppThemeFromContext();
	const style = StyleSheet.create({
		container: {
			borderWidth: 1,
			borderRadius: 8,
			borderColor: colors.primary,
			paddingVertical: 15,
			paddingHorizontal: 20,
			marginHorizontal: Device.isIphone5() ? 15 : 25,
			marginVertical: 12,
		},
	});
	return <TouchableOpacity onPress={onPress} style={style.container} {...props} />;
};

PaymentMethod.propTypes = {
	onPress: PropTypes.func,
	children: PropTypes.node,
};

PaymentMethod.defaultProps = {
	onPress: undefined,
	children: undefined,
};

const Badge = (props) => {
	const { colors } = useAppThemeFromContext();
	const style = StyleSheet.create({
		badgeWrapper: {
			position: 'absolute',
			alignItems: 'center',
			top: -14,
			left: 0,
			right: 0,
		},
		badge: {
			fontSize: 12,
			paddingVertical: 4,
			paddingHorizontal: 8,
			backgroundColor: colors.primary,
			color: colors.onPrimary,
			margin: 0,
			borderRadius: 12,
			overflow: 'hidden',
			...fontStyles.bold,
		},
	});
	return (
		<View style={style.badgeWrapper}>
			<Text style={style.badge} {...props} />
		</View>
	);
};

const Title = (props) => (
	<View
		style={{
			flexDirection: 'row',
			width: '100%',
			justifyContent: 'space-between',
		}}
		{...props}
	/>
);
const Content = (props) => <View {...props} />;
const Details = (props) => {
	const style = StyleSheet.create({
		details: {},
	});
	return <View style={style.details} {...props} />;
};
const InfoIconLine = (props) => {
	const style = StyleSheet.create({
		infoIconLine: {
			alignItems: 'center',
			flexDirection: 'row',
			flexWrap: 'wrap',
		},
	});
	return <View style={style.infoIconLine} {...props} />;
};
const PaymentMethodInfoIcon = (props) => {
	const { colors } = useAppThemeFromContext();
	const style = StyleSheet.create({
		infoIcon: {
			margin: 5,
			color: colors.textAlternative,
		},
	});
	return <InfoIcon size={16} style={style.infoIcon} {...props} />;
};

PaymentMethod.Badge = Badge;
PaymentMethod.Title = Title;
PaymentMethod.Content = Content;
PaymentMethod.Details = Details;
PaymentMethod.InfoIconLine = InfoIconLine;
PaymentMethod.InfoIcon = PaymentMethodInfoIcon;
PaymentMethod.Modal = Modal;
export default PaymentMethod;
