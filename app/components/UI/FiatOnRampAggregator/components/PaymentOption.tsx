import React from 'react';
import { StyleSheet, View } from 'react-native';
import Box from './Box';
import Feather from 'react-native-vector-icons/Feather';
import { colors } from '../../../../styles/common';
import { Image } from 'react-native-animatable';
import CustomText from '../../../Base/Text';
import BaseListItem from '../../../Base/ListItem';
import PaymentIcon, { Icon } from './PaymentIcon';

/* eslint-disable import/no-commonjs, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
const visa = require('./images/visa.png');
const sepa = require('./images/sepa.png');
const mastercard = require('./images/mastercard.png');
/* eslint-enable import/no-commonjs, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */

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
	highlighted?: boolean;
}

const styles = StyleSheet.create({
	//TODO: remove hardcoded color later
	/* eslint-disable react-native/no-color-literals */
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
});

const PaymentOption: React.FC<Props> = ({
	title,
	time,
	cardImage,
	lowestLimit,
	idRequired,
	paymentType,
	onPress,
	highlighted,
}: Props) => (
	<Box onPress={onPress} highlighted={highlighted}>
		<ListItem.Content>
			<ListItem.Icon>
				<View style={styles.icon}>
					<PaymentIcon iconType={paymentType} size={16} style={undefined} />
				</View>
			</ListItem.Icon>
			<ListItem.Body>
				<ListItem.Title>
					<Text big primary bold>
						{title}
					</Text>
				</ListItem.Title>
				<Text small grey>
					{idRequired ? 'ID required' : 'No ID required'}
				</Text>
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
