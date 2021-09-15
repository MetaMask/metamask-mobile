import React from 'react';
import PropTypes from 'prop-types';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { colors, fontStyles } from '../../../../../styles/common';

import Text from '../../../../Base/Text';
import InfoIcon from '../InfoIcon';
import Modal from './Modal';
import Device from '../../../../../util/device';

const style = StyleSheet.create({
	container: {
		borderWidth: 1,
		borderRadius: 8,
		borderColor: colors.blue,
		paddingVertical: 15,
		paddingHorizontal: 20,
		marginHorizontal: Device.isIphone5() ? 15 : 25,
		marginVertical: 12,
	},
	title: {
		flexDirection: 'row',
		width: '100%',
		justifyContent: 'space-between',
	},
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
		backgroundColor: colors.blue,
		color: colors.white,
		margin: 0,
		borderRadius: 12,
		overflow: 'hidden',
		...fontStyles.bold,
	},
	details: {},
	infoIconLine: {
		alignItems: 'center',
		flexDirection: 'row',
		flexWrap: 'wrap',
	},
	infoIcon: {
		margin: 5,
		color: colors.grey200,
	},
});

const PaymentMethod = ({ onPress, ...props }) => (
	<TouchableOpacity onPress={onPress} style={style.container} {...props} />
);

PaymentMethod.propTypes = {
	onPress: PropTypes.func,
	children: PropTypes.node,
};

PaymentMethod.defaultProps = {
	onPress: undefined,
	children: undefined,
};

const Badge = (props) => (
	<View style={style.badgeWrapper}>
		<Text style={style.badge} {...props} />
	</View>
);

const Title = (props) => <View style={style.title} {...props} />;
const Content = (props) => <View style={style.content} {...props} />;
const Details = (props) => <View style={style.details} {...props} />;
const InfoIconLine = (props) => <View style={style.infoIconLine} {...props} />;
const PaymentMethodInfoIcon = (props) => <InfoIcon size={16} style={style.infoIcon} {...props} />;

PaymentMethod.Badge = Badge;
PaymentMethod.Title = Title;
PaymentMethod.Content = Content;
PaymentMethod.Details = Details;
PaymentMethod.InfoIconLine = InfoIconLine;
PaymentMethod.InfoIcon = PaymentMethodInfoIcon;
PaymentMethod.Modal = Modal;
export default PaymentMethod;
