import React from 'react';
import { StyleSheet, View } from 'react-native';
import Box from './Box';
import Feather from 'react-native-vector-icons/Feather';
import { Image } from 'react-native-animatable';
import CustomText from '../../../Base/Text';
import BaseListItem from '../../../Base/ListItem';
import PaymentIcon, { Icon } from './PaymentIcon';
import { strings } from '../../../../../locales/i18n';
import { TimeDescriptions, timeToDescription } from '../utils';
import { useTheme } from '../../../../util/theme';

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

const createStyles = (colors: any) =>
	StyleSheet.create({
		iconWrapper: {
			width: 38,
			height: 38,
			backgroundColor: colors.background.alternative,
			borderRadius: 6,
			justifyContent: 'center',
			alignItems: 'center',
		},
		icon: {
			color: colors.text.default,
		},
		cardIcons: {
			flexDirection: 'row',
		},
		cardIcon: {
			marginLeft: 6,
			marginBottom: 14,
		},
		line: {
			backgroundColor: colors.border.muted,
			height: 1,
			marginVertical: 12,
		},
	});

const renderDescription = (description: TimeDescriptions | string) => {
	switch (description) {
		case TimeDescriptions.instant: {
			return strings('fiat_on_ramp_aggregator.paymentMethod.instant');
		}
		case TimeDescriptions.less_than: {
			return strings('fiat_on_ramp_aggregator.paymentMethod.less_than');
		}
		case TimeDescriptions.separator: {
			return '-';
		}
		case TimeDescriptions.minutes: {
			return strings('fiat_on_ramp_aggregator.paymentMethod.minutes');
		}
		case TimeDescriptions.minute: {
			return strings('fiat_on_ramp_aggregator.paymentMethod.minute');
		}
		case TimeDescriptions.hours: {
			return strings('fiat_on_ramp_aggregator.paymentMethod.hours');
		}
		case TimeDescriptions.hour: {
			return strings('fiat_on_ramp_aggregator.paymentMethod.hour');
		}
		case TimeDescriptions.business_days: {
			return strings('fiat_on_ramp_aggregator.paymentMethod.business_days');
		}
		case TimeDescriptions.business_day: {
			return strings('fiat_on_ramp_aggregator.paymentMethod.business_day');
		}
		default: {
			return description;
		}
	}
};
const renderTime = (time: number[]) => timeToDescription(time).map(renderDescription).join(' ');

const tierDescriptions = [
	strings('fiat_on_ramp_aggregator.paymentMethod.lowest_limit'),
	strings('fiat_on_ramp_aggregator.paymentMethod.medium_limit'),
	strings('fiat_on_ramp_aggregator.paymentMethod.highest_limit'),
];
const renderTiers = (tiers: number[]) => {
	const threshold = tiers[1] / tierDescriptions.length;
	const index = Math.ceil(tiers[0] / threshold) - 1;
	return tierDescriptions[Math.min(Math.max(0, index), tierDescriptions.length - 1)];
};

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
	const { colors } = useTheme();
	const styles = createStyles(colors);
	return (
		<Box onPress={onPress} highlighted={highlighted}>
			<ListItem.Content>
				<ListItem.Icon>
					<View style={styles.iconWrapper}>
						<PaymentIcon iconType={paymentType} size={16} style={styles.icon} />
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
				<Feather name="clock" /> {renderTime(time)} •{' '}
				{new Array(amountTier[1]).fill('').map((_, index) => (
					<Text small muted={index >= amountTier[0]} key={index}>
						$
					</Text>
				))}{' '}
				{renderTiers(amountTier)}
			</Text>
		</Box>
	);
};

export default PaymentOption;
