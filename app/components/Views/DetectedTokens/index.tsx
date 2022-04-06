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
import { useNavigation } from '@react-navigation/native';
import NotificationManager from '../../../core/NotificationManager';
import { strings } from '../../../../locales/i18n';
import Logger from '../../../util/Logger';
import { mockTheme, useAppThemeFromContext } from '../../../util/theme';

const createStyles = (colors: any) =>
	StyleSheet.create({
		fill: {
			flex: 1,
		},
		screen: { justifyContent: 'flex-end' },
		sheet: {
			backgroundColor: colors.background.default,
			borderTopLeftRadius: 10,
			borderTopRightRadius: 10,
			height: '75%',
		},
		notch: {
			width: 48,
			height: 5,
			borderRadius: 4,
			backgroundColor: colors.border.default,
			marginTop: 16,
			alignSelf: 'center',
		},
		headerLabel: {
			textAlign: 'center',
			...(fontStyles.normal as any),
			fontSize: 18,
			paddingVertical: 16,
			color: colors.text.default,
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
	const { colors } = useAppThemeFromContext() || mockTheme;
	const styles = createStyles(colors);

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
			title = strings('wallet.token_toast.tokens_hidden_title');
			description = strings('wallet.token_toast.tokens_hidden_desc');
			errorMsg = 'DetectedTokens: Failed to hide all detected tokens!';
		} else if (
			(tokensToImport.length > 0 && tokensToIgnore.length > 0) ||
			(tokensToImport.length > 0 && tokensToIgnore.length === 0)
		) {
			// At least some tokens are imported
			title = strings('wallet.token_toast.tokens_imported_title');
			description = strings('wallet.token_toast.tokens_imported_desc', {
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
			{strings(`detected_tokens.title${detectedTokens.length > 1 ? '_plural' : ''}`, {
				tokenCount: detectedTokens.length,
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
				{strings('detected_tokens.hide_cta')}
			</StyledButton>
			<View style={styles.buttonDivider} />
			<StyledButton onPress={triggerImportTokens} containerStyle={styles.fill} type={'confirm'}>
				{strings('detected_tokens.import_cta')}
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
