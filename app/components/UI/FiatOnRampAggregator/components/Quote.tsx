import React from 'react';
import { StyleSheet, View } from 'react-native';
import Box from './Box';
import Feather from 'react-native-vector-icons/Feather';
import CustomText from '../../../Base/Text';
import BaseListItem from '../../../Base/ListItem';
import StyledButton from '../../StyledButton';
import { renderFiat, renderFromTokenMinimalUnit, toTokenMinimalUnit } from '../../../../util/number';
import { strings } from '../../../../../locales/i18n';
import ApplePayButton from '../containers/ApplePayButton';

// TODO: Convert into typescript and correctly type optionals
const Text = CustomText as any;
const ListItem = BaseListItem as any;

const styles = StyleSheet.create({
	fee: {
		marginLeft: 8,
	},
	buyButton: {
		marginTop: 10,
	},
});

interface Props {
	quote: {
		providerId: string;
		providerName: string;
		providerLogos: {
			light: string;
			dark: string;
		};
		providerLinks: string[];
		providerHQ: string;
		description: string;
		crypto: {
			id: string;
			network: string;
			symbol: string;
			logo: string;
			decimals: number;
			address: string;
			name: string;
		};
		cryptoId: string;
		fiat: {
			id: string;
			symbol: string;
			name: string;
			decimals: number;
			denomSymbol: string;
		};
		fiatId: string;
		networkFee: number;
		providerFee: number;
		amountIn: number;
		amountOut: number;
		buyURL?: string;
		status?: number;
		message?: string;
		error?: boolean;
		paymentMethod?: any;
		receiver?: string;
		getApplePayRequestInfo?: () => any;
		purchaseWithApplePay?: () => Promise<any>;
	};
	onPress?: () => any;
	onPressBuy?: () => any;
	highlighted?: boolean;
}

const Quote: React.FC<Props> = ({ quote, onPress, onPressBuy, highlighted }: Props) => {
	const { networkFee, providerFee, amountIn, amountOut, fiat, providerName, crypto } = quote;
	const totalFees = networkFee + providerFee;
	const price = amountIn - totalFees;

	return (
		<Box onPress={onPress} highlighted={highlighted}>
			<ListItem.Content>
				<ListItem.Body>
					<ListItem.Title>
						<Text big primary bold>
							{providerName} <Feather name="info" size={12} />
						</Text>
					</ListItem.Title>
				</ListItem.Body>
				<ListItem.Amounts>
					<Text big primary bold right>
						{renderFromTokenMinimalUnit(
							toTokenMinimalUnit(amountOut, crypto.decimals).toString(),
							crypto.decimals
						)}{' '}
						{crypto.symbol}
					</Text>
				</ListItem.Amounts>
			</ListItem.Content>

			<ListItem.Content>
				<ListItem.Body>
					<Text small>Price {fiat?.symbol}</Text>
				</ListItem.Body>
				<ListItem.Amounts>
					<Text small right>
						≈ {fiat.denomSymbol} {renderFiat(price, fiat.symbol, fiat.decimals)}
					</Text>
				</ListItem.Amounts>
			</ListItem.Content>

			<ListItem.Content>
				<ListItem.Body>
					<Text black small>
						Total Fees
					</Text>
				</ListItem.Body>
				<ListItem.Amounts>
					<Text black small right>
						{fiat.denomSymbol} {renderFiat(totalFees, fiat.symbol, fiat.decimals)}
					</Text>
				</ListItem.Amounts>
			</ListItem.Content>

			<ListItem.Content>
				<ListItem.Body>
					<Text grey small style={styles.fee}>
						Processing fee
					</Text>
				</ListItem.Body>
				<ListItem.Amounts>
					<Text grey small right>
						{fiat.denomSymbol} {renderFiat(providerFee, fiat.symbol, fiat.decimals)}
					</Text>
				</ListItem.Amounts>
			</ListItem.Content>

			<ListItem.Content>
				<ListItem.Body>
					<Text grey small style={styles.fee}>
						Network fee
					</Text>
				</ListItem.Body>
				<ListItem.Amounts>
					<Text grey small right>
						{fiat.denomSymbol}
						{renderFiat(networkFee, fiat.symbol, fiat.decimals)}
					</Text>
				</ListItem.Amounts>
			</ListItem.Content>

			<ListItem.Content>
				<ListItem.Body>
					<Text black small>
						Total
					</Text>
				</ListItem.Body>
				<ListItem.Amounts>
					<Text black small right>
						{fiat.denomSymbol} {renderFiat(amountIn, fiat.symbol, fiat.decimals)}
					</Text>
				</ListItem.Amounts>
			</ListItem.Content>

			{highlighted && (
				<View style={styles.buyButton}>
					{quote.paymentMethod?.isApplePay ? (
						<ApplePayButton quote={quote} label={strings('fiat_on_ramp.buy_with')} />
					) : (
						<StyledButton type={'blue'} onPress={onPressBuy}>
							Buy with {providerName}
						</StyledButton>
					)}
				</View>
			)}
		</Box>
	);
};

export default Quote;
