import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Alert, Text, TextInput, View, StyleSheet } from 'react-native';
import { colors, fontStyles } from '../../../styles/common';
import Engine from '../../../core/Engine';
import { strings } from '../../../../locales/i18n';
import { isValidAddress } from 'ethereumjs-util';
import ActionView from '../ActionView';
import { isSmartContractAddress } from '../../../util/transactions';
import Device from '../../../util/device';
import AnalyticsV2 from '../../../util/analyticsV2';

const styles = StyleSheet.create({
	wrapper: {
		backgroundColor: colors.white,
		flex: 1,
	},
	rowWrapper: {
		padding: 20,
	},
	rowTitleText: {
		paddingBottom: 3,
		...(fontStyles.normal as any),
	},
	textInput: {
		borderWidth: 1,
		borderRadius: 4,
		borderColor: colors.grey100,
		padding: 16,
		...(fontStyles.normal as any),
	},
	warningText: {
		marginTop: 15,
		color: colors.red,
		...(fontStyles.normal as any),
	},
});

interface AddCustomCollectibleProps {
	navigation?: any;
	collectibleContract?: {
		address: string;
	};
}

const AddCustomCollectible = ({ navigation, collectibleContract }: AddCustomCollectibleProps) => {
	const [mounted, setMounted] = useState<boolean>(true);
	const [address, setAddress] = useState<string>('');
	const [tokenId, setTokenId] = useState<string>('');
	const [warningAddress, setWarningAddress] = useState<string>('');
	const [warningTokenId, setWarningTokenId] = useState<string>('');
	const [inputWidth, setInputWidth] = useState<string | undefined>(Device.isAndroid() ? '99%' : undefined);
	const assetTokenIdInput = React.createRef() as any;

	const selectedAddress = useSelector(
		(state: any) => state.engine.backgroundState.PreferencesController.selectedAddress
	);
	const chainId = useSelector((state: any) => state.engine.backgroundState.NetworkController.provider.chainId);

	useEffect(() => {
		setMounted(true);
		// Workaround https://github.com/facebook/react-native/issues/9958
		inputWidth &&
			setTimeout(() => {
				mounted && setInputWidth('100%');
			}, 100);
		collectibleContract && setAddress(collectibleContract.address);
		return () => {
			setMounted(false);
		};
	}, [mounted, collectibleContract, inputWidth]);

	const getAnalyticsParams = () => {
		try {
			const { NetworkController } = Engine.context as any;
			const { type } = NetworkController?.state?.provider || {};
			return {
				network_name: type,
				chain_id: chainId,
			};
		} catch (error) {
			return {};
		}
	};

	const validateCustomCollectibleAddress = async (): Promise<boolean> => {
		let validated = true;
		const isValidEthAddress = isValidAddress(address);
		if (address.length === 0) {
			setWarningAddress(strings('collectible.address_cant_be_empty'));
			validated = false;
		} else if (!isValidEthAddress) {
			setWarningAddress(strings('collectible.address_must_be_valid'));
			validated = false;
		} else if (!(await isSmartContractAddress(address, chainId))) {
			setWarningAddress(strings('collectible.address_must_be_smart_contract'));
			validated = false;
		} else {
			setWarningAddress(``);
		}
		return validated;
	};

	const validateCustomCollectibleTokenId = (): boolean => {
		let validated = false;
		if (tokenId.length === 0) {
			setWarningTokenId(strings('collectible.token_id_cant_be_empty'));
		} else {
			setWarningTokenId(``);
			validated = true;
		}
		return validated;
	};

	const validateCustomCollectible = async (): Promise<boolean> => {
		const validatedAddress = await validateCustomCollectibleAddress();
		const validatedTokenId = validateCustomCollectibleTokenId();
		return validatedAddress && validatedTokenId;
	};

	/**
	 * Method to validate collectible ownership.
	 *
	 * @returns Promise that resolves ownershio as a boolean.
	 */
	const validateCollectibleOwnership = async (): Promise<boolean> => {
		try {
			const { CollectiblesController } = Engine.context as any;
			const isOwner = await CollectiblesController.isCollectibleOwner(selectedAddress, address, tokenId);

			if (!isOwner)
				Alert.alert(strings('collectible.not_owner_error_title'), strings('collectible.not_owner_error'));

			return isOwner;
		} catch {
			Alert.alert(
				strings('collectible.ownership_verification_error_title'),
				strings('collectible.ownership_verification_error')
			);

			return false;
		}
	};

	const addCollectible = async (): Promise<void> => {
		if (!(await validateCustomCollectible())) return;
		if (!(await validateCollectibleOwnership())) return;

		const { CollectiblesController } = Engine.context as any;
		CollectiblesController.addCollectible(address, tokenId);

		AnalyticsV2.trackEvent(AnalyticsV2.ANALYTICS_EVENTS.COLLECTIBLE_ADDED, getAnalyticsParams());

		navigation.goBack();
	};

	const cancelAddCollectible = (): void => {
		navigation.goBack();
	};

	const onAddressChange = (newAddress: string): void => {
		setAddress(newAddress);
	};

	const onTokenIdChange = (newTokenId: string): void => {
		setTokenId(newTokenId);
	};

	const jumpToAssetTokenId = (): void => {
		assetTokenIdInput.current?.focus();
	};

	return (
		<View style={styles.wrapper} testID={'add-custom-token-screen'}>
			<ActionView
				cancelTestID={'add-custom-asset-cancel-button'}
				confirmTestID={'add-custom-asset-confirm-button'}
				cancelText={strings('add_asset.collectibles.cancel_add_collectible')}
				confirmText={strings('add_asset.collectibles.add_collectible')}
				onCancelPress={cancelAddCollectible}
				onConfirmPress={addCollectible}
				confirmDisabled={!address && !tokenId}
			>
				<View>
					<View style={styles.rowWrapper}>
						<Text style={styles.rowTitleText}>{strings('collectible.collectible_address')}</Text>
						<TextInput
							style={[styles.textInput, inputWidth ? { width: inputWidth } : {}]}
							placeholder={'0x...'}
							placeholderTextColor={colors.grey100}
							value={address}
							onChangeText={onAddressChange}
							onBlur={validateCustomCollectibleAddress}
							testID={'input-collectible-address'}
							onSubmitEditing={jumpToAssetTokenId}
						/>
						<Text style={styles.warningText} testID={'collectible-address-warning'}>
							{warningAddress}
						</Text>
					</View>
					<View style={styles.rowWrapper}>
						<Text style={styles.rowTitleText}>{strings('collectible.collectible_token_id')}</Text>
						<TextInput
							style={[styles.textInput, inputWidth ? { width: inputWidth } : {}]}
							value={tokenId}
							keyboardType="numeric"
							onChangeText={onTokenIdChange}
							onBlur={validateCustomCollectibleTokenId}
							testID={'input-token-decimals'}
							ref={assetTokenIdInput}
							onSubmitEditing={addCollectible}
							returnKeyType={'done'}
							placeholder={strings('collectible.id_placeholder')}
							placeholderTextColor={colors.grey100}
						/>
						<Text style={styles.warningText} testID={'collectible-identifier-warning'}>
							{warningTokenId}
						</Text>
					</View>
				</View>
			</ActionView>
		</View>
	);
};

export default AddCustomCollectible;
