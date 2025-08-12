import React, { useCallback, useEffect, useState } from 'react';
import { View, TouchableOpacity, InteractionManager } from 'react-native';
import { useSelector } from 'react-redux';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
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
import ListItem from '../../../../../../component-library/components/List/ListItem';
import ListItemColumn, {
  WidthType,
} from '../../../../../../component-library/components/List/ListItemColumn';
import TagBase from '../../../../../../component-library/base-components/TagBase';

import AccountSelector from '../../components/AccountSelector';

import { useDepositSDK } from '../../sdk';
import { useDepositSdkMethod } from '../../hooks/useDepositSdkMethod';
import useDepositTokenExchange from '../../hooks/useDepositTokenExchange';
import { KycStatus } from '../../hooks/useUserDetailsPolling';
import { useStyles } from '../../../../../hooks/useStyles';
import useSupportedTokens from '../../hooks/useSupportedTokens';
import usePaymentMethods from '../../hooks/usePaymentMethods';

import { createKycProcessingNavDetails } from '../KycProcessing/KycProcessing';
import { createProviderWebviewNavDetails } from '../ProviderWebview/ProviderWebview';
import { createBasicInfoNavDetails } from '../BasicInfo/BasicInfo';
import { createKycWebviewNavDetails } from '../KycWebview/KycWebview';
import { createEnterEmailNavDetails } from '../EnterEmail/EnterEmail';
import { createTokenSelectorModalNavigationDetails } from '../Modals/TokenSelectorModal/TokenSelectorModal';
import { createPaymentMethodSelectorModalNavigationDetails } from '../Modals/PaymentMethodSelectorModal/PaymentMethodSelectorModal';
import { createRegionSelectorModalNavigationDetails } from '../Modals/RegionSelectorModal';
import { createUnsupportedRegionModalNavigationDetails } from '../Modals/UnsupportedRegionModal';

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
  USDC_TOKEN,
  DepositCryptoCurrency,
  DepositPaymentMethod,
  USD_CURRENCY,
  DepositFiatCurrency,
  EUR_CURRENCY,
  DEPOSIT_REGIONS,
  DepositRegion,
  SEPA_PAYMENT_METHOD,
  DEBIT_CREDIT_PAYMENT_METHOD,
} from '../../constants';
import { createBankDetailsNavDetails } from '../BankDetails/BankDetails';
import { depositOrderToFiatOrder } from '../../orderProcessor';
import useHandleNewOrder from '../../hooks/useHandleNewOrder';
import Routes from '../../../../../../constants/navigation/Routes';

