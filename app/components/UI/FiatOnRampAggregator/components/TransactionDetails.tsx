import React from 'react';
import { StyleSheet, View, TouchableOpacity, Image } from 'react-native';
import Box from './Box';
import Feather from 'react-native-vector-icons/Feather';
import CustomText from '../../../Base/Text';
import BaseListItem from '../../../Base/ListItem';

import { colors } from '../../../../styles/common';
import { strings } from '../../../../../locales/i18n';

/* eslint-disable import/no-commonjs, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
const failedIcon = require('./images/transactionFailed.png');
// TODO: Convert into typescript and correctly type optionals
const Text = CustomText as any;

const ListItem = BaseListItem as any;
import Spinner from '../../AnimatedSpinner';

const styles = StyleSheet.create({
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
	transactionTitle: {
		marginBottom: 8,
	},
	line: {
		backgroundColor: colors.grey050,
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
	switch (stage) {
		case 'confirmed': {
			return (
				<>
					<Feather name="check-circle" size={32} color={colors.green500} />
					<Text bold big primary centered style={styles.stageDescription}>
						{strings('fiat_on_ramp_aggregator.transaction.successful')}
					</Text>
					<Text small centered style={styles.stageMessage}>
						{strings('fiat_on_ramp_aggregator.transaction.successful_description')}
					</Text>
				</>
			);
		}
		case 'failed':
		case 'cancelled': {
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
		case 'pending':
		case 'submitted': {
			return (
				<>
					<Spinner />
					<Text bold big primary centered style={styles.stageDescription}>
						{stage === 'pending' ? strings('fiat_on_ramp_aggregator.transaction.processing') : 'submitted'}
					</Text>
					{paymentType === 'bank' ? (
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

const values = [
	{
		title: 'Transaction ID',
		variable: 'transactionID',
	},
	{
		title: 'Date and Time',
		variable: 'dateAndTime',
	},
	{
		title: 'Payment Method',
		variable: 'paymentMethod',
	},
	{
		title: 'Token Amount',
		variable: 'tokenAmount',
	},
	{
		title: 'USD Amount',
		variable: 'fiatAmount',
	},
	{
		title: 'Exchange Rate',
		variable: 'exchangeRate',
	},
	{
		title: 'Total Fees',
		variable: 'totalFees',
	},
];

const TransactionDetails: React.FC<Props> = ({ order }: Props) => (
	<View>
		<View style={styles.stage}>{renderStage(order.status, order.paymentType)}</View>
		<Text centered primary style={styles.tokenAmount}>
			{order.tokenAmount}
		</Text>
		<Text centered small style={styles.fiatColor}>
			{order.fiatAmount}
		</Text>
		<Box>
			<Text bold primary style={styles.transactionTitle}>
				{strings('fiat_on_ramp_aggregator.transaction.details')}
			</Text>
			{values.map(({ title, variable }) => (
				<View key={variable}>
					<ListItem.Content style={styles.listItems}>
						<ListItem.Body>
							<Text black small>
								{title}
							</Text>
						</ListItem.Body>
						<ListItem.Amount>
							<Text small bold primary>
								{order[variable]}
							</Text>
						</ListItem.Amount>
					</ListItem.Content>
					{order[variable] === order.paymentMethod && (
						<Text small style={styles.provider}>
							{strings('fiat_on_ramp_aggregator.transaction.via')} {order.providerName}
						</Text>
					)}
				</View>
			))}

			<View style={styles.line} />

			<ListItem.Content style={styles.listItems}>
				<ListItem.Body>
					<Text black small>
						{strings('fiat_on_ramp_aggregator.transaction.purchase_amount')}
					</Text>
				</ListItem.Body>
				<ListItem.Amount>
					<Text small bold primary>
						{order.purchaseAmountTotal}
					</Text>
				</ListItem.Amount>
			</ListItem.Content>
			{order.stage === 'confirmed' && (
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

export default TransactionDetails;
