import React from 'react';
import { StyleSheet, View, TouchableOpacity, Image } from 'react-native';
import Box from './Box';
import Feather from 'react-native-vector-icons/Feather';
import CustomText from '../../../Base/Text';
import BaseListItem from '../../../Base/ListItem';
import { toDateFormat } from '../../../../util/date';
import { useTheme } from '../../../../util/theme';
import { strings } from '../../../../../locales/i18n';

/* eslint-disable import/no-commonjs, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
const failedIcon = require('./images/transactionFailed.png');
// TODO: Convert into typescript and correctly type optionals
const Text = CustomText as any;

const ListItem = BaseListItem as any;
import Spinner from '../../AnimatedSpinner';
import { SDK_ORDER_STATUS } from '../orderProcessor/aggregator';
const createStyles = (colors: any) =>
	StyleSheet.create({
		stage: {
			alignItems: 'center',
		},
		provider: {
			alignSelf: 'flex-end',
			marginTop: 0,
		},
		listItems: {
			paddingVertical: 4,
		},
		transactionIdFlex: {
			flex: 1,
		},
		transactionTitle: {
			marginBottom: 8,
		},
		line: {
			backgroundColor: colors.border.muted,
			height: 1,
			marginVertical: 12,
		},
		link: {
			paddingTop: 10,
		},
		fiatColor: {
			paddingBottom: 12,
		},
		tokenAmount: {
			fontSize: 24,
		},
		stageDescription: {
			paddingBottom: 5,
			paddingTop: 10,
		},
		stageMessage: {
			paddingBottom: 4,
		},
		contactDesc: {
			flexDirection: 'row',
			alignSelf: 'center',
			paddingTop: 15,
		},
	});

const renderStage = (stage: string, paymentType: string) => {
	// eslint-disable-next-line react-hooks/rules-of-hooks
	const { colors } = useTheme();
	const styles = createStyles(colors);
	switch (stage) {
		case SDK_ORDER_STATUS.Completed: {
			return (
				<>
					<Feather name="check-circle" size={32} color={colors.success.default} />
					<Text bold big primary centered style={styles.stageDescription}>
						{strings('fiat_on_ramp_aggregator.transaction.successful')}
					</Text>
					<Text small centered style={styles.stageMessage}>
						{strings('fiat_on_ramp_aggregator.transaction.successful_description')}
					</Text>
				</>
			);
		}
		case SDK_ORDER_STATUS.Failed:
		case SDK_ORDER_STATUS.Cancelled: {
			return (
				<>
					<Image source={failedIcon} />
					<Text bold big primary centered style={styles.stageDescription}>
						{stage === 'failed' ? strings('fiat_on_ramp_aggregator.transaction.failed') : 'cancelled'}
					</Text>
					<Text small centered style={styles.stageMessage}>
						{strings('fiat_on_ramp_aggregator.transaction.failed_description')}
					</Text>
				</>
			);
		}
		case SDK_ORDER_STATUS.Pending: {
			return (
				<>
					<Spinner />
					<Text bold big primary centered style={styles.stageDescription}>
						{stage === 'pending' ? strings('fiat_on_ramp_aggregator.transaction.processing') : 'submitted'}
					</Text>
					{!paymentType.includes('Credit') ? (
						<Text small centered style={styles.stageMessage}>
							{strings('fiat_on_ramp_aggregator.transaction.processing_bank_description')}
						</Text>
					) : (
						<Text small centered style={styles.stageMessage}>
							{strings('fiat_on_ramp_aggregator.transaction.processing_card_description')}
						</Text>
					)}
				</>
			);
		}
	}
};

interface Props {
	order: any;
}

const TransactionDetails: React.FC<Props> = ({ order }: Props) => {
	const { colors } = useTheme();
	const styles = createStyles(colors);
	const date = toDateFormat(order.data.createdAt);

	return (
		<View>
			<View style={styles.stage}>{renderStage(order.state, order.data.paymentMethod.name)}</View>
			<Text centered primary style={styles.tokenAmount}>
				{order.data.cryptoAmount}
			</Text>
			<Text centered small style={styles.fiatColor}>
				{order.data.fiatCurrency.denomSymbol}
				{order.data.fiatAmount} {order.data.fiatCurrency.symbol}
			</Text>
			<Box>
				<Text bold primary style={styles.transactionTitle}>
					{strings('fiat_on_ramp_aggregator.transaction.details')}
				</Text>
				<View>
					<ListItem.Content style={styles.listItems}>
						<ListItem.Body style={styles.transactionIdFlex}>
							<Text black small>
								Transaction ID
							</Text>
						</ListItem.Body>
						<ListItem.Amount style={styles.transactionIdFlex}>
							<Text small bold primary right>
								{order.data.providerOrderId}
							</Text>
						</ListItem.Amount>
					</ListItem.Content>
					<ListItem.Content style={styles.listItems}>
						<ListItem.Body>
							<Text black small>
								Date and Time
							</Text>
						</ListItem.Body>
						<ListItem.Amount>
							<Text small bold primary>
								{date}
							</Text>
						</ListItem.Amount>
					</ListItem.Content>
					<ListItem.Content style={styles.listItems}>
						<ListItem.Body>
							<Text black small>
								Payment Method
							</Text>
						</ListItem.Body>
						<ListItem.Amount>
							<Text small bold primary>
								{order.data.paymentMethod.name}
							</Text>
						</ListItem.Amount>
					</ListItem.Content>
					<Text small style={styles.provider}>
						{strings('fiat_on_ramp_aggregator.transaction.via')} {order.data.provider.name}
					</Text>
					<ListItem.Content style={styles.listItems}>
						<ListItem.Body>
							<Text black small>
								Token Amount
							</Text>
						</ListItem.Body>
						<ListItem.Amount>
							<Text small bold primary>
								{order.data.cryptoAmount} {order.cryptocurrency}
							</Text>
						</ListItem.Amount>
					</ListItem.Content>
					<ListItem.Content style={styles.listItems}>
						<ListItem.Body>
							<Text black small>
								{order.currency} Amount
							</Text>
						</ListItem.Body>
						<ListItem.Amount>
							<Text small bold primary>
								{order.data.fiatCurrency.denomSymbol}
								{order.data.fiatAmount}
							</Text>
						</ListItem.Amount>
					</ListItem.Content>
					<ListItem.Content style={styles.listItems}>
						<ListItem.Body>
							<Text black small>
								Exchange Rate
							</Text>
						</ListItem.Body>
						<ListItem.Amount>
							<Text small bold primary>
								1 {order.cryptocurrency} @{' '}
								{(Number(order.data.fiatAmount) - Number(order.data.totalFeesFiat)) /
									Number(order.data.cryptoAmount)}
							</Text>
						</ListItem.Amount>
					</ListItem.Content>
					<ListItem.Content style={styles.listItems}>
						<ListItem.Body>
							<Text black small>
								Total Fees
							</Text>
						</ListItem.Body>
						<ListItem.Amount>
							<Text small bold primary>
								{order.data.fiatCurrency.denomSymbol}
								{order.data.totalFeesFiat}
							</Text>
						</ListItem.Amount>
					</ListItem.Content>
				</View>

				<View style={styles.line} />

				<ListItem.Content style={styles.listItems}>
					<ListItem.Body>
						<Text black small>
							{strings('fiat_on_ramp_aggregator.transaction.purchase_amount')}
						</Text>
					</ListItem.Body>
					<ListItem.Amount>
						<Text small bold primary>
							{order.data.fiatCurrency.denomSymbol}
							{order.amount} {order.data.fiatCurrency.symbol}
						</Text>
					</ListItem.Amount>
				</ListItem.Content>
				{order.state === SDK_ORDER_STATUS.Completed && (
					<TouchableOpacity>
						<Text blue small centered style={styles.link}>
							{strings('fiat_on_ramp_aggregator.transaction.etherscan')}
						</Text>
					</TouchableOpacity>
				)}
			</Box>
			<View style={styles.contactDesc}>
				<Text small>{strings('fiat_on_ramp_aggregator.transaction.questions')} </Text>
				<TouchableOpacity>
					<Text small underline>
						{strings('fiat_on_ramp_aggregator.transaction.contact')} {order.providerName}{' '}
						{strings('fiat_on_ramp_aggregator.transaction.support')}
					</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
};

export default TransactionDetails;
