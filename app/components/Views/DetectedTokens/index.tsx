import React, { useRef, useState } from 'react';
import { StyleSheet, View, Text, FlatList } from 'react-native';
import ReusableModal, { ReusableModalRef } from '../../UI/ReusableModal';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontStyles } from '../../../styles/common';
import StyledButton from '../../UI/StyledButton';
import { Token as TokenType } from '@metamask/controllers';
import Token from './components/Token';
import Engine from '../../../core/Engine';
import { useNavigation } from '@react-navigation/native';
import NotificationManager from '../../../core/NotificationManager';
import { strings } from '../../../../locales/i18n';
import Logger from '../../../util/Logger';

const styles = StyleSheet.create({
	fill: {
		flex: 1,
	},
	screen: { justifyContent: 'flex-end' },
	sheet: {
		backgroundColor: colors.white,
		borderTopLeftRadius: 10,
		borderTopRightRadius: 10,
		height: '75%',
	},
	notch: {
		width: 48,
		height: 5,
		borderRadius: 4,
		backgroundColor: colors.grey,
		marginTop: 16,
		alignSelf: 'center',
	},
	headerLabel: {
		textAlign: 'center',
		...(fontStyles.normal as any),
		fontSize: 18,
		paddingVertical: 16,
		color: colors.black,
	},
	tokenList: { flex: 1, paddingHorizontal: 16 },
	buttonsContainer: {
		padding: 16,
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
	const navigation = useNavigation();
	const modalRef = useRef<ReusableModalRef>(null);
	const detectedTokens = useSelector<any, TokenType[]>(
		(state) => state.engine.backgroundState.TokensController.detectedTokens as TokenType[]
	);
	const [ignoredTokens, setIgnoredTokens] = useState<IgnoredTokensByAddress>({});

	const dismissModalAndTriggerAction = () => {
		const { TokensController } = Engine.context as any;
		let title = '';
		let description = '';
		let errorMsg = '';
		const tokensToIgnore: TokenType[] = [];
		const tokensToImport = detectedTokens.filter((token) => {
			const isIgnored = ignoredTokens[token.address];
			if (isIgnored) {
				tokensToIgnore.push(token);
			}
			return !isIgnored;
		});

		if (tokensToImport.length === 0 && tokensToIgnore.length > 0) {
			// Ignoring all tokens
			title = strings('wallet.tokens_ignored_notif_title');
			description = strings('wallet.tokens_ignored_notif_desc');
			errorMsg = 'DetectedTokens: Failed to ignore all detected tokens!';
		} else if (
			(tokensToImport.length > 0 && tokensToIgnore.length > 0) ||
			(tokensToImport.length > 0 && tokensToIgnore.length === 0)
		) {
			// At least some tokens are imported
			title = strings('wallet.tokens_imported_notif_title');
			description = strings('wallet.tokens_imported_notif_desc', {
				tokenSymbols: tokensToImport.map((token) => token.symbol.toUpperCase()).join(', '),
			});
			errorMsg = 'DetectedTokens: Failed to import detected tokens!';
		}

		modalRef.current?.dismissModal(async () => {
			try {
				tokensToIgnore && (await TokensController.ignoreTokens(tokensToIgnore));
				tokensToImport && (await TokensController.importTokens(tokensToImport));
				NotificationManager.showSimpleNotification({
					status: `simple_notification`,
					duration: 5000,
					title,
					description,
				});
			} catch (err) {
				Logger.log(err, errorMsg);
			}
		});
	};

	const triggerOpenConfirmModal = () => {
		navigation.navigate('DetectedTokensConfirmation', {
			onConfirm: dismissModalAndTriggerAction,
		});
	};

	const triggerImportTokens = async () => {
		if (Object.keys(ignoredTokens).length === 0) {
			// Import all tokens
			dismissModalAndTriggerAction();
		} else {
			// Handle ignoring all or mix of imports and ignored tokens
			triggerOpenConfirmModal();
		}
	};

	const renderHeader = () => (
		<Text style={styles.headerLabel}>
			{strings('wallet.tokens_detected', {
				tokenCount: detectedTokens.length,
				tokensLabel: detectedTokens.length > 1 ? 'tokens' : 'token',
			})}
		</Text>
	);

	const renderToken = ({ item }: { item: TokenType }) => {
		const { address } = item;
		const isChecked = !ignoredTokens[address];

		return (
			<Token
				token={item}
				selected={isChecked}
				toggleSelected={(selected) => {
					const newIgnoredTokens = { ...ignoredTokens };
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
			<StyledButton onPress={triggerOpenConfirmModal} containerStyle={styles.fill} type={'normal'}>
				{strings('wallet.tokens_detected_hide')}
			</StyledButton>
			<View style={styles.buttonDivider} />
			<StyledButton onPress={triggerImportTokens} containerStyle={styles.fill} type={'confirm'}>
				{strings('wallet.tokens_detected_import')}
			</StyledButton>
		</View>
	);

	return (
		<ReusableModal ref={modalRef} style={styles.screen}>
			<View style={[styles.sheet, { paddingBottom: safeAreaInsets.bottom }]}>
				<View style={styles.notch} />
				{renderHeader()}
				{renderDetectedTokens()}
				{renderButtons()}
			</View>
		</ReusableModal>
	);
};

export default DetectedTokens;
