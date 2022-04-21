import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import Box from './Box';
import Feather from 'react-native-vector-icons/Feather';
import CustomText from '../../../Base/Text';
import BaseListItem from '../../../Base/ListItem';
import StyledButton from '../../StyledButton';
import { renderFiat, renderFromTokenMinimalUnit, toTokenMinimalUnit } from '../../../../util/number';
import { strings } from '../../../../../locales/i18n';
import ApplePayButton from '../containers/ApplePayButton';
import { CryptoCurrency, FiatCurrency, QuoteResponse } from '@consensys/on-ramp-sdk';
import { useAssetFromTheme } from '../../../../util/theme';
import RemoteImage from '../../../Base/RemoteImage';
import { Logos } from '@consensys/on-ramp-sdk/dist/API';

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
	quote: QuoteResponse;
	onPress?: () => any;
	onPressBuy?: () => any;
	highlighted?: boolean;
	showInfo: () => any;
}

const Quote: React.FC<Props> = ({ quote, onPress, onPressBuy, showInfo, highlighted }: Props) => {
	const logoKey: keyof Logos = useAssetFromTheme('light', 'dark');
	const { networkFee = 0, providerFee = 0, amountIn = 0, amountOut = 0, providerName } = quote;
	const totalFees = networkFee + providerFee;
	const price = amountIn - totalFees;

	const crypto = quote.crypto as CryptoCurrency;
	const fiat = quote.fiat as FiatCurrency;

	return (
		<Box onPress={onPress} highlighted={highlighted}>
			<ListItem.Content>
				<ListItem.Body>
					<ListItem.Title>
						<TouchableOpacity onPress={showInfo}>
							{quote.providerLogos?.[logoKey] && (
								<RemoteImage
									// eslint-disable-next-line react-native/no-inline-styles
									style={{
										width: 100,
										height: 100,
									}}
									source={{ uri: quote.providerLogos[logoKey] }}
								/>
							)}
							<Text big primary bold>
								{providerName} <Feather name="info" size={12} />
							</Text>
						</TouchableOpacity>
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
