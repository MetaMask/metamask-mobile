import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Alert, Text, TextInput, View, StyleSheet } from 'react-native';
import { fontStyles } from '../../../styles/common';
import Engine from '../../../core/Engine';
import { strings } from '../../../../locales/i18n';
import ActionView from '../ActionView';
import Device from '../../../util/device';
import { MetaMetricsEvents } from '../../../core/Analytics';
import {
  validateCustomCollectibleAddress as validateAddress,
  validateCollectibleOwnership as validateOwnership,
  validateCustomCollectibleTokenId as validateTokenId,
} from './util';
import { useTheme } from '../../../util/theme';
import { NFTImportScreenSelectorsIDs } from '../../../../e2e/selectors/wallet/ImportNFTView.selectors';
import { selectSelectedInternalAccountFormattedAddress } from '../../../selectors/accountsController';
import { getDecimalChainId } from '../../../util/networks';
import { useMetrics } from '../../../components/hooks/useMetrics';
import Logger from '../../../util/Logger';
import { NetworkSelectorDropdown } from '../AddCustomToken/NetworkSelectorDropdown';
import { Hex } from '@metamask/utils';
import { TraceName, endTrace, trace } from '../../../util/trace';

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(fontStyles.normal as any),
      color: colors.text.default,
    },
    textInput: {
      borderWidth: 1,
      borderRadius: 4,
      borderColor: colors.border.default,
      padding: 16,
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(fontStyles.normal as any),
      color: colors.text.default,
    },
    warningText: {
      marginTop: 15,
      color: colors.error.default,
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(fontStyles.normal as any),
    },
  });

interface AddCustomCollectibleProps {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation?: any;
  collectibleContract?: {
    address: string;
  };
  setOpenNetworkSelector: (val: boolean) => void;
  selectedNetwork: string | null;
  chainId: string | null;
}

const AddCustomCollectible = ({
  navigation,
  collectibleContract,
  setOpenNetworkSelector,
  selectedNetwork,
  chainId,
}: AddCustomCollectibleProps) => {
  const [mounted, setMounted] = useState<boolean>(true);
  const [address, setAddress] = useState<string>('');
  const [tokenId, setTokenId] = useState<string>('');
  const [warningAddress, setWarningAddress] = useState<string>('');
  const [warningTokenId, setWarningTokenId] = useState<string>('');
  const [inputWidth, setInputWidth] = useState<string | undefined>(
    Device.isAndroid() ? '99%' : undefined,
  );
  const [loading, setLoading] = useState(false);
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const assetTokenIdInput = React.createRef() as any;
  const { colors, themeAppearance } = useTheme();
  const { trackEvent, createEventBuilder } = useMetrics();
  const styles = createStyles(colors);

  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
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

  const getAnalyticsParams = useCallback(() => {
    try {
      return {
        chain_id: getDecimalChainId(chainId),
        source: 'manual',
      };
    } catch (error) {
      Logger.error(error as Error, 'AddCustomCollectible.getAnalyticsParams');
      return undefined;
    }
  }, [chainId]);

  const validateCustomCollectibleAddress = async (): Promise<boolean> => {
    const result = await validateAddress(address, chainId);
    setWarningAddress(result.warningMessage);
    return result.isValid;
  };

  const validateCustomCollectibleTokenId = (): boolean => {
    const result = validateTokenId(tokenId);
    setWarningTokenId(result.warningMessage);
    return result.isValid;
  };

  const validateCustomCollectible = async (): Promise<boolean> => {
    const validatedAddress = await validateCustomCollectibleAddress();
    const validatedTokenId = validateCustomCollectibleTokenId();
    return validatedAddress && validatedTokenId;
  };

  const validateCollectibleOwnership = async (): Promise<boolean> => {
    if (!address) return false;
    const result = await validateOwnership(
      selectedAddress ?? '',
      address,
      tokenId,
    );
    if (!result.isOwner && result.error) {
      Alert.alert(result.error.title, result.error.message);
    }
    return result.isOwner;
  };

  const addNft = async (): Promise<void> => {
    setLoading(true);
    if (!(await validateCustomCollectible())) {
      setLoading(false);
      return;
    }
    if (!(await validateCollectibleOwnership())) {
      setLoading(false);
      return;
    }

    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { NftController } = Engine.context as any;
    NftController.addNft(address, tokenId, chainId);

    trace({ name: TraceName.ImportNfts });

    await NftController.addNft(address, tokenId);

    endTrace({ name: TraceName.ImportNfts });

    const params = getAnalyticsParams();
    if (params) {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.COLLECTIBLE_ADDED)
          .addProperties(params)
          .build(),
      );
    }

    setLoading(false);
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
    <View style={styles.wrapper} testID={NFTImportScreenSelectorsIDs.CONTAINER}>
      <ActionView
        cancelText={strings('add_asset.collectibles.cancel_add_collectible')}
        confirmText={strings('add_asset.collectibles.add_collectible')}
        onCancelPress={cancelAddCollectible}
        onConfirmPress={addNft}
        confirmDisabled={!address || !tokenId || !selectedNetwork}
        loading={loading}
      >
        <View>
          <View style={styles.rowWrapper}>
            <NetworkSelectorDropdown
              setOpenNetworkSelector={setOpenNetworkSelector}
              selectedNetwork={selectedNetwork ?? ''}
              chainId={chainId as Hex}
            />
          </View>
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
              testID={NFTImportScreenSelectorsIDs.ADDRESS_INPUT_BOX}
              onSubmitEditing={jumpToAssetTokenId}
              keyboardAppearance={themeAppearance}
            />
            <Text
              style={styles.warningText}
              testID={NFTImportScreenSelectorsIDs.ADDRESS_WARNING_MESSAGE}
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
              testID={NFTImportScreenSelectorsIDs.IDENTIFIER_INPUT_BOX}
              ref={assetTokenIdInput}
              onSubmitEditing={addNft}
              returnKeyType={'done'}
              placeholder={strings('collectible.id_placeholder')}
              placeholderTextColor={colors.text.muted}
              keyboardAppearance={themeAppearance}
            />
            <Text
              style={styles.warningText}
              testID={NFTImportScreenSelectorsIDs.IDENTIFIER_WARNING_MESSAGE}
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
