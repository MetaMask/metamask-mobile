/* eslint-disable import/no-commonjs */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
import React from 'react';
import { StyleProp, StyleSheet, TextStyle, View } from 'react-native';
import Box from './Box';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Feather from 'react-native-vector-icons/Feather';
import MaterialsCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialsIcons from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../../../../styles/common';
import { Image } from 'react-native-animatable';
import CustomText from '../../../Base/Text';
import BaseListItem from '../../../Base/ListItem';

const visa = require('./images/visa.png');
const sepa = require('./images/sepa.png');
const mastercard = require('./images/mastercard.png');

// TODO: Convert into typescript and correctly type optionals
const Text = CustomText as any;
const ListItem = BaseListItem as any;

interface Props {
	title?: string;
	cardImage?: boolean;
	time?: string;
	lowestLimit?: boolean;
	idRequired?: boolean;
	paymentType: Icon;
	paymentNetworks: [string];
	onPress?: () => any;
}

interface iconParams {
	iconType: Icon;
	style: StyleProp<TextStyle>;
	size: number;
}

export enum Icon {
	Apple = 'apple',
	Card = 'credit-card',
	Bank = 'bank',
}

export const PaymentIcon: React.FC<iconParams> = ({ iconType, style, size }: iconParams) => {
	switch (iconType) {
		case Icon.Apple: {
			return <FontAwesome name={Icon.Apple} size={size} style={style} />;
		}
		case Icon.Card: {
			return <MaterialsIcons name={Icon.Card} size={size} style={style} />;
		}
		case Icon.Bank: {
			return <MaterialsCommunityIcons name={Icon.Bank} size={size} style={style} />;
		}
	}
};

const styles = StyleSheet.create({
	// eslint-disable-next-line react-native/no-color-literals
	icon: {
		width: 38,
		height: 38,
		backgroundColor: '#F0F0F2',
		borderRadius: 6,
		justifyContent: 'center',
		alignItems: 'center',
	},
	cardIcons: {
		flexDirection: 'row',
	},
	cardIcon: {
		marginLeft: 6,
		marginBottom: 14,
	},
	line: {
		backgroundColor: colors.grey050,
		height: 1,
		marginVertical: 12,
	},
	title: {
		fontSize: 15,
		fontWeight: 'bold',
		color: colors.black,
	},
	id: {
		color: colors.grey500,
		fontSize: 10.5,
		fontFamily: 'Euclid Circular B',
		marginTop: 5,
	},
});

const PaymentOption: React.FC<Props> = ({
	title,
	time,
	cardImage,
	lowestLimit,
	idRequired,
	paymentType,
	onPress,
}: Props) => (
	<Box onPress={onPress}>
		<ListItem.Content>
			<ListItem.Icon>
				<View style={styles.icon}>
					<PaymentIcon iconType={paymentType} size={16} style={undefined} />
				</View>
			</ListItem.Icon>
			<ListItem.Body>
				<ListItem.Title>
					<Text style={styles.title}>{title}</Text>
				</ListItem.Title>
				<Text style={styles.id}>{idRequired ? 'ID required' : 'No ID required'}</Text>
			</ListItem.Body>
			<ListItem.Amounts>
				<ListItem.Amount>
					<View style={styles.cardIcons}>
						{cardImage ? (
							<>
								<Image source={visa} style={styles.cardIcon} />
								<Image source={mastercard} style={styles.cardIcon} />
							</>
						) : (
							<Image source={sepa} style={styles.cardIcon} />
						)}
					</View>
				</ListItem.Amount>
			</ListItem.Amounts>
		</ListItem.Content>

		<View style={styles.line} />

		<Text primary small>
			<Feather name="clock" /> {time} • $
			<Text primary={!lowestLimit} small>
				$
			</Text>
			<Text primary={!lowestLimit} small>
				$
			</Text>{' '}
			{lowestLimit ? 'lower limit' : 'highest limit'}
		</Text>
	</Box>
);
export default PaymentOption;
