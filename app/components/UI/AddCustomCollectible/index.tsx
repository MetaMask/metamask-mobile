import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  Alert,
  Text,
  TextInput,
  View,
  StyleSheet,
  Platform,
} from 'react-native';
import { fontStyles } from '../../../styles/common';
import Engine from '../../../core/Engine';
import { strings } from '../../../../locales/i18n';
import { isValidAddress } from 'ethereumjs-util';
import ActionView from '../ActionView';
import { isSmartContractAddress } from '../../../util/transactions';
import Device from '../../../util/device';
import { MetaMetricsEvents } from '../../../core/Analytics';
import AnalyticsV2 from '../../../util/analyticsV2';

import { useTheme } from '../../../util/theme';
import { CUSTOM_TOKEN_CONTAINER_ID } from '../../../../wdio/screen-objects/testIDs/Screens/AddCustomToken.testIds';
import generateTestId from '../../../../wdio/utils/generateTestId';
import {
  NFT_ADDRESS_INPUT_BOX_ID,
  NFT_IDENTIFIER_WARNING_MESSAGE_ID,
  NFT_ADDRESS_WARNING_MESSAGE_ID,
  NFT_IDENTIFIER_INPUT_BOX_ID,
} from '../../../../wdio/screen-objects/testIDs/Screens/NFTImportScreen.testIds';

const createStyles = (colors: any) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    rowWrapper: {
      padding: 20,
    },
    rowTitleText: {
      paddingBottom: 3,
      ...(fontStyles.normal as any),
      color: colors.text.default,
    },
    textInput: {
      borderWidth: 1,
      borderRadius: 4,
      borderColor: colors.border.default,
      padding: 16,
      ...(fontStyles.normal as any),
      color: colors.text.default,
    },
    warningText: {
      marginTop: 15,
      color: colors.error.default,
      ...(fontStyles.normal as any),
    },
  });

interface AddCustomCollectibleProps {
  navigation?: any;
  collectibleContract?: {
    address: string;
  };
}

const AddCustomCollectible = ({
  navigation,
  collectibleContract,
}: AddCustomCollectibleProps) => {
  const [mounted, setMounted] = useState<boolean>(true);
  const [address, setAddress] = useState<string>('');
  const [tokenId, setTokenId] = useState<string>('');
  const [warningAddress, setWarningAddress] = useState<string>('');
  const [warningTokenId, setWarningTokenId] = useState<string>('');
  const [inputWidth, setInputWidth] = useState<string | undefined>(
    Device.isAndroid() ? '99%' : undefined,
  );
  const assetTokenIdInput = React.createRef() as any;
  const { colors, themeAppearance } = useTheme();
  const styles = createStyles(colors);

  const selectedAddress = useSelector(
    (state: any) =>
      state.engine.backgroundState.PreferencesController.selectedAddress,
  );
  const chainId = useSelector(
    (state: any) =>
      state.engine.backgroundState.NetworkController.provider.chainId,
  );

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
      return {
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
      const { NftController } = Engine.context as any;
      const isOwner = await NftController.isNftOwner(
        selectedAddress,
        address,
        tokenId,
      );

      if (!isOwner)
        Alert.alert(
          strings('collectible.not_owner_error_title'),
          strings('collectible.not_owner_error'),
        );

      return isOwner;
    } catch {
      Alert.alert(
        strings('collectible.ownership_verification_error_title'),
        strings('collectible.ownership_verification_error'),
      );

      return false;
    }
  };

  const addNft = async (): Promise<void> => {
    if (!(await validateCustomCollectible())) return;
    if (!(await validateCollectibleOwnership())) return;

    const { NftController } = Engine.context as any;
    NftController.addNft(address, tokenId);

    AnalyticsV2.trackEvent(
      MetaMetricsEvents.COLLECTIBLE_ADDED,
      getAnalyticsParams(),
    );

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
    <View
      style={styles.wrapper}
      {...generateTestId(Platform, CUSTOM_TOKEN_CONTAINER_ID)}
    >
      <ActionView
        cancelTestID={'add-custom-asset-cancel-button'}
        confirmTestID={'add-custom-asset-confirm-button'}
        cancelText={strings('add_asset.collectibles.cancel_add_collectible')}
        confirmText={strings('add_asset.collectibles.add_collectible')}
        onCancelPress={cancelAddCollectible}
        onConfirmPress={addNft}
        confirmDisabled={!address && !tokenId}
      >
        <View>
          <View style={styles.rowWrapper}>
            <Text style={styles.rowTitleText}>
              {strings('collectible.collectible_address')}
            </Text>
            <TextInput
              style={[
                styles.textInput,
                inputWidth ? { width: inputWidth } : {},
              ]}
              placeholder={'0x...'}
              placeholderTextColor={colors.text.muted}
              value={address}
              onChangeText={onAddressChange}
              onBlur={validateCustomCollectibleAddress}
              {...generateTestId(Platform, NFT_ADDRESS_INPUT_BOX_ID)}
              onSubmitEditing={jumpToAssetTokenId}
              keyboardAppearance={themeAppearance}
            />
            <Text
              style={styles.warningText}
              {...generateTestId(Platform, NFT_ADDRESS_WARNING_MESSAGE_ID)}
            >
              {warningAddress}
            </Text>
          </View>
          <View style={styles.rowWrapper}>
            <Text style={styles.rowTitleText}>
              {strings('collectible.collectible_token_id')}
            </Text>
            <TextInput
              style={[
                styles.textInput,
                inputWidth ? { width: inputWidth } : {},
              ]}
              value={tokenId}
              keyboardType="numeric"
              onChangeText={onTokenIdChange}
              onBlur={validateCustomCollectibleTokenId}
              {...generateTestId(Platform, NFT_IDENTIFIER_INPUT_BOX_ID)}
              ref={assetTokenIdInput}
              onSubmitEditing={addNft}
              returnKeyType={'done'}
              placeholder={strings('collectible.id_placeholder')}
              placeholderTextColor={colors.text.muted}
              keyboardAppearance={themeAppearance}
            />
            <Text
              style={styles.warningText}
              {...generateTestId(Platform, NFT_IDENTIFIER_WARNING_MESSAGE_ID)}
            >
              {warningTokenId}
            </Text>
          </View>
        </View>
      </ActionView>
    </View>
  );
};

export default AddCustomCollectible;
