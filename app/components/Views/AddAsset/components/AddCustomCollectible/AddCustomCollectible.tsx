import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useSelector } from 'react-redux';
import { TextInput } from 'react-native';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import Engine from '../../../../../core/Engine';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { isValidAddress } from 'ethereumjs-util';
import ActionView from '../../../../UI/ActionView';
import { isSmartContractAddress } from '../../../../../util/transactions';
import Device from '../../../../../util/device';
import { MetaMetricsEvents } from '../../../../../core/Analytics';

import { useTheme } from '../../../../../util/theme';
import {
  selectChainId,
  selectSelectedNetworkClientId,
} from '../../../../../selectors/networkController';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../selectors/accountsController';
import { getDecimalChainId } from '../../../../../util/networks';
import { useMetrics } from '../../../../hooks/useMetrics';
import Logger from '../../../../../util/Logger';
import { TraceName, endTrace, trace } from '../../../../../util/trace';
import { NFTImportScreenSelectorsIDs } from '../../ImportAssetView.testIds';

interface AddCustomCollectibleProps {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation?: any;
  collectibleContract?: {
    address: string;
  };
  selectedNetwork: string | null;
  networkClientId: string | null;
}

const AddCustomCollectible = ({
  navigation,
  collectibleContract,
  selectedNetwork,
  networkClientId,
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
  const { toastRef } = useContext(ToastContext);
  const tw = useTailwind();

  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const chainId = useSelector(selectChainId);
  const selectedNetworkClientId = useSelector(selectSelectedNetworkClientId);

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
    let validated = true;
    const isValidEthAddress = isValidAddress(address);
    const clientId = networkClientId || selectedNetworkClientId;
    if (address.length === 0) {
      setWarningAddress(strings('collectible.address_cant_be_empty'));
      validated = false;
    } else if (!isValidEthAddress) {
      setWarningAddress(strings('collectible.address_must_be_valid'));
      validated = false;
    } else if (!(await isSmartContractAddress(address, chainId, clientId))) {
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
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { NftController } = Engine.context as any;
      const isOwner = await NftController.isNftOwner(
        selectedAddress,
        address,
        tokenId,
        networkClientId,
      );

      if (!isOwner)
        toastRef?.current?.showToast({
          variant: ToastVariants.Plain,
          labelOptions: [
            {
              label: strings('collectible.not_owner_error_title'),
            },
          ],
          descriptionOptions: {
            description: strings('collectible.not_owner_error'),
          },
          hasNoTimeout: false,
        });

      return isOwner;
    } catch {
      toastRef?.current?.showToast({
        variant: ToastVariants.Plain,
        labelOptions: [
          {
            label: strings('collectible.ownership_verification_error_title'),
          },
        ],
        descriptionOptions: {
          description: strings('collectible.ownership_verification_error'),
        },
        hasNoTimeout: false,
      });

      return false;
    }
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

    trace({ name: TraceName.ImportNfts });

    await NftController.addNft(address, tokenId, networkClientId);

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
    <Box
      twClassName="flex-1 bg-default"
      testID={NFTImportScreenSelectorsIDs.CONTAINER}
    >
      <ActionView
        cancelText={strings('add_asset.collectibles.cancel_add_collectible')}
        confirmText={strings('add_asset.collectibles.add_collectible')}
        onCancelPress={cancelAddCollectible}
        onConfirmPress={addNft}
        confirmDisabled={!address || !tokenId || !selectedNetwork}
        loading={loading}
        confirmTestID={'add-collectible-button'}
      >
        <Box>
          <Box twClassName="px-4 py-5">
            <Text variant={TextVariant.BodyMd} style={tw.style('pb-[3px]')}>
              {strings('collectible.collectible_address')}
            </Text>
            <TextInput
              style={tw.style(
                'border border-default rounded p-4 text-default',
                { fontFamily: 'Geist-Regular' },
                inputWidth ? { width: inputWidth } : {},
              )}
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
              variant={TextVariant.BodyMd}
              style={tw.style('mt-[15px] text-error-default')}
              testID={NFTImportScreenSelectorsIDs.ADDRESS_WARNING_MESSAGE}
            >
              {warningAddress}
            </Text>
          </Box>
          <Box twClassName="px-4 py-5">
            <Text variant={TextVariant.BodyMd} style={tw.style('pb-[3px]')}>
              {strings('collectible.collectible_token_id')}
            </Text>
            <TextInput
              style={tw.style(
                'border border-default rounded p-4 text-default',
                { fontFamily: 'Geist-Regular' },
                inputWidth ? { width: inputWidth } : {},
              )}
              value={tokenId}
              keyboardType="numeric"
              onChangeText={onTokenIdChange}
              onBlur={validateCustomCollectibleTokenId}
              testID={NFTImportScreenSelectorsIDs.IDENTIFIER_INPUT_BOX}
              ref={assetTokenIdInput}
              onSubmitEditing={addNft}
              placeholder={strings('collectible.id_placeholder')}
              placeholderTextColor={colors.text.muted}
              keyboardAppearance={themeAppearance}
            />
            <Text
              variant={TextVariant.BodyMd}
              style={tw.style('mt-[15px] text-error-default')}
              testID={NFTImportScreenSelectorsIDs.IDENTIFIER_WARNING_MESSAGE}
            >
              {warningTokenId}
            </Text>
          </Box>
        </Box>
      </ActionView>
    </Box>
  );
};

export default AddCustomCollectible;
