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
	name: {
		fontSize: 15,
		bottom: 18,
		fontWeight: '600',
		fontFamily: 'Euclid Circular B',
		right: 36,
	},
	icon: {
		bottom: 15,
		right: 15,
	},
	visa: {
		flexDirection: 'row',
		justifyContent: 'space-evenly',
	},
	mastercard: {
		marginLeft: 7,
	},
	box: {
		padding: 30,
		rightMargin: '10%',
		left: '5%',
		justifyContent: 'center',
		width: '90%',
		marginBottom: 10,
		marginTop: 10,
	},
	cardImage: {
		bottom: 24,
		left: 18,
		flexDirection: 'row',
		justifyContent: 'flex-end',
	},
	idPosition: {
		right: 38,
		bottom: 12,
	},
	idFont: {
		color: colors.grey500,
		fontSize: 10.5,
		fontFamily: 'Euclid Circular B',
	},
	line: {
		borderBottomColor: colors.grey050,
		borderBottomWidth: 1,
		right: 12,
		width: '110%',
		bottom: 2,
	},
	bottomContainer: {
		flexDirection: 'row',
		justifyContent: 'flex-start',
		width: '100%',
		top: 12,
	},
	leftDot: {
		marginRight: 10,
		top: 8,
		left: 1,
	},
	rightDot: {
		marginRight: 5,
		marginLeft: 9,
		left: 2,
		top: 8,
	},
	clock: {
		marginBottom: 3,
		top: 2,
	},
	clockToLeft: {
		right: 15,
	},
	timeDesc: {
		flexDirection: 'row',
		justifyContent: 'flex-start',
	},
	middle: {
		flexDirection: 'row',
		justifyContent: 'center',
	},
	timeDescription: {
		right: 7,
	},
	dollarSymbols: {
		top: 5,
		marginRight: 1,
	},
	limitDesc: {
		left: 3,
	},
	descFont: {
		color: colors.black,
		fontSize: 11.5,
		fontFamily: 'Euclid Circular B',
	},
	apple: {
		right: 28,
	},
	cardAndBank: {
		right: 31,
	},
	sepa: {
		right: 8,
	},
});

const Text = CustomText as any;
// TODO: Convert into typescript and correctly type optionals
const ListItem = BaseListItem as any;

const PaymentOption: React.FC<Props> = ({
	title,
	time,
	cardImage,
	lowestLimit,
	idRequired,
	paymentType,
	paymentNetworks,
	onPress,
}: Props) => {
	return (
		<Box style={styles.box} onPress={onPress} highlighted={false}>
			<View>
				<ListItem.Content>
					<ListItem.Icon style={styles.icon}>
						<FontAwesome name="square" size={50} color={colors.grey000} />
						<PaymentIcon
							iconType={paymentType}
							size={20}
							style={paymentType === Icon.Apple ? styles.apple : styles.cardAndBank}
						></PaymentIcon>
					</ListItem.Icon>
					<ListItem.Body>
						<ListItem.Title style={styles.name}>{title}</ListItem.Title>
						<View style={styles.idPosition}>
							{idRequired ? (
								<Text style={styles.idFont}> ID required</Text>
							) : (
								<Text style={styles.idFont}> No ID required</Text>
							)}
						</View>
					</ListItem.Body>
					<ListItem.Amounts style={styles.cardImage}>
						<ListItem.Amount>
							{cardImage ? (
								<View style={styles.visa}>
									<Image source={require('./images/visa.png')} />
									<Image source={require('./images/mastercard.png')} style={styles.mastercard} />
								</View>
							) : (
								<View style={styles.sepa}>
									<Image source={require('./images/sepa.png')} />
								</View>
							)}
						</ListItem.Amount>
					</ListItem.Amounts>
				</ListItem.Content>
				<View style={styles.line} />
			</View>
			<View style={styles.bottomContainer}>
				<View style={styles.timeDesc}>
					<View style={styles.clockToLeft}>
						<Feather name="clock" size={15} style={styles.clock} />
					</View>
					<View style={styles.timeDescription}>
						<Text style={styles.descFont}>{time}</Text>
					</View>
					<View>
						<FontAwesome name="circle" size={4} style={styles.leftDot} />
					</View>
				</View>
				<View style={styles.middle}>
					{lowestLimit ? (
						<>
							<View style={styles.timeDesc}>
								<FontAwesome name="dollar" size={10} style={styles.dollarSymbols} />
								<FontAwesome
									name="dollar"
									size={10}
									style={styles.dollarSymbols}
									color={colors.grey300}
								/>
								<FontAwesome
									name="dollar"
									size={10}
									style={styles.dollarSymbols}
									color={colors.grey300}
								/>
							</View>
							<View style={styles.limitDesc}>
								<Text style={styles.descFont}>lower limit </Text>
							</View>
						</>
					) : (
						<>
							<View style={styles.timeDesc}>
								<FontAwesome name="dollar" size={10} style={styles.dollarSymbols} />
								<FontAwesome name="dollar" size={10} style={styles.dollarSymbols} />
								<FontAwesome name="dollar" size={10} style={styles.dollarSymbols} />
							</View>
							<View style={styles.limitDesc}>
								<Text style={styles.descFont}>highest limit</Text>
							</View>
						</>
					)}
				</View>
			</View>
		</Box>
	);
};
export default PaymentOption;
