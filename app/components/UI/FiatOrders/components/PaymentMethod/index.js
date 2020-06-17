import React from 'react';
import PropTypes from 'prop-types';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { colors, fontStyles } from '../../../../../styles/common';

import Text from '../../../../Base/Text';
import InfoIcon from '../InfoIcon';
import Modal from './Modal';

const style = StyleSheet.create({
	container: {
		borderWidth: 1,
		borderRadius: 8,
		borderColor: colors.blue,
		paddingVertical: 15,
		paddingHorizontal: 20,
		marginHorizontal: 25,
		marginVertical: 12,
		flexDirection: 'row'
	},
	badgeWrapper: {
		position: 'absolute',
		alignItems: 'center',
		top: -14,
		left: 0,
		right: 0
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
		...fontStyles.bold
	},
	details: {
		flex: 2
	},
	terms: {
		flex: 1,
		alignItems: 'flex-end',
		justifyContent: 'space-between',
		marginLeft: 20
	},
	infoIconLine: {
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'flex-end'
	},
	infoIcon: {
		marginLeft: 2
	}
});

const PaymentMethod = ({ onPress, ...props }) => (
	<TouchableOpacity onPress={onPress} style={style.container} {...props} />
);

PaymentMethod.propTypes = {
	onPress: PropTypes.func,
	children: PropTypes.node
};

PaymentMethod.defaultProps = {
	onPress: undefined,
	children: undefined
};

const Badge = props => (
	<View style={style.badgeWrapper}>
		<Text style={style.badge} {...props} />
	</View>
);

const Details = props => <View style={style.details} {...props} />;
const Terms = props => <View style={style.terms} {...props} />;
const InfoIconLine = props => <View style={style.infoIconLine} {...props} />;

const PaymentMethodInfoIcon = props => (
	<View style={style.infoIcon}>
		<InfoIcon size={16} {...props} />
	</View>
);

PaymentMethod.Badge = Badge;
PaymentMethod.Details = Details;
PaymentMethod.Terms = Terms;
PaymentMethod.InfoIconLine = InfoIconLine;
PaymentMethod.InfoIcon = PaymentMethodInfoIcon;
PaymentMethod.Modal = Modal;
export default PaymentMethod;
