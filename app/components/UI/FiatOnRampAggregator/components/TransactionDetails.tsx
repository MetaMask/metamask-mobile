import React, { useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity, Image, Linking } from 'react-native';
import Box from './Box';
import Feather from 'react-native-vector-icons/Feather';
import CustomText from '../../../Base/Text';
import BaseListItem from '../../../Base/ListItem';
import { toDateFormat } from '../../../../util/date';
import { useTheme } from '../../../../util/theme';
import { strings } from '../../../../../locales/i18n';
import { renderFiat, renderFromTokenMinimalUnit, toTokenMinimalUnit } from '../../../../util/number';
import { getProviderName } from '../../../../reducers/fiatOrders';
import useBlockExplorer from '../../Swaps/utils/useBlockExplorer';
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

interface PropsStage {
	stage: string;
	paymentType: string;
}

const Stage: React.FC<PropsStage> = ({ stage, paymentType }: PropsStage) => {
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
		case SDK_ORDER_STATUS.Pending: {
			return (
				<>
					<Spinner />
					<Text bold big primary centered style={styles.stageDescription}>
						{stage === 'PENDING'
							? strings('fiat_on_ramp_aggregator.transaction.processing')
							: strings('transaction.submitted')}
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
		default: {
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
	}
};

interface Props {
	/**
	 * Object that represents the current route info like params passed to it
	 */
	order: any;
	/**
	 * Current Network provider
	 */
	provider: any;
	/**
	 * Frequent RPC list from PreferencesController
	 */
	frequentRpcList: any;
}

const TransactionDetails: React.FC<Props> = ({ order, provider, frequentRpcList }: Props) => {
	const {
		data,
		state,
		createdAt,
		amount,
		cryptoFee,
		cryptoAmount,
		currencySymbol,
		currency,
		txHash,
		cryptocurrency,
	} = order;
	const { colors } = useTheme();
	const explorer = useBlockExplorer(provider, frequentRpcList);
	const styles = createStyles(colors);
	const date = toDateFormat(createdAt);
	const amountOut = Number(amount) - Number(cryptoFee);
	const exchangeRate = Number(amountOut) / Number(cryptoAmount);
	const handleLinkPress = useCallback(async (url: string) => {
		const supported = await Linking.canOpenURL(url);
		if (supported) {
			await Linking.openURL(url);
		}
	}, []);
	return (
		<View>
			<View style={styles.stage}>
				<Stage stage={state} paymentType={data.paymentMethod?.name} />
			</View>
			<Text centered primary style={styles.tokenAmount}>
				{renderFromTokenMinimalUnit(
					toTokenMinimalUnit(cryptoAmount, data.cryptoCurrency?.decimals).toString(),
					data.cryptoCurrency?.decimals
				)}{' '}
				{cryptocurrency}
			</Text>
			<Text centered small style={styles.fiatColor}>
				{currencySymbol}
				{renderFiat(amountOut, currency, data.fiatCurrency?.decimals)}
			</Text>
			<Box>
				<Text bold primary style={styles.transactionTitle}>
					{strings('fiat_on_ramp_aggregator.transaction.details')}
				</Text>
				<View>
					<ListItem.Content style={styles.listItems}>
						<ListItem.Body style={styles.transactionIdFlex}>
							<Text black small>
								{strings('fiat_on_ramp_aggregator.transaction.id')}
							</Text>
						</ListItem.Body>
						<ListItem.Amount style={styles.transactionIdFlex}>
							<Text small bold primary right>
								{data?.providerOrderId}
							</Text>
						</ListItem.Amount>
					</ListItem.Content>
					<ListItem.Content style={styles.listItems}>
						<ListItem.Body>
							<Text black small>
								{strings('fiat_on_ramp_aggregator.transaction.date_and_time')}
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
								{strings('fiat_on_ramp_aggregator.transaction.payment_method')}
							</Text>
						</ListItem.Body>
						<ListItem.Amount>
							<Text small bold primary>
								{data.paymentMethod?.name}
							</Text>
						</ListItem.Amount>
					</ListItem.Content>
					<Text small style={styles.provider}>
						{strings('fiat_on_ramp_aggregator.transaction.via')} {getProviderName(order.provider, data)}
					</Text>
					<ListItem.Content style={styles.listItems}>
						<ListItem.Body>
							<Text black small>
								{strings('fiat_on_ramp_aggregator.transaction.token_amount')}
							</Text>
						</ListItem.Body>
						<ListItem.Amount>
							<Text small bold primary>
								{renderFromTokenMinimalUnit(
									toTokenMinimalUnit(cryptoAmount, data.cryptoCurrency?.decimals).toString(),
									data.cryptoCurrency?.decimals
								)}{' '}
								{cryptocurrency}
							</Text>
						</ListItem.Amount>
					</ListItem.Content>
					<ListItem.Content style={styles.listItems}>
						<ListItem.Body>
							<Text black small>
								{currency} {strings('send.amount')}
							</Text>
						</ListItem.Body>
						<ListItem.Amount>
							<Text small bold primary>
								{currencySymbol}
								{renderFiat(amountOut, currency, data.fiatCurrency?.decimals)}
							</Text>
						</ListItem.Amount>
					</ListItem.Content>
					<ListItem.Content style={styles.listItems}>
						<ListItem.Body>
							<Text black small>
								{strings('fiat_on_ramp_aggregator.transaction.exchange_rate')}
							</Text>
						</ListItem.Body>
						<ListItem.Amount>
							<Text small bold primary>
								1 {order.cryptocurrency} @{' '}
								{renderFiat(exchangeRate, currency, data.fiatCurrency?.decimals)}
							</Text>
						</ListItem.Amount>
					</ListItem.Content>
					<ListItem.Content style={styles.listItems}>
						<ListItem.Body>
							<Text black small>
								{strings('fiat_on_ramp_aggregator.transaction.total_fees')}
							</Text>
						</ListItem.Body>
						<ListItem.Amount>
							<Text small bold primary>
								{currencySymbol}
								{renderFiat(cryptoFee, currency, data.fiatCurrency?.decimals)}
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
							{currencySymbol}
							{renderFiat(amount, currency, data.fiatCurrency?.decimals)}
						</Text>
					</ListItem.Amount>
				</ListItem.Content>
				{order.state === SDK_ORDER_STATUS.Completed && txHash && (
					<TouchableOpacity onPress={() => handleLinkPress(explorer.tx(txHash))}>
						<Text blue small centered style={styles.link}>
							{strings('fiat_on_ramp_aggregator.transaction.etherscan')}
						</Text>
					</TouchableOpacity>
				)}
			</Box>
			{data.providerLink && (
				<View style={styles.contactDesc}>
					<Text small>{strings('fiat_on_ramp_aggregator.transaction.questions')} </Text>
					<TouchableOpacity onPress={() => handleLinkPress(data.providerLink)}>
						<Text small underline>
							{strings('fiat_on_ramp_aggregator.transaction.contact')}{' '}
							{getProviderName(order.provider, data)}{' '}
							{strings('fiat_on_ramp_aggregator.transaction.support')}
						</Text>
					</TouchableOpacity>
				</View>
			)}
		</View>
	);
};

export default TransactionDetails;
