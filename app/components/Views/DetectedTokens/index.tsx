import React, { useRef, useState } from 'react';
import { StyleSheet, View, Text, FlatList } from 'react-native';
import ReusableModal, { ReusableModalRef } from '../../UI/ReusableModal';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fontStyles } from '../../../styles/common';
import StyledButton from '../../UI/StyledButton';
import { Token as TokenType } from '@metamask/controllers';
import Token from './components/Token';
import Engine from '../../../core/Engine';

const safeAreaPaddingBottom = 32;

const styles = StyleSheet.create({
	screen: { justifyContent: 'flex-end' },
	sheet: {
		backgroundColor: 'white',
		borderTopLeftRadius: 10,
		borderTopRightRadius: 10,
		paddingBottom: safeAreaPaddingBottom + 16,
		height: '75%',
	},
	notch: {
		width: 48,
		height: 5,
		borderRadius: 4,
		backgroundColor: 'grey',
		marginTop: 16,
		alignSelf: 'center',
	},
	headerLabel: {
		textAlign: 'center',
		...(fontStyles.normal as any),
		fontSize: 18,
		paddingVertical: 16,
	},
	tokenList: { flex: 1, paddingHorizontal: 16 },
	buttonsContainer: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		flexDirection: 'row',
	},
	buttonDivider: {
		width: 8,
	},
});

interface IgnoredTokensByAddress {
	[address: string]: true;
}

const DetectedTokens = () => {
	const safeAreaInsets = useSafeAreaInsets();
	const modalRef = useRef<ReusableModalRef>(null);
	const detectedTokens = useSelector<any, TokenType[]>(
		(state) => state.engine.backgroundState.TokensController.detectedTokens as TokenType[]
	);
	const [ignoredTokens, setIgnoredTokens] = useState<IgnoredTokensByAddress>({});

	const triggerIgnoreAllTokens = async () => {
		const { TokensController } = Engine.context as any;
		try {
			await TokensController.ignoreTokens(detectedTokens);
		} catch (err) {}
	};

	const triggerImportTokens = async () => {
		const { TokensController } = Engine.context as any;
		const tokensToIgnore: TokenType[] = [];
		const tokensToImport = detectedTokens.filter((token) => {
			const isIgnored = ignoredTokens[token.address];
			if (isIgnored) {
				tokensToIgnore.push(token);
			}
			return !isIgnored;
		});

		try {
			tokensToImport.length && (await TokensController.importTokens(tokensToImport));
			tokensToIgnore.length && (await TokensController.ignoreTokens(tokensToIgnore));
		} catch (err) {}
	};

	const renderHeader = () => (
		<Text style={styles.headerLabel}>{`${detectedTokens.length} new ${
			detectedTokens.length > 1 ? 'tokens' : 'token'
		} found`}</Text>
	);

	const renderToken = ({ item }: { item: TokenType }) => {
		const { address } = item;
		const isChecked = !ignoredTokens[address];

		return (
			<Token
				token={item}
				selected={isChecked}
				toggleSelected={(selected) => {
					let newIgnoredTokens = { ...ignoredTokens };
					if (selected) {
						delete newIgnoredTokens[address];
					} else {
						newIgnoredTokens[address] = true;
					}
					setIgnoredTokens(newIgnoredTokens);
				}}
			/>
		);
	};

	const getTokenId = (item: TokenType) => item.address;

	const renderDetectedTokens = () => (
		<FlatList<TokenType>
			style={styles.tokenList}
			data={detectedTokens}
			keyExtractor={getTokenId}
			renderItem={renderToken}
			showsVerticalScrollIndicator={false}
		/>
	);

	const renderButtons = () => (
		<View style={styles.buttonsContainer}>
			<StyledButton onPress={triggerIgnoreAllTokens} containerStyle={{ flex: 1 }} type={'normal'}>
				{'Ignore All'}
			</StyledButton>
			<View style={styles.buttonDivider} />
			<StyledButton onPress={triggerImportTokens} containerStyle={{ flex: 1 }} type={'confirm'}>
				{'Import'}
			</StyledButton>
		</View>
	);

	return (
		<ReusableModal ref={modalRef} style={styles.screen}>
			<View style={styles.sheet}>
				<View style={styles.notch} />
				{renderHeader()}
				{renderDetectedTokens()}
				{renderButtons()}
			</View>
		</ReusableModal>
	);
};

export default DetectedTokens;
