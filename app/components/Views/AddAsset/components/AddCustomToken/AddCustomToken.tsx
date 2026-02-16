import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { TextInput, Platform, ActivityIndicator } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import type { Hex } from '@metamask/utils';
import { useNavigation, type ParamListBase } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import Engine from '../../../../../core/Engine';
import { strings } from '../../../../../../locales/i18n';
import { isValidAddress } from 'ethereumjs-util';
import { isSmartContractAddress } from '../../../../../util/transactions';
import { MetaMetricsEvents } from '../../../../../core/Analytics';

import AppConstants from '../../../../../core/AppConstants';
import Alert, { AlertType } from '../../../../Base/Alert';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import NotificationManager from '../../../../../core/NotificationManager';
import { useTheme } from '../../../../../util/theme';
import { ImportTokenViewSelectorsIDs } from '../../ImportAssetView.testIds';
import {
  getBlockExplorerAddressUrl,
  getDecimalChainId,
} from '../../../../../util/networks';
import { useMetrics } from '../../../../hooks/useMetrics';
import { formatIconUrlWithProxy } from '@metamask/assets-controllers';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import Banner, {
  BannerAlertSeverity,
  BannerVariant,
} from '../../../../../component-library/components/Banners/Banner';
import CLText from '../../../../../component-library/components/Texts/Text/Text';
import Logger from '../../../../../util/Logger';
import { endTrace, trace, TraceName } from '../../../../../util/trace';
import {
  selectNetworkConfigurationByChainId,
  selectDefaultEndpointByChainId,
  selectProviderTypeByChainId,
} from '../../../../../selectors/networkController';
import { RootState } from '../../../../../reducers';

// --- Types ---

interface AddCustomTokenProps {
  chainId: string;
  isTokenDetectionSupported?: boolean;
  tabLabel?: string;
}

// --- Pure validation helpers ---

const getAddressError = (addr: string, isContract: boolean | null): string => {
  const trimmed = addr.trim();
  if (!trimmed) return strings('token.address_cant_be_empty');
  if (!isValidAddress(trimmed)) return strings('token.address_must_be_valid');
  if (isContract === false)
    return strings('token.address_must_be_smart_contract');
  return '';
};

const getSymbolError = (sym: string): string => {
  if (!sym.trim()) return strings('token.symbol_cant_be_empty');
  return '';
};

const getSymbolWarning = (sym: string): string => {
  if (sym.trim() && sym.length >= 11) return strings('token.symbol_length');
  return '';
};

const getDecimalsError = (dec: string): string => {
  if (!dec.trim()) return strings('token.decimals_is_required');
  return '';
};

// --- Hook: token metadata fetching ---

