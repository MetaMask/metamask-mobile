import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import Box from './Box';
import Feather from 'react-native-vector-icons/Feather';
import CustomText from '../../../Base/Text';
import CustomTitle from '../../../Base/Title';
import BaseListItem from '../../../Base/ListItem';
import StyledButton from '../../StyledButton';
import { renderFiat, renderFromTokenMinimalUnit, toTokenMinimalUnit } from '../../../../util/number';
import { strings } from '../../../../../locales/i18n';
import ApplePayButton from '../containers/ApplePayButton';
import { QuoteResponse } from '@consensys/on-ramp-sdk';
import { useAssetFromTheme } from '../../../../util/theme';
import RemoteImage from '../../../Base/RemoteImage';

// TODO: Convert into typescript and correctly type optionals
const Text = CustomText as any;
const Title = CustomTitle as any;
const ListItem = BaseListItem as any;

const styles = StyleSheet.create({
	fee: {
		marginLeft: 8,
	},
	buyButton: {
		marginTop: 10,
	},
	title: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	infoIcon: {
		marginLeft: 8,
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
	const logoKey: 'light' | 'dark' = useAssetFromTheme('light', 'dark');
	const { networkFee = 0, providerFee = 0, amountIn = 0, amountOut = 0, fiat, provider, crypto } = quote;
	const totalFees = networkFee + providerFee;
	const price = amountIn - totalFees;

	const fiatCode = fiat?.symbol || '';
	const fiatSymbol = fiat?.denomSymbol || '';

	return (
		<Box onPress={highlighted ? undefined : onPress} highlighted={highlighted}>
			<ListItem.Content>
				<ListItem.Body>
					<ListItem.Title>
						<TouchableOpacity onPress={showInfo}>
							<View style={styles.title}>
								{quote.provider?.logos?.[logoKey] ? (
									<RemoteImage
										style={{
											width: quote.provider.logos.width,
											height: quote.provider.logos.height,
										}}
										source={{ uri: quote.provider?.logos?.[logoKey] }}
									/>
								) : (
									<Title>{quote?.provider?.name}</Title>
								)}

								{quote?.provider && <Feather name="info" size={12} style={styles.infoIcon} />}
							</View>
						</TouchableOpacity>
					</ListItem.Title>
				</ListItem.Body>
				<ListItem.Amounts>
					<Text big primary bold right>
						{renderFromTokenMinimalUnit(
							toTokenMinimalUnit(amountOut, crypto?.decimals || 0).toString(),
							crypto?.decimals || 0
						)}{' '}
						{crypto?.symbol}
					</Text>
				</ListItem.Amounts>
			</ListItem.Content>

			<ListItem.Content>
				<ListItem.Body>
					<Text small>Price {fiatCode}</Text>
				</ListItem.Body>
				<ListItem.Amounts>
					<Text small right>
						≈ {fiatSymbol} {renderFiat(price, fiatCode, fiat?.decimals)}
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
						{fiatSymbol} {renderFiat(totalFees, fiatCode, fiat?.decimals)}
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
						{fiatSymbol} {renderFiat(providerFee, fiatCode, fiat?.decimals)}
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
						{fiatSymbol}
						{renderFiat(networkFee, fiatCode, fiat?.decimals)}
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
						{fiatSymbol} {renderFiat(amountIn, fiatCode, fiat?.decimals)}
					</Text>
				</ListItem.Amounts>
			</ListItem.Content>

			{highlighted && (
				<View style={styles.buyButton}>
					{quote.paymentMethod?.isApplePay ? (
						<ApplePayButton quote={quote} label={strings('fiat_on_ramp.buy_with')} />
					) : (
						<StyledButton type={'blue'} onPress={onPressBuy}>
							Buy with {provider.name}
						</StyledButton>
					)}
				</View>
			)}
		</Box>
	);
};

export default Quote;
