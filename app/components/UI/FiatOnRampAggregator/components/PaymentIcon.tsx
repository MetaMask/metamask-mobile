import React from 'react';
import { StyleProp, TextStyle } from 'react-native';
import MaterialsCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialsIcons from 'react-native-vector-icons/MaterialIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
interface iconParams {
	iconType: Icon;
	style?: StyleProp<TextStyle>;
	size: number;
}

export enum Icon {
	Apple = 'apple',
	Card = 'credit-card',
	Bank = 'bank',
}

const PaymentIcon: React.FC<iconParams> = ({ iconType, ...props }: iconParams) => {
	switch (iconType) {
		case Icon.Apple: {
			return <FontAwesome name={Icon.Apple} {...props} />;
		}
		case Icon.Bank: {
			return <MaterialsCommunityIcons name={Icon.Bank} {...props} />;
		}
		case Icon.Card:
		default: {
			return <MaterialsIcons name={Icon.Card} {...props} />;
		}
	}
};

export default PaymentIcon;