function useTokenMetadata(
  address: string,
  chainId: string,
  networkClientId: string | null,
) {
  const [symbol, setSymbol] = useState('');
  const [decimals, setDecimals] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSmartContract, setIsSmartContract] = useState<boolean | null>(null);

  useEffect(() => {
    const trimmed = address.trim();

    if (!isValidAddress(trimmed)) {
      setIsSmartContract(null);
      setSymbol('');
      setDecimals('');
      setName('');
      return;
    }

    let cancelled = false;

    setIsLoading(true);
    setIsSmartContract(null);
    setSymbol('');
    setDecimals('');
    setName('');

    const run = async () => {
      try {
        const isContract = await isSmartContractAddress(trimmed, chainId);
        if (cancelled) return;
        setIsSmartContract(Boolean(isContract));

        if (!isContract) return;

        const { AssetsContractController } = Engine.context;
        const clientId = networkClientId ?? undefined;
        const [d, s, n] = await Promise.all([
          AssetsContractController.getERC20TokenDecimals(trimmed, clientId),
          AssetsContractController.getERC721AssetSymbol(trimmed, clientId),
          AssetsContractController.getERC20TokenName(trimmed, clientId),
        ]);
        if (cancelled) return;

        setDecimals(String(d));
        setSymbol(s);
        setName(n);
      } catch (error) {
        Logger.error(
          error as Error,
          'useTokenMetadata: failed to fetch token metadata',
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

  return {
    symbol,
    setSymbol,
    decimals,
    setDecimals,
    name,
    isLoading,
    isSmartContract,
  };
}

// --- Component ---

const AddCustomToken = ({
  chainId,
  isTokenDetectionSupported,
}: AddCustomTokenProps) => {
  const [address, setAddress] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>(
    {},
  );

  const symbolInputRef = useRef<TextInput>(null);
  const decimalsInputRef = useRef<TextInput>(null);

  const navigation = useNavigation<StackNavigationProp<ParamListBase>>();
  const { colors, themeAppearance } = useTheme();
  const { trackEvent, createEventBuilder } = useMetrics();
  const tw = useTailwind();
  const insets = useSafeAreaInsets();

  // Network selectors
  const networkConfig = useSelector((state: RootState) =>
    selectNetworkConfigurationByChainId(state, chainId),
  );
  const defaultEndpoint = useSelector((state: RootState) =>
    selectDefaultEndpointByChainId(state, chainId as Hex),
  );
  const providerType = useSelector((state: RootState) =>
    selectProviderTypeByChainId(state, chainId as Hex),
  );

  const networkName = networkConfig?.name ?? '';
  const ticker = networkConfig?.nativeCurrency ?? '';
  const networkClientId = defaultEndpoint?.networkClientId ?? null;

  // Token metadata (async validation + RPC fetch)
  const {
    symbol,
    setSymbol,
    decimals,
    setDecimals,
    name,
    isLoading,
    isSmartContract,
  } = useTokenMetadata(address, chainId, networkClientId);

  // Reset form on network change (hook resets its own state when address clears)
  useEffect(() => {
    setAddress('');
    setTouchedFields({});
    setHasSubmitted(false);
  }, [chainId]);

  // --- Derived validation ---

  const addressError = useMemo(
    () => getAddressError(address, isSmartContract),
    [address, isSmartContract],
  );
  const symbolError = useMemo(() => getSymbolError(symbol), [symbol]);
  const symbolWarning = useMemo(() => getSymbolWarning(symbol), [symbol]);
  const decimalsError = useMemo(() => getDecimalsError(decimals), [decimals]);

  const showSecondaryFields =
    isValidAddress(address.trim()) && isSmartContract === true && !isLoading;

  const showAddressError = (!!address.trim() || hasSubmitted) && !!addressError;
  const showSymbolError =
    (touchedFields.symbol || hasSubmitted) && !!symbolError;
  const showDecimalsError =
    (touchedFields.decimals || hasSubmitted) && !!decimalsError;

  const isNextDisabled =
    !!addressError || !!symbolError || !!decimalsError || isLoading;

  const { title: explorerTitle, url: explorerUrl } = getBlockExplorerAddressUrl(
    providerType ?? '',
    address,
  );

  // --- Handlers ---

  const markTouched = useCallback((field: string) => {
    setTouchedFields((prev) => ({ ...prev, [field]: true }));
  }, []);

  const navigateToSecurityTips = useCallback(() => {
    navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: AppConstants.URLS.SECURITY,
        title: strings('add_asset.banners.custom_security_tips'),
      },
    });
  }, [navigation]);

  const addToken = useCallback(async (): Promise<void> => {
    const { TokensController } = Engine.context;

    trace({ name: TraceName.ImportTokens });
    await TokensController.addToken({
      address: address.trim(),
      symbol,
      decimals: Number(decimals),
      name,
      networkClientId: networkClientId ?? '',
    });
    endTrace({ name: TraceName.ImportTokens });

    try {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.TOKEN_ADDED)
          .addProperties({
            token_address: address.trim(),
            token_symbol: symbol,
            chain_id: getDecimalChainId(chainId),
            source: 'Custom token',
          })
          .build(),
      );
    } catch (error) {
      Logger.error(
        error as Error,
        'AddCustomToken.getTokenAddedAnalyticsParams error',
      );
    }

    setAddress('');
    setHasSubmitted(false);
    setTouchedFields({});

    NotificationManager.showSimpleNotification({
      status: 'import_success',
      duration: 5000,
      title: strings('wallet.token_toast.token_imported_title'),
      description: strings('wallet.token_toast.token_imported_desc_1'),
    });
  }, [
    address,
    symbol,
    decimals,
    name,
    networkClientId,
    chainId,
    trackEvent,
    createEventBuilder,
  ]);

  const handleNext = useCallback(() => {
    setHasSubmitted(true);
    if (addressError || symbolError || decimalsError || isLoading) return;

    const trimmedAddress = address.trim();
    navigation.push('ConfirmAddAsset', {
      selectedAsset: [
        {
          symbol,
          address: trimmedAddress,
          iconUrl: formatIconUrlWithProxy({
            chainId: chainId as Hex,
            tokenAddress: trimmedAddress,
          }),
          name,
          decimals,
          chainId,
        },
      ],
      networkName,
      chainId,
      ticker,
      addTokenList: addToken,
    });
  }, [
    addressError,
    symbolError,
    decimalsError,
    isLoading,
    address,
    symbol,
    name,
    decimals,
    chainId,
    networkName,
    ticker,
    navigation,
    addToken,
  ]);

  // --- Styles ---

  const baseInputFont = { fontFamily: 'Geist-Regular' };
  const bottomInset = Platform.OS === 'ios' ? 0 : insets.bottom;

  const getInputStyle = (hasError: boolean) =>
    tw.style(
      'rounded-lg px-4 py-3',
      baseInputFont,
      hasError
        ? 'border-2 border-error-default'
        : 'border border-default text-default',
    );

  // --- Render ---

  return (
    <Box twClassName="flex-1 bg-default px-4">
      <KeyboardAwareScrollView extraScrollHeight={20}>
        {/* Banner */}
        {isTokenDetectionSupported ? (
          <Box twClassName="mt-5">
            <Banner
              variant={BannerVariant.Alert}
              severity={BannerAlertSeverity.Warning}
              description={
                <CLText>
                  {strings('add_asset.banners.custom_warning_desc')}
                  <CLText
                    style={tw.style('text-info-default')}
                    onPress={navigateToSecurityTips}
                  >
                    {strings('add_asset.banners.custom_warning_link')}
                  </CLText>
                </CLText>
              }
            />
          </Box>
        ) : (
          <Alert
            type={AlertType.Info}
            style={tw.style('mt-5')}
            renderIcon={() => (
              <FontAwesome
                style={tw.style('pt-1 pr-2')}
                name={'exclamation-circle'}
                color={colors.primary.default}
                size={18}
              />
            )}
          >
            <>
              <Text
                variant={TextVariant.BodyMd}
                style={tw.style('text-default')}
              >
                {strings('add_asset.banners.custom_info_desc')}
              </Text>
              <Text
                variant={TextVariant.BodyMd}
                style={tw.style('text-primary-default')}
                onPress={navigateToSecurityTips}
              >
                {strings('add_asset.banners.custom_info_link')}
              </Text>
            </>
          </Alert>
        )}

        {/* Address */}
        <Box twClassName="pt-4">
          <Text variant={TextVariant.BodyMd} style={tw.style('pb-[3px]')}>
            {strings('asset_details.address')}
          </Text>
          <TextInput
            style={getInputStyle(showAddressError)}
            placeholder="0x..."
            placeholderTextColor={colors.text.muted}
            value={address}
            onChangeText={setAddress}
            onBlur={() => markTouched('address')}
            testID={ImportTokenViewSelectorsIDs.ADDRESS_INPUT}
            onSubmitEditing={() => symbolInputRef.current?.focus()}
            returnKeyType="next"
            keyboardAppearance={themeAppearance}
          />
          {showAddressError ? (
            <Text
              variant={TextVariant.BodyMd}
              style={tw.style('mt-1 text-error-default pb-2')}
              testID={ImportTokenViewSelectorsIDs.ADDRESS_WARNING_MESSAGE}
            >
              {addressError}
            </Text>
          ) : null}
          {isLoading ? (
            <Box twClassName="mt-4 items-center">
              <ActivityIndicator size="small" color={colors.primary.default} />
            </Box>
          ) : null}
        </Box>

        {/* Symbol */}
        {showSecondaryFields ? (
          <Box twClassName="pt-4 px-4">
            <Text variant={TextVariant.BodyMd} style={tw.style('pb-[3px]')}>
              {strings('token.token_symbol')}
            </Text>
            <TextInput
              style={getInputStyle(showSymbolError)}
              placeholder="GNO"
              placeholderTextColor={colors.text.muted}
              value={symbol}
              onChangeText={setSymbol}
              onBlur={() => markTouched('symbol')}
              testID={ImportTokenViewSelectorsIDs.SYMBOL_INPUT}
              ref={symbolInputRef}
              onSubmitEditing={() => decimalsInputRef.current?.focus()}
              returnKeyType="next"
              keyboardAppearance={themeAppearance}
            />
            {showSymbolError ? (
              <Text
                variant={TextVariant.BodyMd}
                style={tw.style('mt-1 text-error-default pb-2')}
              >
                {symbolError}
              </Text>
            ) : null}
            {!showSymbolError && symbolWarning ? (
              <Text
                variant={TextVariant.BodyMd}
                style={tw.style('mt-1 text-error-default pb-2')}
              >
                {symbolWarning}
              </Text>
            ) : null}
          </Box>
        ) : null}

        {/* Decimals */}
        {showSecondaryFields ? (
          <Box twClassName="pt-4 px-4">
            <Text variant={TextVariant.BodyMd} style={tw.style('pb-[3px]')}>
              {strings('token.token_decimal')}
            </Text>
            <TextInput
              style={getInputStyle(showDecimalsError)}
              value={decimals}
              keyboardType="numeric"
              maxLength={2}
              placeholder="18"
              placeholderTextColor={colors.text.muted}
              onChangeText={setDecimals}
              onBlur={() => markTouched('decimals')}
              testID={ImportTokenViewSelectorsIDs.DECIMAL_INPUT}
              ref={decimalsInputRef}
              onSubmitEditing={handleNext}
              returnKeyType="done"
              keyboardAppearance={themeAppearance}
            />
            {showDecimalsError ? (
              <Text
                variant={TextVariant.BodyMd}
                style={tw.style('mt-1 text-error-default pb-2')}
                testID={ImportTokenViewSelectorsIDs.PRECISION_WARNING_MESSAGE}
              >
                {decimalsError}{' '}
                <Text
                  variant={TextVariant.BodyMd}
                  style={tw.style('text-info-default')}
                  onPress={() => {
                    navigation.navigate('Webview', {
                      screen: 'SimpleWebview',
                      params: { url: explorerUrl, title: explorerTitle },
                    });
                  }}
                >
                  {explorerTitle}{' '}
                  <Icon
                    style={tw.style('text-info-default')}
                    size={IconSize.Xss}
                    name={IconName.Export}
                  />
                </Text>{' '}
              </Text>
            ) : null}
          </Box>
        ) : null}
      </KeyboardAwareScrollView>

      <Box style={tw.style('pt-4 m-4', { paddingBottom: bottomInset })}>
        <Button
          variant={ButtonVariants.Primary}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
          label={strings('transaction.next')}
          onPress={handleNext}
          isDisabled={isNextDisabled}
          testID={ImportTokenViewSelectorsIDs.NEXT_BUTTON}
        />
      </Box>
    </Box>
  );
};

export default AddCustomToken;
