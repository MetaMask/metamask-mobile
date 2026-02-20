import React, {
  useState,
  useEffect,
  useCallback,
  useContext,
  useRef,
  useMemo,
} from 'react';
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

// --- Pure validation helpers ---

const getAddressError = (addr: string, isContract: boolean | null): string => {
  const trimmed = addr.trim();
  if (!trimmed) return strings('collectible.address_cant_be_empty');
  if (!isValidAddress(trimmed))
    return strings('collectible.address_must_be_valid');
  if (isContract === false)
    return strings('collectible.address_must_be_smart_contract');
  return '';
};

const getTokenIdError = (id: string): string => {
  if (!id.trim()) return strings('collectible.token_id_cant_be_empty');
  return '';
};

// --- Hook: smart contract validation ---

function useSmartContractCheck(
  address: string,
  chainId: string,
  networkClientId: string | null,
) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSmartContract, setIsSmartContract] = useState<boolean | null>(null);

  useEffect(() => {
    const trimmed = address.trim();

    if (!isValidAddress(trimmed)) {
      setIsSmartContract(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    setIsLoading(true);
    setIsSmartContract(null);

    const run = async () => {
      try {
        const isContract = await isSmartContractAddress(
          trimmed,
          chainId,
          networkClientId ?? undefined,
        );
        if (cancelled) return;
        setIsSmartContract(Boolean(isContract));
      } catch (error) {
        Logger.error(
          error as Error,
          'useSmartContractCheck: failed to validate address',
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [address, chainId, networkClientId]);

  return { isLoading, isSmartContract };
}

// --- Types ---

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

// --- Component ---

const AddCustomCollectible = ({
  navigation,
  collectibleContract,
  selectedNetwork,
  networkClientId,
}: AddCustomCollectibleProps) => {
  const [address, setAddress] = useState('');
  const [tokenId, setTokenId] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>(
    {},
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tokenIdInputRef = useRef<TextInput>(null);

  const { colors, themeAppearance } = useTheme();
  const { trackEvent, createEventBuilder } = useMetrics();
  const { toastRef } = useContext(ToastContext);
  const tw = useTailwind();

  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const chainId = useSelector(selectChainId);
  const selectedNetworkClientId = useSelector(selectSelectedNetworkClientId);

  // Pre-fill address from prop
  useEffect(() => {
    if (collectibleContract?.address) {
      setAddress(collectibleContract.address);
    }
  }, [collectibleContract]);

  // Reactive smart contract validation
  const clientId = networkClientId || selectedNetworkClientId;
  const { isLoading: isValidating, isSmartContract } = useSmartContractCheck(
    address,
    chainId,
    clientId,
  );

  // --- Derived validation ---

  const addressError = useMemo(
    () => getAddressError(address, isSmartContract),
    [address, isSmartContract],
  );
  const tokenIdError = useMemo(() => getTokenIdError(tokenId), [tokenId]);

  const showAddressError = (!!address.trim() || hasSubmitted) && !!addressError;
  const showTokenIdError =
    (touchedFields.tokenId || hasSubmitted) && !!tokenIdError;

  const confirmDisabled =
    !!addressError || !!tokenIdError || isValidating || !selectedNetwork;

  // --- Handlers ---

  const markTouched = useCallback((field: string) => {
    setTouchedFields((prev) => ({ ...prev, [field]: true }));
  }, []);

  const validateCollectibleOwnership =
    useCallback(async (): Promise<boolean> => {
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

        if (!isOwner) {
          toastRef?.current?.showToast({
            variant: ToastVariants.Plain,
            labelOptions: [
              { label: strings('collectible.not_owner_error_title') },
            ],
            descriptionOptions: {
              description: strings('collectible.not_owner_error'),
            },
            hasNoTimeout: false,
          });
        }

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
    }, [selectedAddress, address, tokenId, networkClientId, toastRef]);

  const addNft = useCallback(async (): Promise<void> => {
    setHasSubmitted(true);
    if (addressError || tokenIdError || isValidating) return;

    setIsSubmitting(true);
    try {
      if (!(await validateCollectibleOwnership())) return;

      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { NftController } = Engine.context as any;

      trace({ name: TraceName.ImportNfts });
      await NftController.addNft(address, tokenId, networkClientId);
      endTrace({ name: TraceName.ImportNfts });

      try {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.COLLECTIBLE_ADDED)
            .addProperties({
              chain_id: getDecimalChainId(chainId),
              source: 'manual',
            })
            .build(),
        );
      } catch (error) {
        Logger.error(error as Error, 'AddCustomCollectible.analytics error');
      }

      navigation.goBack();
    } finally {
      setIsSubmitting(false);
    }
  }, [
    addressError,
    tokenIdError,
    isValidating,
    validateCollectibleOwnership,
    address,
    tokenId,
    networkClientId,
    chainId,
    trackEvent,
    createEventBuilder,
    navigation,
  ]);

  const cancelAddCollectible = useCallback((): void => {
    navigation.goBack();
  }, [navigation]);

  // --- Styles ---

  const baseInputFont = { fontFamily: 'Geist-Regular' };

  const getInputStyle = (hasError: boolean) =>
    tw.style(
      'rounded-lg px-4 py-3 text-default',
      baseInputFont,
      hasError ? 'border-2 border-error-default' : 'border border-default',
    );

  // --- Render ---

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
        confirmDisabled={confirmDisabled}
        loading={isSubmitting}
        confirmTestID={'add-collectible-button'}
        extraScrollHeight={20}
      >
        <Box>
          {/* Address */}
          <Box twClassName="px-4 pt-4">
            <Text variant={TextVariant.BodyMd} style={tw.style('pb-[3px]')}>
              {strings('collectible.collectible_address')}
            </Text>
            <TextInput
              style={getInputStyle(showAddressError)}
              placeholder="0x..."
              placeholderTextColor={colors.text.muted}
              value={address}
              onChangeText={setAddress}
              onBlur={() => markTouched('address')}
              testID={NFTImportScreenSelectorsIDs.ADDRESS_INPUT_BOX}
              onSubmitEditing={() => tokenIdInputRef.current?.focus()}
              returnKeyType="next"
              keyboardAppearance={themeAppearance}
            />
            {showAddressError ? (
              <Text
                variant={TextVariant.BodyMd}
                style={tw.style('mt-1 text-error-default pb-2')}
                testID={NFTImportScreenSelectorsIDs.ADDRESS_WARNING_MESSAGE}
              >
                {addressError}
              </Text>
            ) : null}
          </Box>

          {/* Token ID */}
          <Box twClassName="px-4 pt-4">
            <Text variant={TextVariant.BodyMd} style={tw.style('pb-[3px]')}>
              {strings('collectible.collectible_token_id')}
            </Text>
            <TextInput
              style={getInputStyle(showTokenIdError)}
              value={tokenId}
              keyboardType="numeric"
              onChangeText={setTokenId}
              onBlur={() => markTouched('tokenId')}
              testID={NFTImportScreenSelectorsIDs.IDENTIFIER_INPUT_BOX}
              ref={tokenIdInputRef}
              onSubmitEditing={addNft}
              placeholder={strings('collectible.id_placeholder')}
              placeholderTextColor={colors.text.muted}
              returnKeyType="done"
              keyboardAppearance={themeAppearance}
            />
            {showTokenIdError ? (
              <Text
                variant={TextVariant.BodyMd}
                style={tw.style('mt-1 text-error-default pb-2')}
                testID={NFTImportScreenSelectorsIDs.IDENTIFIER_WARNING_MESSAGE}
              >
                {tokenIdError}
              </Text>
            ) : null}
          </Box>
        </Box>
      </ActionView>
    </Box>
  );
};

export default AddCustomCollectible;
