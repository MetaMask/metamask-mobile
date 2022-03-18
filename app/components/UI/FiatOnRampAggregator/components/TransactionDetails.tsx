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
		bottom: 3,
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

export enum TransactionStage {
	Successful,
	Failed,
	Processing,
}
const renderStage = (stage: TransactionStage, paymentType: string) => {
	switch (stage) {
		case TransactionStage.Successful: {
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
		case TransactionStage.Failed: {
			return (
				<>
					<Image source={failedIcon} />
					<Text bold big primary centered style={styles.stageDescription}>
						{strings('fiat_on_ramp_aggregator.transaction.failed')}
					</Text>
					<Text small centered style={styles.stageMessage}>
						{strings('fiat_on_ramp_aggregator.transaction.failed_description')}
					</Text>
				</>
			);
		}
		case TransactionStage.Processing: {
			return (
				<>
					<Spinner />
					<Text bold big primary centered style={styles.stageDescription}>
						{strings('fiat_on_ramp_aggregator.transaction.processing')}
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
	stage: TransactionStage;
	transactionID?: string;
	dateAndTime?: string;
	paymentMethod?: string;
	paymentType: string;
	tokenAmount?: string;
	fiatAmount?: string;
	exchangeRate?: string;
	totalFees?: string;
	providerName?: string;
	purchaseAmountTotal?: string;
}
const TransactionDetails: React.FC<Props> = ({
	stage,
	transactionID,
	dateAndTime,
	paymentMethod,
	paymentType,
	tokenAmount,
	fiatAmount,
	exchangeRate,
	totalFees,
	providerName,
	purchaseAmountTotal,
}: Props) => {
	const values = [
		{
			id: 1,
			title: 'Transaction ID',
			variable: transactionID,
		},
		{
			id: 2,
			title: 'Date and Time',
			variable: dateAndTime,
		},
		{
			id: 3,
			title: 'Payment Method',
			variable: paymentMethod,
		},
		{
			id: 4,
			title: 'Token Amount',
			variable: tokenAmount,
		},
		{
			id: 5,
			title: 'USD Amount',
			variable: fiatAmount,
		},
		{
			id: 6,
			title: 'Exchange Rate',
			variable: exchangeRate,
		},
		{
			id: 7,
			title: 'Total Fees',
			variable: totalFees,
		},
	];
	return (
		<View>
			<View style={styles.stage}>{renderStage(stage, paymentType)}</View>
			<Text centered primary style={styles.tokenAmount}>
				{tokenAmount}
			</Text>
			<Text centered small style={styles.fiatColor}>
				{fiatAmount}
			</Text>
			<Box>
				<Text bold primary style={styles.transactionTitle}>
					{strings('fiat_on_ramp_aggregator.transaction.details')}
				</Text>
				{values.map(({ id, title, variable }) => (
					<View key={id}>
						<ListItem.Content style={styles.listItems}>
							<ListItem.Body>
								<Text black small>
									{title}
								</Text>
							</ListItem.Body>
							<ListItem.Amount>
								<Text small bold primary>
									{variable}
								</Text>
							</ListItem.Amount>
						</ListItem.Content>
						{variable === paymentMethod && (
							<Text small style={styles.provider}>
								{strings('fiat_on_ramp_aggregator.transaction.via')} {providerName}
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
							{purchaseAmountTotal}
						</Text>
					</ListItem.Amount>
				</ListItem.Content>
				{stage === TransactionStage.Successful && (
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
						{strings('fiat_on_ramp_aggregator.transaction.contact')} {providerName}{' '}
						{strings('fiat_on_ramp_aggregator.transaction.support')}
					</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
};

export default TransactionDetails;
