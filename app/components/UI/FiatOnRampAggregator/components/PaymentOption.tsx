import React from 'react';
import { StyleSheet, View } from 'react-native';
import Box from './Box';
import Feather from 'react-native-vector-icons/Feather';
import { colors } from '../../../../styles/common';
import { Image } from 'react-native-animatable';
import CustomText from '../../../Base/Text';
import BaseListItem from '../../../Base/ListItem';
import PaymentIcon, { Icon } from './PaymentIcon';
import { strings } from '../../../../../locales/i18n';

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
	time: number[];
	amountTier: number[];
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
	amountTier,
	idRequired,
	paymentType,
	onPress,
	highlighted,
}: Props) => {
	const timeToDescription = (timeArr: number[]) => {
		let timeDesc = '';
		if (timeArr[0] === 0 && timeArr[1] === 0) {
			timeDesc += strings('fiat_on_ramp_aggregator.paymentMethod.instant');
		} else if (timeArr[0] === 0) {
			timeDesc += strings('fiat_on_ramp_aggregator.paymentMethod.less_than') + ' ';
			if (timeArr[0] > 1439) {
				timeDesc +=
					Math.round(timeArr[1] / 1440).toString() +
					' ' +
					strings('fiat_on_ramp_aggregator.paymentMethod.days');
			} else {
				timeDesc += timeArr[1].toString() + ' ' + strings('fiat_on_ramp_aggregator.paymentMethod.minutes');
			}
		} else if (timeArr[0] > 1439) {
			timeDesc +=
				Math.round(timeArr[0] / 1440).toString() +
				'-' +
				Math.round(timeArr[1] / 1440).toString() +
				' ' +
				strings('fiat_on_ramp_aggregator.paymentMethod.business_days');
		} else {
			timeDesc +=
				timeArr[0].toString() +
				'-' +
				timeArr[1].toString() +
				' ' +
				strings('fiat_on_ramp_aggregator.paymentMethod.minutes');
		}

		return timeDesc;
	};

	const tiersDescriptions = [
		strings('fiat_on_ramp_aggregator.paymentMethod.lowest_limit'),
		strings('fiat_on_ramp_aggregator.paymentMethod.medium_limit'),
		strings('fiat_on_ramp_aggregator.paymentMethod.highest_limit'),
	];
	const tierToValues = (tiers: number[]) => {
		const tierTexts = [];
		let description = '';

		for (let i = 0; i < tiers[0]; i++) {
			tierTexts.push(
				<Text primary small key={i}>
					$
				</Text>
			);
		}
		if (tierTexts.length > tiersDescriptions.length) {
			description = tiersDescriptions[2];
		} else {
			description = tiersDescriptions[tierTexts.length - 1];
		}
		for (let i = tierTexts.length; i < tiers[1] - 1; i++) {
			tierTexts.push(
				<Text small key={i}>
					$
				</Text>
			);
		}
		tierTexts.push(
			<Text primary small key={tierTexts.length}>
				{' '}
				{description}
			</Text>
		);
		return tierTexts;
	};

	return (
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
						{idRequired
							? strings('fiat_on_ramp_aggregator.paymentMethod.id_required')
							: strings('fiat_on_ramp_aggregator.paymentMethod.no_id_required')}
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
				<Feather name="clock" /> {timeToDescription(time)} • {tierToValues(amountTier)}
			</Text>
		</Box>
	);
};
export default PaymentOption;