const BuildQuote = () => {
  const navigation = useNavigation();
  const { styles, theme } = useStyles(styleSheet, {});

  const supportedTokens = useSupportedTokens();
  const paymentMethods = usePaymentMethods();

  const [paymentMethod, setPaymentMethod] = useState<DepositPaymentMethod>(
    DEBIT_CREDIT_PAYMENT_METHOD,
  );
  const [cryptoCurrency, setCryptoCurrency] =
    useState<DepositCryptoCurrency>(USDC_TOKEN);
  const [fiatCurrency, setFiatCurrency] =
    useState<DepositFiatCurrency>(USD_CURRENCY);
  const [amount, setAmount] = useState<string>('0');
  const [amountAsNumber, setAmountAsNumber] = useState<number>(0);
  const { isAuthenticated, selectedWalletAddress } = useDepositSDK();
  const [error, setError] = useState<string | null>();

  const [selectedRegion, setSelectedRegion] = useState<DepositRegion | null>(
    DEPOSIT_REGIONS.find((region) => region.isoCode === 'US') || null,
  );

  const handleNewOrder = useHandleNewOrder();

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

  const [{ error: reservationError }, createReservation] = useDepositSdkMethod({
    method: 'walletReserve',
    onMount: false,
  });

  const [{ error: orderError }, createOrder] = useDepositSdkMethod({
    method: 'createOrder',
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

  const handleSelectRegion = useCallback(
    (region: DepositRegion) => {
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
    [setFiatCurrency, setSelectedRegion],
  );

  const handleRegionPress = useCallback(() => {
    navigation.navigate(
      ...createRegionSelectorModalNavigationDetails({
        selectedRegionCode: selectedRegion?.isoCode,
        handleSelectRegion,
      }),
    );
  }, [navigation, selectedRegion, handleSelectRegion]);

  const handleExitToWalletHome = useCallback(() => {
    navigation.navigate(Routes.WALLET.HOME, {
      screen: Routes.WALLET.TAB_STACK_FLOW,
      params: {
        screen: Routes.WALLET_VIEW,
      },
    });
  }, [navigation]);

  const handleSelectDifferentRegion = useCallback(() => {
    handleRegionPress();
  }, [handleRegionPress]);

  useFocusEffect(
    useCallback(() => {
      if (!selectedRegion?.supported) {
        InteractionManager.runAfterInteractions(() => {
          navigation.navigate(
            ...createUnsupportedRegionModalNavigationDetails({
              regionName: selectedRegion?.name || '',
              onExitToWalletHome: handleExitToWalletHome,
              onSelectDifferentRegion: handleSelectDifferentRegion,
            }),
          );
        });
      }
    }, [
      selectedRegion,
      navigation,
      handleExitToWalletHome,
      handleSelectDifferentRegion,
    ]),
  );

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
          if (paymentMethod.id === SEPA_PAYMENT_METHOD.id) {
            const reservation = await createReservation(
              quote,
              selectedWalletAddress,
            );

            if (reservationError || !reservation) {
              setError(strings('deposit.buildQuote.unexpectedError'));
              return;
            }

            const order = await createOrder(reservation);

            if (orderError || !order) {
              setError(strings('deposit.buildQuote.unexpectedError'));
              return;
            }

            const processedOrder = {
              ...depositOrderToFiatOrder(order),
              account: selectedWalletAddress || order.walletAddress,
              network: cryptoCurrency.chainId,
            };

            await handleNewOrder(processedOrder);

            navigation.navigate(
              ...createBankDetailsNavDetails({
                orderId: order.id,
                shouldUpdate: false,
              }),
            );
          } else {
            navigation.navigate(...createProviderWebviewNavDetails({ quote }));
          }
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
    createReservation,
    reservationError,
    createOrder,
    orderError,
    selectedWalletAddress,
    handleNewOrder,
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

  const handleSelectPaymentMethodId = useCallback(
    (selectedPaymentMethodId: string) => {
      const selectedPaymentMethod = paymentMethods.find(
        (_paymentMethod) => _paymentMethod.id === selectedPaymentMethodId,
      );
      if (selectedPaymentMethod) {
        setPaymentMethod(selectedPaymentMethod);
      }
    },
    [paymentMethods],
  );

  const handlePaymentMethodPress = useCallback(() => {
    navigation.navigate(
      ...createPaymentMethodSelectorModalNavigationDetails({
        selectedPaymentMethodId: paymentMethod.id,
        handleSelectPaymentMethodId,
      }),
    );
  }, [handleSelectPaymentMethodId, navigation, paymentMethod.id]);

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
                <Text variant={TextVariant.BodyMD}>
                  {selectedRegion?.isoCode}
                </Text>
                <Icon
                  name={IconName.ArrowDown}
                  size={IconSize.Sm}
                  color={theme.colors.icon.alternative}
                />
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
            <ListItem gap={8}>
              <ListItemColumn widthType={WidthType.Fill}>
                <Text variant={TextVariant.BodyMD}>
                  {strings('deposit.buildQuote.payWith')}
                </Text>
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Alternative}
                >
                  {paymentMethod.name}
                </Text>
              </ListItemColumn>

              <ListItemColumn>
                <TagBase
                  includesBorder
                  textProps={{ variant: TextVariant.BodySM }}
                >
                  {strings(
                    `deposit.payment_duration.${paymentMethod.duration}`,
                  )}
                </TagBase>
              </ListItemColumn>
              <ListItemColumn>
                <Icon
                  name={IconName.ArrowRight}
                  size={IconSize.Md}
                  color={theme.colors.icon.alternative}
                />
              </ListItemColumn>
            </ListItem>
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
          />
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
};

export default BuildQuote;
