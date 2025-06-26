import React, { useCallback, useEffect, useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import styleSheet from './BuildQuote.styles';

import ScreenLayout from '../../../Aggregator/components/ScreenLayout';
import Keypad from '../../../../../Base/Keypad';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../../component-library/components/Buttons/Button';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../../component-library/components/Badges/BadgeWrapper';
import BadgeNetwork from '../../../../../../component-library/components/Badges/Badge/variants/BadgeNetwork';
import AvatarToken from '../../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../../../component-library/components/Avatars/Avatar';

import AccountSelector from '../../components/AccountSelector';

import { useDepositSDK } from '../../sdk';
import { useDepositSdkMethod } from '../../hooks/useDepositSdkMethod';
import useDepositTokenExchange from '../../hooks/useDepositTokenExchange';
import { KycStatus } from '../../hooks/useUserDetailsPolling';
import { useStyles } from '../../../../../hooks/useStyles';
import useSupportedTokens from '../../hooks/useSupportedTokens';

import { createKycProcessingNavDetails } from '../KycProcessing/KycProcessing';
import { createProviderWebviewNavDetails } from '../ProviderWebview/ProviderWebview';
import { createBasicInfoNavDetails } from '../BasicInfo/BasicInfo';
import { createKycWebviewNavDetails } from '../KycWebview/KycWebview';
import { createEnterEmailNavDetails } from '../EnterEmail/EnterEmail';
import { createTokenSelectorModalNavigationDetails } from '../Modals/TokenSelectorModal/TokenSelectorModal';
import { createRegionSelectorModalNavigationDetails } from '../Modals/RegionSelectorModal';

import {
  getTransakCryptoCurrencyId,
  getTransakFiatCurrencyId,
  getTransakChainId,
  getTransakPaymentMethodId,
  formatCurrency,
} from '../../utils';
import { getNetworkImageSource } from '../../../../../../util/networks';
import { strings } from '../../../../../../../locales/i18n';
import { getDepositNavbarOptions } from '../../../../Navbar';

import { selectNetworkConfigurations } from '../../../../../../selectors/networkController';
import {
  DEBIT_CREDIT_PAYMENT_METHOD,
  USDC_TOKEN,
  DepositCryptoCurrency,
  DepositPaymentMethod,
  USD_CURRENCY,
  DepositFiatCurrency,
  EUR_CURRENCY,
  DEPOSIT_REGIONS,
  DepositRegion,
} from '../../constants';

const BuildQuote = () => {
  const navigation = useNavigation();
  const { styles, theme } = useStyles(styleSheet, {});

  const supportedTokens = useSupportedTokens();

  const [paymentMethod] = useState<DepositPaymentMethod>(
    DEBIT_CREDIT_PAYMENT_METHOD,
  );
  const [cryptoCurrency, setCryptoCurrency] =
    useState<DepositCryptoCurrency>(USDC_TOKEN);
  const [fiatCurrency, setFiatCurrency] =
    useState<DepositFiatCurrency>(USD_CURRENCY);
  const [amount, setAmount] = useState<string>('0');
  const [amountAsNumber, setAmountAsNumber] = useState<number>(0);
  const { isAuthenticated } = useDepositSDK();
  const [error, setError] = useState<string | null>();

  const [selectedRegion, setSelectedRegion] = useState<DepositRegion | null>(
    DEPOSIT_REGIONS.find((region) => region.code === 'US') || null,
  );

  const allNetworkConfigurations = useSelector(selectNetworkConfigurations);

  const [{ error: quoteFetchError }, getQuote] = useDepositSdkMethod(
    { method: 'getBuyQuote', onMount: false },
    fiatCurrency.id,
    cryptoCurrency.assetId,
    cryptoCurrency.chainId,
    paymentMethod.id,
    amount,
  );

  const [{ error: kycFormsFetchError }, fetchKycForms] = useDepositSdkMethod({
    method: 'getKYCForms',
    onMount: false,
  });

  const [{ error: kycFormFetchError }, fetchKycFormData] = useDepositSdkMethod({
    method: 'getKycForm',
    onMount: false,
  });

  const [{ error: userDetailsFetchError }, fetchUserDetails] =
    useDepositSdkMethod({
      method: 'getUserDetails',
      onMount: false,
    });

  const {
    tokenAmount,
    isLoading: isLoadingTokenAmount,
    error: errorLoadingTokenAmount,
  } = useDepositTokenExchange({
    fiatCurrency,
    fiatAmount: amount,
    token: cryptoCurrency,
    tokens: supportedTokens,
  });

  useEffect(() => {
    navigation.setOptions(
      getDepositNavbarOptions(navigation, { title: 'Build Quote' }, theme),
    );
  }, [navigation, theme]);

  const handleOnPressContinue = useCallback(async () => {
    try {
      const quote = await getQuote(
        getTransakFiatCurrencyId(fiatCurrency),
        getTransakCryptoCurrencyId(cryptoCurrency),
        getTransakChainId(cryptoCurrency.chainId),
        getTransakPaymentMethodId(paymentMethod),
        amount,
      );
      if (quoteFetchError || !quote) {
        setError(strings('deposit.buildQuote.quoteFetchError'));
        return;
      }

      if (!isAuthenticated) {
        navigation.navigate(...createEnterEmailNavDetails({ quote }));
      }

      const forms = await fetchKycForms(quote);

      if (kycFormsFetchError) {
        setError(strings('deposit.buildQuote.unexpectedError'));
        return;
      }

      const { forms: requiredForms } = forms || {};

      if (requiredForms?.length === 0) {
        const userDetails = await fetchUserDetails();

        if (userDetailsFetchError) {
          setError(strings('deposit.buildQuote.unexpectedError'));
          return;
        }

        if (userDetails?.kyc?.l1?.status === KycStatus.APPROVED) {
          navigation.navigate(...createProviderWebviewNavDetails({ quote }));
          return;
        }

        navigation.navigate(...createKycProcessingNavDetails({ quote }));
        return;
      }

      const personalDetailsKycForm = requiredForms?.find(
        (form) => form.id === 'personalDetails',
      );

      const addressKycForm = requiredForms?.find(
        (form) => form.id === 'address',
      );

      const idProofKycForm = requiredForms?.find(
        (form) => form.id === 'idProof',
      );

      const idProofData = idProofKycForm
        ? await fetchKycFormData(quote, idProofKycForm)
        : null;

      if (kycFormFetchError) {
        setError(strings('deposit.buildQuote.unexpectedError'));
        return;
      }

      if (personalDetailsKycForm || addressKycForm) {
        navigation.navigate(
          ...createBasicInfoNavDetails({
            quote,
            kycUrl: idProofData?.data?.kycUrl,
          }),
        );
        return;
      } else if (idProofData) {
        navigation.navigate(
          ...createKycWebviewNavDetails({
            quote,
            kycUrl: idProofData.data.kycUrl,
          }),
        );
        return;
      }
      setError(strings('deposit.buildQuote.unexpectedError'));
      return;
    } catch (_) {
      setError(strings('deposit.buildQuote.unexpectedError'));
      return;
    }
  }, [
    getQuote,
    fiatCurrency,
    cryptoCurrency,
    paymentMethod,
    amount,
    quoteFetchError,
    isAuthenticated,
    fetchKycForms,
    kycFormsFetchError,
    fetchKycFormData,
    kycFormFetchError,
    navigation,
    fetchUserDetails,
    userDetailsFetchError,
  ]);

  const handleKeypadChange = useCallback(
    ({
      value,
      valueAsNumber,
    }: {
      value: string;
      valueAsNumber: number;
      pressedKey: string;
    }) => {
      setAmount(value || '0');
      setAmountAsNumber(valueAsNumber || 0);
    },
    [],
  );

  const handlePaymentMethodPress = useCallback(() => {
    // TODO: Implement payment method selection logic
  }, []);

  const handleRegionPress = useCallback(() => {
    navigation.navigate(
      ...createRegionSelectorModalNavigationDetails({
        selectedRegionCode: selectedRegion?.code,
        handleSelectRegion: (region: DepositRegion) => {
          if (!region.supported) {
            return;
          }

          setSelectedRegion(region);

          if (region.currency === 'USD') {
            setFiatCurrency(USD_CURRENCY);
          } else if (region.currency === 'EUR') {
            setFiatCurrency(EUR_CURRENCY);
          }
        },
      }),
    );
  }, [navigation, selectedRegion]);

  const handleSelectAssetId = useCallback(
    (assetId: string) => {
      const selectedToken = supportedTokens.find(
        (token) => token.assetId === assetId,
      );
      if (selectedToken) {
        setCryptoCurrency(selectedToken);
      }
    },
    [supportedTokens],
  );

  const handleCryptoPress = useCallback(
    () =>
      navigation.navigate(
        ...createTokenSelectorModalNavigationDetails({
          selectedAssetId: cryptoCurrency.assetId,
          handleSelectAssetId,
        }),
      ),
    [cryptoCurrency, navigation, handleSelectAssetId],
  );

  const networkName = allNetworkConfigurations[cryptoCurrency.chainId]?.name;
  const networkImageSource = getNetworkImageSource({
    chainId: cryptoCurrency.chainId,
  });

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <ScreenLayout.Content style={styles.content}>
          <View style={styles.selectionRow}>
            <AccountSelector />
            <TouchableOpacity
              style={styles.fiatSelector}
              onPress={handleRegionPress}
            >
              <View style={styles.regionContent}>
                <Text variant={TextVariant.BodyMD}>{selectedRegion?.flag}</Text>
                <Text variant={TextVariant.BodyMD}>{selectedRegion?.code}</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.centerGroup}>
            <Text
              variant={TextVariant.HeadingLG}
              style={styles.mainAmount}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatCurrency(amountAsNumber, fiatCurrency.id, {
                currencyDisplay: 'narrowSymbol',
              })}
            </Text>

            <Text
              variant={TextVariant.BodyMD}
              color={TextColor.Alternative}
              style={styles.convertedAmount}
            >
              {isLoadingTokenAmount || errorLoadingTokenAmount ? (
                ' '
              ) : (
                <>
                  {Number(tokenAmount) === 0 ? '0' : tokenAmount}{' '}
                  {cryptoCurrency.symbol}
                </>
              )}
            </Text>

            <TouchableOpacity onPress={handleCryptoPress}>
              <View style={styles.cryptoPill}>
                <BadgeWrapper
                  badgePosition={BadgePosition.BottomRight}
                  badgeElement={
                    <BadgeNetwork
                      name={networkName}
                      imageSource={networkImageSource}
                    />
                  }
                >
                  <AvatarToken
                    name={cryptoCurrency.name}
                    imageSource={{ uri: cryptoCurrency.iconUrl }}
                    size={AvatarSize.Md}
                  />
                </BadgeWrapper>
                <Text variant={TextVariant.HeadingLG}>
                  {cryptoCurrency.symbol}
                </Text>

                <Icon
                  name={IconName.ArrowDown}
                  size={IconSize.Sm}
                  color={theme.colors.icon.alternative}
                />
              </View>
            </TouchableOpacity>
            {error && (
              <View style={styles.errorContainer}>
                <Text variant={TextVariant.BodyMD} color={TextColor.Error}>
                  {error}
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.paymentMethodBox}
            onPress={handlePaymentMethodPress}
          >
            <View style={styles.paymentMethodContent}>
              <View>
                <Text variant={TextVariant.BodyMD}>
                  {strings('deposit.buildQuote.payWith')}
                </Text>

                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Alternative}
                >
                  {DEBIT_CREDIT_PAYMENT_METHOD.name}
                </Text>
              </View>
              <Icon
                name={IconName.ArrowRight}
                size={IconSize.Md}
                color={theme.colors.icon.alternative}
              />
            </View>
          </TouchableOpacity>

          <Keypad
            style={styles.keypad}
            value={amount}
            onChange={handleKeypadChange}
            currency={fiatCurrency.symbol}
            decimals={0}
            deleteIcon={<Icon name={IconName.Arrow2Left} size={IconSize.Lg} />}
          />
        </ScreenLayout.Content>
      </ScreenLayout.Body>
      <ScreenLayout.Footer>
        <ScreenLayout.Content>
          <Button
            size={ButtonSize.Lg}
            onPress={handleOnPressContinue}
            label={'Continue'}
            variant={ButtonVariants.Primary}
            width={ButtonWidthTypes.Full}
          ></Button>
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
};

export default BuildQuote;
