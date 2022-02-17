import React from 'react';
import { StyleSheet, View } from 'react-native';
import Box from './Box';
import Feather from 'react-native-vector-icons/Feather';
import CustomText from '../../../Base/Text';
import BaseListItem from '../../../Base/ListItem';
import StyledButton from '../../StyledButton';

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
	amountIn: number;
	amountOut: number;
	crypto: string;
	fiat: string;
	networkFee: number;
	processingFee: number;
	providerName: string;
	onPress?: () => any;
	highlighted?: boolean;
}
const Quotes: React.FC<Props> = ({
	amountIn,
	amountOut,
	crypto,
	fiat,
	networkFee,
	processingFee,
	providerName,
	onPress,
	highlighted,
}: Props) => {
	const totalFees = networkFee + processingFee;
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
					<Text big primary bold>
						{amountOut.toFixed(7)} {crypto}
					</Text>
				</ListItem.Amounts>
			</ListItem.Content>

			<ListItem.Content>
				<ListItem.Body>
					<Text black small>
						Price {fiat}
					</Text>
				</ListItem.Body>
				<ListItem.Amounts>
					<Text black small>
						≈ ${price}
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
					<Text black small>
						${totalFees}
					</Text>
				</ListItem.Amounts>
			</ListItem.Content>

			<ListItem.Content>
				<ListItem.Body>
					<Text small style={styles.fee}>
						Processing fee
					</Text>
				</ListItem.Body>
				<ListItem.Amounts>
					<Text small>${processingFee}</Text>
				</ListItem.Amounts>
			</ListItem.Content>

			<ListItem.Content>
				<ListItem.Body>
					<Text small style={styles.fee}>
						Network fee
					</Text>
				</ListItem.Body>
				<ListItem.Amounts>
					<Text small>${networkFee}</Text>
				</ListItem.Amounts>
			</ListItem.Content>

			<ListItem.Content>
				<ListItem.Body>
					<Text black small>
						Total
					</Text>
				</ListItem.Body>
				<ListItem.Amounts>
					<Text black small>
						${amountIn}
						{amountOut % 1 !== 0 && '.00'}
					</Text>
				</ListItem.Amounts>
			</ListItem.Content>

			{highlighted && (
				<View style={styles.buyButton}>
					<StyledButton type={'blue'}> Buy with {providerName}</StyledButton>
				</View>
			)}
		</Box>
	);
};

export default Quotes;
