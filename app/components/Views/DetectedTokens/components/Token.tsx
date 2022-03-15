import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Token as TokenType } from '@metamask/controllers';
import EthereumAddress from '../../../UI/EthereumAddress';
import Icon from 'react-native-vector-icons/Feather';
import CheckBox from '@react-native-community/checkbox';
import { strings } from '../../../../../locales/i18n';
import TokenImage from '../../../UI/TokenImage';
import { colors, fontStyles } from '../../../../styles/common';
import { useDispatch } from 'react-redux';
import { showAlert } from '../../../../actions/alert';
import ClipboardManager from '../../../../core/ClipboardManager';

const styles = StyleSheet.create({
	logo: {
		height: 40,
		width: 40,
	},
	tokenContainer: { flexDirection: 'row', paddingVertical: 16 },
	tokenInfoContainer: { flex: 1, marginLeft: 8, marginRight: 16 },
	tokenUnitLabel: {
		...(fontStyles.normal as any),
		fontSize: 18,
		color: 'black',
		marginBottom: 4,
	},
	tokenDollarLabel: {
		...(fontStyles.normal as any),
		fontSize: 14,
		color: 'gray',
		marginBottom: 4,
	},
	tokenAddressContainer: {
		flexDirection: 'row',
		marginBottom: 4,
	},
	tokenAddressLabel: {
		...(fontStyles.normal as any),
		fontSize: 14,
		color: 'gray',
	},
	addressLinkContainer: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	addressLinkLabel: {
		...(fontStyles.normal as any),
		fontSize: 14,
		color: colors.blue,
	},
	copyIcon: {
		marginLeft: 4,
		color: colors.blue,
	},
	tokenAggregatorContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		flexWrap: 'wrap',
	},
	tokenAggregatorLabel: {
		...(fontStyles.normal as any),
		fontSize: 14,
		color: 'black',
	},
	aggregatorLinkLabel: {
		...(fontStyles.normal as any),
		fontSize: 14,
		color: colors.blue,
	},
	checkBox: { height: 18, width: 18 },
});

interface Props {
	token: TokenType;
	selected: boolean;
	toggleSelected: (selected: boolean) => void;
}

const Token = ({ token, selected, toggleSelected }: Props) => {
	const { address, symbol, image, aggregators } = token;
	const [expandTokenList, setExpandTokenList] = useState(false);
	const unitAmountLabel = `0.1234 ${symbol}`;
	const dollarAmountLabel = '$12.22';
	const addressLabel = `Token address: `;
	const aggregatorLabel = `Token lists: ${aggregators.slice(0, expandTokenList ? aggregators.length : 2).join(', ')}`;
	const showMoreLink = !expandTokenList && aggregators.length > 2;
	const dispatch = useDispatch();

	const triggerShowAlert = () =>
		dispatch(
			showAlert({
				isVisible: true,
				autodismiss: 1500,
				content: 'clipboard-alert',
				data: { msg: strings('detected_tokens.address_copied_to_clipboard') },
			})
		);

	const copyAddressToClipboard = async () => {
		await ClipboardManager.setString(address);
		triggerShowAlert();
	};

	const triggerExpandTokenList = () => {
		setExpandTokenList(true);
	};

	const triggerToggleSelected = () => {
		toggleSelected(!selected);
	};

	return (
		<View style={styles.tokenContainer}>
			<TokenImage asset={token} containerStyle={styles.logo} iconStyle={styles.logo} />
			<View style={styles.tokenInfoContainer}>
				<Text style={styles.tokenUnitLabel}>{unitAmountLabel}</Text>
				<Text style={styles.tokenDollarLabel}>{dollarAmountLabel}</Text>
				<View style={styles.tokenAddressContainer}>
					<Text style={styles.tokenAddressLabel}>{addressLabel}</Text>
					<TouchableOpacity onPress={copyAddressToClipboard} style={styles.addressLinkContainer}>
						<EthereumAddress style={styles.addressLinkLabel} address={address} type={'short'} />
						<Icon style={styles.copyIcon} name={'copy'} size={16} />
					</TouchableOpacity>
				</View>
				<View style={styles.tokenAggregatorContainer}>
					<Text style={styles.tokenAggregatorLabel}>{aggregatorLabel}</Text>
					{showMoreLink ? (
						<TouchableOpacity onPress={triggerExpandTokenList}>
							<Text style={styles.aggregatorLinkLabel}>{` + ${
								aggregators.slice(2, aggregators.length).length
							} more`}</Text>
						</TouchableOpacity>
					) : null}
				</View>
			</View>
			<CheckBox
				style={styles.checkBox}
				value={selected}
				onValueChange={triggerToggleSelected}
				boxType={'square'}
				tintColors={{ true: 'blue' }}
			/>
		</View>
	);
};

export default Token;
