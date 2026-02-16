import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import { TextInput, ScrollView, Platform } from 'react-native';
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
import { regex } from '../../../../../util/regex';
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

interface AddCustomTokenProps {
  /** The chain ID for the current selected network */
  chainId: string;
  /** Checks if token detection is supported */
  isTokenDetectionSupported?: boolean;
  /** Tab label for ScrollableTabView */
  tabLabel?: string;
}

const AddCustomToken = ({
  chainId,
  isTokenDetectionSupported,
}: AddCustomTokenProps) => {
  const [address, setAddress] = useState('');
  const [symbol, setSymbol] = useState('');
  const [decimals, setDecimals] = useState('');
  const [name, setName] = useState('');
  const [warningAddress, setWarningAddress] = useState('');
  const [warningSymbol, setWarningSymbol] = useState('');
  const [warningDecimals, setWarningDecimals] = useState('');
  const [isSymbolEditable, setIsSymbolEditable] = useState(true);
  const [isDecimalEditable, setIsDecimalEditable] = useState(true);
  const [onFocusAddress, setOnFocusAddress] = useState(false);

  const assetSymbolInput = useRef<TextInput>(null);
  const assetPrecisionInput = useRef<TextInput>(null);

  const navigation = useNavigation<StackNavigationProp<ParamListBase>>();
  const { colors, themeAppearance } = useTheme();
  const { trackEvent, createEventBuilder } = useMetrics();
  const tw = useTailwind();
  const insets = useSafeAreaInsets();

  // Derive network details from chainId via selectors
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
  const networkClientId = useMemo(
    () => defaultEndpoint?.networkClientId ?? null,
    [defaultEndpoint],
  );

  // Reset fields when the network changes
  useEffect(() => {
    setAddress('');
    setSymbol('');
    setDecimals('');
    setName('');
    setWarningAddress('');
    setWarningSymbol('');
    setWarningDecimals('');
  }, [chainId]);

  const getTokenAddedAnalyticsParams = useCallback(() => {
    try {
      return {
        token_address: address,
        token_symbol: symbol,
        chain_id: getDecimalChainId(chainId),
        source: 'Custom token',
      };
    } catch (error) {
      Logger.error(
        error as Error,
        'AddCustomToken.getTokenAddedAnalyticsParams error',
      );
      return undefined;
    }
  }, [address, symbol, chainId]);

  const validateCustomTokenAddress = useCallback(
    async (addr: string): Promise<boolean> => {
      let validated = true;
      const isValidTokenAddress = isValidAddress(addr);
      const toSmartContract =
        isValidTokenAddress && (await isSmartContractAddress(addr, chainId));

      const addressWithoutSpaces = addr.replace(regex.addressWithSpaces, '');
      if (addressWithoutSpaces.length === 0) {
        setWarningAddress(strings('token.address_cant_be_empty'));
        validated = false;
      } else if (!isValidTokenAddress) {
        setWarningAddress(strings('token.address_must_be_valid'));
        validated = false;
      } else if (!toSmartContract) {
        setWarningAddress(strings('token.address_must_be_smart_contract'));
        validated = false;
      } else {
        setWarningAddress('');
      }
      return validated;
    },
    [chainId],
  );

  const validateCustomTokenSymbol = useCallback((): boolean => {
    let validated = true;
    const symbolWithoutSpaces = symbol.replace(regex.addressWithSpaces, '');
    if (symbolWithoutSpaces.length === 0) {
      setWarningSymbol(strings('token.symbol_cant_be_empty'));
      validated = false;
    } else if (symbol.length >= 11) {
      setWarningSymbol(strings('token.symbol_length'));
    } else {
      setWarningSymbol('');
    }
    return validated;
  }, [symbol]);

  const validateCustomTokenDecimals = useCallback((): boolean => {
    let validated = true;
    const decimalsWithoutSpaces = decimals.replace(regex.addressWithSpaces, '');
    if (decimalsWithoutSpaces.length === 0) {
      setWarningDecimals(strings('token.decimals_is_required'));
      validated = false;
    } else {
      setWarningDecimals('');
    }
    return validated;
  }, [decimals]);

  const validateCustomToken = useCallback(async (): Promise<boolean> => {
    const validatedAddress = await validateCustomTokenAddress(address);
    const validatedSymbol = validateCustomTokenSymbol();
    const validatedDecimals = validateCustomTokenDecimals();
    return validatedAddress && validatedSymbol && validatedDecimals;
  }, [
    address,
    validateCustomTokenAddress,
    validateCustomTokenSymbol,
    validateCustomTokenDecimals,
  ]);

  const addToken = useCallback(async (): Promise<void> => {
    if (!(await validateCustomToken())) return;
    const { TokensController } = Engine.context;

    trace({ name: TraceName.ImportTokens });
    await TokensController.addToken({
      address,
      symbol,
      decimals: Number(decimals),
      name,
      networkClientId: networkClientId ?? '',
    });
    endTrace({ name: TraceName.ImportTokens });

    const analyticsParams = getTokenAddedAnalyticsParams();
    if (analyticsParams) {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.TOKEN_ADDED)
          .addProperties(analyticsParams)
          .build(),
      );
    }

    // Clear state before closing
    setAddress('');
    setSymbol('');
    setDecimals('');
    setWarningAddress('');
    setWarningSymbol('');
    setWarningDecimals('');

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
    validateCustomToken,
    getTokenAddedAnalyticsParams,
    trackEvent,
    createEventBuilder,
  ]);

  const onAddressChange = useCallback(
    async (newAddress: string): Promise<void> => {
      setAddress(newAddress);
      const validated = await validateCustomTokenAddress(newAddress);

      if (newAddress.length === 42) {
        try {
          setIsSymbolEditable(false);
          setIsDecimalEditable(false);

          if (validated) {
            const { AssetsContractController } = Engine.context;
            const clientId = networkClientId ?? undefined;
            const [fetchedDecimals, fetchedSymbol, fetchedName] =
              await Promise.all([
                AssetsContractController.getERC20TokenDecimals(
                  newAddress,
                  clientId,
                ),
                AssetsContractController.getERC721AssetSymbol(
                  newAddress,
                  clientId,
                ),
                AssetsContractController.getERC20TokenName(
                  newAddress,
                  clientId,
                ),
              ]);
            setDecimals(String(fetchedDecimals));
            setSymbol(fetchedSymbol);
            setName(fetchedName);
          } else {
            setIsSymbolEditable(true);
            setIsDecimalEditable(true);
          }
        } catch {
          setIsSymbolEditable(true);
          setIsDecimalEditable(true);
        }
      } else {
        setDecimals('');
        setSymbol('');
        setName('');
        setWarningSymbol('');
        setWarningDecimals('');
      }
    },
    [networkClientId, validateCustomTokenAddress],
  );

  const jumpToAssetSymbol = useCallback((): void => {
    validateCustomToken();
    validateCustomTokenSymbol();
    setIsSymbolEditable(true);
  }, [validateCustomToken, validateCustomTokenSymbol]);

  const jumpToAssetPrecision = useCallback((): void => {
    assetPrecisionInput.current?.focus();
  }, []);

  const goToConfirmAddToken = useCallback((): void => {
    const selectedAsset = [
      {
        symbol,
        address,
        iconUrl: formatIconUrlWithProxy({
          chainId: chainId as Hex,
          tokenAddress: address,
        }),
        name,
        decimals,
        chainId,
      },
    ];

    navigation.push('ConfirmAddAsset', {
      selectedAsset,
      networkName,
      chainId,
      ticker,
      addTokenList: addToken,
    });
  }, [
    symbol,
    address,
    name,
    decimals,
    chainId,
    networkName,
    ticker,
    navigation,
    addToken,
  ]);

  const { title, url } = getBlockExplorerAddressUrl(
    providerType ?? '',
    address,
  );

  const renderInfoBanner = () => (
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
        <Text variant={TextVariant.BodyMd} style={tw.style('text-default')}>
          {strings('add_asset.banners.custom_info_desc')}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          style={tw.style('text-primary-default')}
          onPress={() => {
            navigation.navigate('Webview', {
              screen: 'SimpleWebview',
              params: {
                url: AppConstants.URLS.SECURITY,
                title: strings('add_asset.banners.custom_security_tips'),
              },
            });
          }}
        >
          {strings('add_asset.banners.custom_info_link')}
        </Text>
      </>
    </Alert>
  );

  const renderWarningBanner = () => (
    <Box twClassName="mt-5">
      <Banner
        variant={BannerVariant.Alert}
        severity={BannerAlertSeverity.Warning}
        description={
          <CLText>
            {strings('add_asset.banners.custom_warning_desc')}
            <CLText
              style={tw.style('text-info-default')}
              onPress={() => {
                navigation.navigate('Webview', {
                  screen: 'SimpleWebview',
                  params: {
                    url: AppConstants.URLS.SECURITY,
                    title: strings('add_asset.banners.custom_security_tips'),
                  },
                });
              }}
            >
              {strings('add_asset.banners.custom_warning_link')}
            </CLText>
          </CLText>
        }
      />
    </Box>
  );

  const baseInputFont = { fontFamily: 'Geist-Regular' };
  const bottomInset = Platform.OS === 'ios' ? 0 : insets.bottom;
  const isDisabled = !symbol || !decimals || !chainId;

  const addressInputStyle = tw.style(
    'rounded-lg px-4 py-3',
    baseInputFont,
    onFocusAddress
      ? 'border-2 border-primary-default text-default'
      : warningAddress
        ? 'border-2 border-error-default'
        : 'border border-default text-default',
  );

  const textInputSymbolStyle = tw.style(
    'rounded-lg px-4 py-3',
    baseInputFont,
    !isSymbolEditable
      ? 'border border-default text-muted font-bold'
      : warningSymbol
        ? 'border-2 border-error-default'
        : 'border border-default text-default',
  );

  const textInputDecimalsStyle = tw.style(
    'rounded-lg px-4 py-3',
    baseInputFont,
    !isDecimalEditable
      ? 'border border-default text-muted font-bold'
      : warningDecimals
        ? 'border-2 border-error-default'
        : 'border border-default text-default',
  );

  return (
    <Box twClassName="flex-1 bg-default px-4">
      <ScrollView>
        {isTokenDetectionSupported ? renderWarningBanner() : renderInfoBanner()}

        <Box twClassName="pt-4">
          <Text variant={TextVariant.BodyMd} style={tw.style('pb-[3px]')}>
            {strings('asset_details.address')}
          </Text>
          <TextInput
            style={addressInputStyle}
            placeholder={onFocusAddress ? '' : '0x...'}
            placeholderTextColor={colors.text.muted}
            value={address}
            onChangeText={onAddressChange}
            onFocus={() => setOnFocusAddress(true)}
            onBlur={() => setOnFocusAddress(false)}
            testID={ImportTokenViewSelectorsIDs.ADDRESS_INPUT}
            onSubmitEditing={jumpToAssetSymbol}
            returnKeyType="next"
            keyboardAppearance={themeAppearance}
          />
          <Text
            variant={TextVariant.BodyMd}
            style={tw.style('mt-0 text-error-default pb-2')}
            testID={ImportTokenViewSelectorsIDs.ADDRESS_WARNING_MESSAGE}
          >
            {warningAddress}
          </Text>
        </Box>

        {address && !onFocusAddress && !warningAddress ? (
          <Box twClassName="px-4">
            <Text variant={TextVariant.BodyMd} style={tw.style('pb-[3px]')}>
              {strings('token.token_symbol')}
            </Text>
            <TextInput
              style={textInputSymbolStyle}
              placeholder="GNO"
              placeholderTextColor={colors.text.muted}
              value={symbol}
              onChangeText={setSymbol}
              onBlur={validateCustomTokenSymbol}
              testID={ImportTokenViewSelectorsIDs.SYMBOL_INPUT}
              ref={assetSymbolInput}
              onSubmitEditing={jumpToAssetPrecision}
              returnKeyType="next"
              keyboardAppearance={themeAppearance}
              editable={isSymbolEditable}
            />
            <Text
              variant={TextVariant.BodyMd}
              style={tw.style('mt-0 text-error-default pb-2')}
            >
              {warningSymbol}
            </Text>
          </Box>
        ) : null}

        {address && !onFocusAddress && !warningAddress ? (
          <Box twClassName="px-4">
            <Text variant={TextVariant.BodyMd} style={tw.style('pb-[3px]')}>
              {strings('token.token_decimal')}
            </Text>
            <TextInput
              style={textInputDecimalsStyle}
              value={decimals}
              keyboardType="numeric"
              maxLength={2}
              placeholder="18"
              placeholderTextColor={colors.text.muted}
              onChangeText={setDecimals}
              onBlur={validateCustomTokenDecimals}
              testID={ImportTokenViewSelectorsIDs.DECIMAL_INPUT}
              ref={assetPrecisionInput}
              onSubmitEditing={addToken}
              returnKeyType="done"
              keyboardAppearance={themeAppearance}
              editable={isDecimalEditable}
            />

            {warningDecimals ? (
              <Text
                variant={TextVariant.BodyMd}
                style={tw.style('mt-0 text-error-default pb-2')}
                testID={ImportTokenViewSelectorsIDs.PRECISION_WARNING_MESSAGE}
              >
                {warningDecimals}{' '}
                <Text
                  variant={TextVariant.BodyMd}
                  style={tw.style('text-info-default')}
                  onPress={() => {
                    navigation.navigate('Webview', {
                      screen: 'SimpleWebview',
                      params: { url, title },
                    });
                  }}
                >
                  {title}{' '}
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
      </ScrollView>
      <Box style={tw.style('pt-4 m-4', { paddingBottom: bottomInset })}>
        <Button
          variant={ButtonVariants.Primary}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
          label={strings('transaction.next')}
          onPress={goToConfirmAddToken}
          isDisabled={isDisabled}
          testID={ImportTokenViewSelectorsIDs.NEXT_BUTTON}
        />
      </Box>
    </Box>
  );
};

export default AddCustomToken;
