/* eslint-disable @typescript-eslint/no-require-imports */
import React from 'react';
import { StyleSheet, View } from 'react-native';
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
	paymentIcon: string;
	onPress?: () => any;
}

const styles = StyleSheet.create({
	name: {
		fontSize: 15,
		bottom: 15,
		fontWeight: '600',
		fontFamily: 'Euclid Circular B',
		right: 35,
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
		bottom: 12,
		left: 18,
		flexDirection: 'row',
		justifyContent: 'flex-end',
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
		width: 100,
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
const ListItem = BaseListItem as any;

const PaymentOption: React.FC<Props> = ({
	title,
	time,
	cardImage,
	lowestLimit,
	idRequired,
	paymentIcon,
	onPress,
}: Props) => {
	let payImage;
	if (paymentIcon === 'apple') {
		payImage = <FontAwesome name={paymentIcon} size={20} style={styles.apple} />;
	} else if (paymentIcon === 'credit-card') {
		payImage = <MaterialsIcons name={paymentIcon} size={20} style={styles.cardAndBank} />;
	} else {
		payImage = <MaterialsCommunityIcons name={paymentIcon} size={20} style={styles.cardAndBank} />;
	}

	return (
		<Box style={styles.box} onPress={onPress}>
			<View>
				<ListItem.Content>
					<ListItem.Icon style={styles.icon}>
						<FontAwesome name="square" size={50} color="#F0F0F2" />
						{payImage}
					</ListItem.Icon>
					<ListItem.Body>
						<ListItem.Title style={styles.name}>{title}</ListItem.Title>
					</ListItem.Body>
					<ListItem.Amounts style={styles.cardImage}>
						<ListItem.Amount>
							{cardImage ? (
								<>
									<View style={styles.visa}>
										<Image source={require('./images/visa.png')} />
										<Image source={require('./images/mastercard.png')} style={styles.mastercard} />
									</View>
								</>
							) : (
								<>
									<View style={styles.sepa}>
										<Image source={require('./images/sepa.png')} />
									</View>
								</>
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
				{idRequired ? (
					<>
						<View>
							<FontAwesome name="circle" size={4} style={styles.rightDot} />
						</View>
						<Text style={styles.descFont}> ID Required</Text>
					</>
				) : (
					<View />
				)}
			</View>
		</Box>
	);
};
export default PaymentOption;
