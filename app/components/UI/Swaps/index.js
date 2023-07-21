import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import PropTypes from 'prop-types';
import {
  ActivityIndicator,
  StyleSheet,
  View,
  TouchableOpacity,
  InteractionManager,
} from 'react-native';
import { connect } from 'react-redux';
import { useNavigation, useRoute } from '@react-navigation/native';
import { View as AnimatableView } from 'react-native-animatable';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import Logger from '../../../util/Logger';
import {
  balanceToFiat,
  fromTokenMinimalUnitString,
  renderFromTokenMinimalUnit,
  toTokenMinimalUnit,
  weiToFiat,
  safeNumberToBN,
} from '../../../util/number';
import { safeToChecksumAddress } from '../../../util/address';
import { swapsUtils } from '@metamask/swaps-controller';
import { MetaMetricsEvents } from '../../../core/Analytics';

import {
  setSwapsHasOnboarded,
  setSwapsLiveness,
  swapsControllerTokens,
  swapsHasOnboardedSelector,
  swapsTokensSelector,
  swapsTokensWithBalanceSelector,
  swapsTopAssetsSelector,
} from '../../../reducers/swaps';
import Analytics from '../../../core/Analytics/Analytics';
import Device from '../../../util/device';
import Engine from '../../../core/Engine';
import AppConstants from '../../../core/AppConstants';

import { strings } from '../../../../locales/i18n';
import {
  setQuotesNavigationsParams,
  isSwapsNativeAsset,
  isDynamicToken,
} from './utils';
import { getSwapsAmountNavbar } from '../Navbar';

import Onboarding from './components/Onboarding';
import useModalHandler from '../../Base/hooks/useModalHandler';
import Text from '../../Base/Text';
import Keypad from '../../Base/Keypad';
import StyledButton from '../StyledButton';
import ScreenView from '../../Base/ScreenView';
import ActionAlert from './components/ActionAlert';
import TokenSelectButton from './components/TokenSelectButton';
import TokenSelectModal from './components/TokenSelectModal';
import SlippageModal from './components/SlippageModal';
import useBalance from './utils/useBalance';
import useBlockExplorer from './utils/useBlockExplorer';
import InfoModal from './components/InfoModal';
import { toLowerCaseEquals } from '../../../util/general';
import { AlertType } from '../../Base/Alert';
import { isZero, gte } from '../../../util/lodash';
import { useTheme } from '../../../util/theme';
import {
  selectChainId,
  selectProviderConfig,
} from '../../../selectors/networkController';
import {
  selectConversionRate,
  selectCurrentCurrency,
} from '../../../selectors/currencyRateController';
import { selectContractExchangeRates } from '../../../selectors/tokenRatesController';
import { selectAccounts } from '../../../selectors/accountTrackerController';
import { selectContractBalances } from '../../../selectors/tokenBalancesController';
import {
  selectFrequentRpcList,
  selectSelectedAddress,
} from '../../../selectors/preferencesController';
import AccountSelector from '../Ramp/components/AccountSelector';

const createStyles = (colors) =>
  StyleSheet.create({
    container: { backgroundColor: colors.background.default },
    screen: {
      flexGrow: 1,
      justifyContent: 'space-between',
      backgroundColor: colors.background.default,
    },
    content: {
      flexGrow: 1,
      justifyContent: 'center',
    },
    accountSelector: {
      width: '100%',
      alignItems: 'center',
      marginBottom: 16,
    },
    keypad: {
      flexGrow: 1,
      justifyContent: 'space-around',
    },
    tokenButtonContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      margin: Device.isIphone5() ? 5 : 10,
    },
    amountContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: 25,
    },
    amount: {
      textAlignVertical: 'center',
      fontSize: Device.isIphone5() ? 30 : 40,
      height: Device.isIphone5() ? 40 : 50,
    },
    amountInvalid: {
      color: colors.error.default,
    },
    verifyToken: {
      marginHorizontal: 40,
    },
    tokenAlert: {
      marginTop: 10,
      marginHorizontal: 30,
    },
    linkText: {
      color: colors.primary.default,
    },
    horizontalRuleContainer: {
      flexDirection: 'row',
      paddingHorizontal: 30,
      marginVertical: Device.isIphone5() ? 5 : 10,
      alignItems: 'center',
    },
    horizontalRule: {
      flex: 1,
      borderBottomWidth: StyleSheet.hairlineWidth,
      height: 1,
      borderBottomColor: colors.border.muted,
    },
    arrowDown: {
      color: colors.primary.default,
      fontSize: 25,
      marginHorizontal: 15,
    },
    buttonsContainer: {
      marginTop: Device.isIphone5() ? 10 : 30,
      marginBottom: 5,
      paddingHorizontal: 30,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    column: {
      flex: 1,
    },
    ctaContainer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    cta: {
      paddingHorizontal: Device.isIphone5() ? 10 : 20,
    },
    disabled: {
      opacity: 0.4,
    },
  });

const SWAPS_NATIVE_ADDRESS = swapsUtils.NATIVE_SWAPS_TOKEN_ADDRESS;
const TOKEN_MINIMUM_SOURCES = 1;
const MAX_TOP_ASSETS = 20;

function SwapsAmountView({
  swapsTokens,
  swapsControllerTokens,
  accounts,
  selectedAddress,
  chainId,
  providerConfig,
  frequentRpcList,
  balances,
  tokensWithBalance,
  tokensTopAssets,
  conversionRate,
  tokenExchangeRates,
  currentCurrency,
  userHasOnboarded,
  setHasOnboarded,
  setLiveness,
}) {
  const navigation = useNavigation();
  const route = useRoute();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const previousSelectedAddress = useRef();

  const explorer = useBlockExplorer(providerConfig, frequentRpcList);
  const initialSource = route.params?.sourceToken ?? SWAPS_NATIVE_ADDRESS;
  const [amount, setAmount] = useState('0');
  const [slippage, setSlippage] = useState(AppConstants.SWAPS.DEFAULT_SLIPPAGE);
  const [isInitialLoadingTokens, setInitialLoadingTokens] = useState(false);
  const [, setLoadingTokens] = useState(false);
  const [isSourceSet, setIsSourceSet] = useState(() =>
    Boolean(
      swapsTokens?.find((token) =>
        toLowerCaseEquals(token.address, initialSource),
      ),
    ),
  );

  const [sourceToken, setSourceToken] = useState(() =>
    swapsTokens?.find((token) =>
      toLowerCaseEquals(token.address, initialSource),
    ),
  );
  const [destinationToken, setDestinationToken] = useState(null);
  const [hasDismissedTokenAlert, setHasDismissedTokenAlert] = useState(true);
  const [contractBalance, setContractBalance] = useState(null);
  const [contractBalanceAsUnits, setContractBalanceAsUnits] = useState(
    safeNumberToBN(0),
  );
  const [isDirectWrapping, setIsDirectWrapping] = useState(false);

  const [isSourceModalVisible, toggleSourceModal] = useModalHandler(false);
  const [isDestinationModalVisible, toggleDestinationModal] =
    useModalHandler(false);
  const [isSlippageModalVisible, toggleSlippageModal] = useModalHandler(false);
  const [
    isTokenVerificationModalVisisble,
    toggleTokenVerificationModal,
    ,
    hideTokenVerificationModal,
  ] = useModalHandler(false);

  useEffect(() => {
    navigation.setOptions(getSwapsAmountNavbar(navigation, route, colors));
  }, [navigation, route, colors]);

  useEffect(() => {
    (async () => {
      try {
        const data = await swapsUtils.fetchSwapsFeatureLiveness(
          chainId,
          AppConstants.SWAPS.CLIENT_ID,
        );
        const isIphone = Device.isIos();
        const isAndroid = Device.isAndroid();
        const featureFlagKey = isIphone
          ? 'mobileActiveIOS'
          : isAndroid
          ? 'mobileActiveAndroid'
          : 'mobileActive';
        const liveness =
          typeof data === 'boolean' ? data : data?.[featureFlagKey] ?? false;
        setLiveness(liveness, chainId);
        if (liveness) {
          // Triggered when a user enters the MetaMask Swap feature
          InteractionManager.runAfterInteractions(() => {
            const parameters = {
              source:
                initialSource === SWAPS_NATIVE_ADDRESS
                  ? 'MainView'
                  : 'TokenView',
              activeCurrency: swapsTokens?.find((token) =>
                toLowerCaseEquals(token.address, initialSource),
              )?.symbol,
              chain_id: chainId,
            };
            Analytics.trackEventWithParameters(
              MetaMetricsEvents.SWAPS_OPENED,
              {},
            );
            Analytics.trackEventWithParameters(
              MetaMetricsEvents.SWAPS_OPENED,
              parameters,
              true,
            );
          });
        } else {
          navigation.pop();
        }
      } catch (error) {
        Logger.error(error, 'Swaps: error while fetching swaps liveness');
        setLiveness(false, chainId);
        navigation.pop();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSource, chainId, navigation, setLiveness]);

  const keypadViewRef = useRef(null);

  useEffect(() => {
    (async () => {
      const { SwapsController } = Engine.context;
      try {
        await SwapsController.fetchAggregatorMetadataWithCache();
        await SwapsController.fetchTopAssetsWithCache();
      } catch (error) {
        Logger.error(
          error,
          'Swaps: Error while updating agg metadata and top assets in amount view',
        );
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const { SwapsController } = Engine.context;
      try {
        if (
          !swapsControllerTokens ||
          !swapsTokens ||
          swapsTokens?.length === 0
        ) {
          setInitialLoadingTokens(true);
        }
        setLoadingTokens(true);
        await SwapsController.fetchTokenWithCache();
        setLoadingTokens(false);
        setInitialLoadingTokens(false);
      } catch (error) {
        Logger.error(
          error,
          'Swaps: Error while fetching tokens in amount view',
        );
      } finally {
        setLoadingTokens(false);
        setInitialLoadingTokens(false);
      }
    })();
  }, [swapsControllerTokens, swapsTokens]);

  useEffect(() => {
    if (
      !isSourceSet &&
      initialSource &&
      swapsControllerTokens &&
      swapsTokens?.length > 0 &&
      !sourceToken
    ) {
      setIsSourceSet(true);
      setSourceToken(
        swapsTokens.find((token) =>
          toLowerCaseEquals(token.address, initialSource),
        ),
      );
    }
  }, [
    initialSource,
    isSourceSet,
    sourceToken,
    swapsControllerTokens,
    swapsTokens,
  ]);

  useEffect(() => {
    setHasDismissedTokenAlert(false);
  }, [destinationToken]);

  const isTokenInBalances =
    sourceToken && !isSwapsNativeAsset(sourceToken)
      ? safeToChecksumAddress(sourceToken.address) in balances
      : false;

  useEffect(() => {
    (async () => {
      if (
        sourceToken &&
        !isSwapsNativeAsset(sourceToken) &&
        !isTokenInBalances
      ) {
        setContractBalance(null);
        setContractBalanceAsUnits(safeNumberToBN(0));
        const { AssetsContractController } = Engine.context;
        try {
          const balance = await AssetsContractController.getERC20BalanceOf(
            sourceToken.address,
            selectedAddress,
          );
          setContractBalanceAsUnits(balance);
          setContractBalance(
            renderFromTokenMinimalUnit(balance, sourceToken.decimals),
          );
        } catch (e) {
          // Don't validate balance if error
        }
      }
    })();
  }, [isTokenInBalances, selectedAddress, sourceToken]);

  /**
   * Reset the state when account changes
   */
  useEffect(() => {
    if (selectedAddress !== previousSelectedAddress.current) {
      setAmount('0');
      setSourceToken(
        swapsTokens?.find((token) =>
          toLowerCaseEquals(token.address, initialSource),
        ),
      );
      setDestinationToken(null);
      setSlippage(AppConstants.SWAPS.DEFAULT_SLIPPAGE);
      previousSelectedAddress.current = selectedAddress;
    }
  }, [selectedAddress, swapsTokens, initialSource]);

  const hasInvalidDecimals = useMemo(() => {
    if (sourceToken) {
      return amount?.split('.')[1]?.length > sourceToken.decimals;
    }
    return false;
  }, [amount, sourceToken]);

  const amountAsUnits = useMemo(
    () =>
      toTokenMinimalUnit(
        hasInvalidDecimals ? '0' : amount,
        sourceToken?.decimals,
      ),
    [amount, hasInvalidDecimals, sourceToken],
  );
  const controllerBalance = useBalance(
    accounts,
    balances,
    selectedAddress,
    sourceToken,
  );
  const controllerBalanceAsUnits = useBalance(
    accounts,
    balances,
    selectedAddress,
    sourceToken,
    { asUnits: true },
  );

  const balance =
    isSwapsNativeAsset(sourceToken) || isTokenInBalances
      ? controllerBalance
      : contractBalance;
  const balanceAsUnits =
    isSwapsNativeAsset(sourceToken) || isTokenInBalances
      ? controllerBalanceAsUnits
      : contractBalanceAsUnits;

  const isBalanceZero = isZero(balanceAsUnits);
  const isAmountZero = isZero(amountAsUnits);

  const hasBalance = useMemo(() => {
    if (!balanceAsUnits || !sourceToken) {
      return false;
    }

    return !(isBalanceZero ?? true);
  }, [balanceAsUnits, sourceToken, isBalanceZero]);

  const hasEnoughBalance = useMemo(() => {
    if (hasInvalidDecimals || !hasBalance || !balanceAsUnits) {
      return false;
    }

    // TODO: Cannot call .gte on balanceAsUnits since it isn't always guaranteed to be type BN. Should consolidate into one type.
    return gte(balanceAsUnits, amountAsUnits) ?? false;
  }, [amountAsUnits, balanceAsUnits, hasBalance, hasInvalidDecimals]);

  const currencyAmount = useMemo(() => {
    if (!sourceToken || hasInvalidDecimals) {
      return undefined;
    }
    let balanceFiat;
    if (isSwapsNativeAsset(sourceToken)) {
      balanceFiat = weiToFiat(
        toTokenMinimalUnit(amount, sourceToken?.decimals),
        conversionRate,
        currentCurrency,
      );
    } else {
      const sourceAddress = safeToChecksumAddress(sourceToken.address);
      const exchangeRate =
        sourceAddress in tokenExchangeRates
          ? tokenExchangeRates[sourceAddress]
          : undefined;
      balanceFiat = balanceToFiat(
        amount,
        conversionRate,
        exchangeRate,
        currentCurrency,
      );
    }
    return balanceFiat;
  }, [
    amount,
    conversionRate,
    currentCurrency,
    hasInvalidDecimals,
    sourceToken,
    tokenExchangeRates,
  ]);

  const destinationTokenHasEnoughOcurrances = useMemo(() => {
    if (!destinationToken || isSwapsNativeAsset(destinationToken)) {
      return true;
    }
    return destinationToken?.occurrences > TOKEN_MINIMUM_SOURCES;
  }, [destinationToken]);

  /* Navigation handler */
  const handleGetQuotesPress = useCallback(async () => {
    if (hasInvalidDecimals) {
      return;
    }
    if (
      !isSwapsNativeAsset(sourceToken) &&
      !isTokenInBalances &&
      !isBalanceZero
    ) {
      const { TokensController } = Engine.context;
      const { address, symbol, decimals, name } = sourceToken;
      await TokensController.addToken(address, symbol, decimals, null, name);
    }
    return navigation.navigate(
      'SwapsQuotesView',
      setQuotesNavigationsParams(
        sourceToken?.address,
        destinationToken?.address,
        toTokenMinimalUnit(amount, sourceToken?.decimals).toString(10),
        slippage,
        [sourceToken, destinationToken],
      ),
    );
  }, [
    amount,
    destinationToken,
    hasInvalidDecimals,
    isTokenInBalances,
    navigation,
    slippage,
    sourceToken,
    isBalanceZero,
  ]);

  /* Keypad Handlers */
  const handleKeypadChange = useCallback(
    ({ value }) => {
      if (value === amount) {
        return;
      }

      setAmount(value);
    },
    [amount],
  );

  const setSlippageAfterTokenPress = useCallback(
    (sourceTokenAddress, destinationTokenAddress) => {
      const enableDirectWrapping = swapsUtils.shouldEnableDirectWrapping(
        chainId,
        sourceTokenAddress,
        destinationTokenAddress,
      );
      if (enableDirectWrapping && !isDirectWrapping) {
        setSlippage(0);
        setIsDirectWrapping(true);
      } else if (isDirectWrapping && !enableDirectWrapping) {
        setSlippage(AppConstants.SWAPS.DEFAULT_SLIPPAGE);
        setIsDirectWrapping(false);
      }
    },
    [setSlippage, chainId, isDirectWrapping],
  );

  const handleSourceTokenPress = useCallback(
    (item) => {
      toggleSourceModal();
      setSourceToken(item);
      setSlippageAfterTokenPress(item.address, destinationToken?.address);
    },
    [toggleSourceModal, setSlippageAfterTokenPress, destinationToken],
  );

  const handleDestinationTokenPress = useCallback(
    (item) => {
      toggleDestinationModal();
      setDestinationToken(item);
      setSlippageAfterTokenPress(sourceToken?.address, item.address);
    },
    [toggleDestinationModal, setSlippageAfterTokenPress, sourceToken],
  );

  const handleUseMax = useCallback(() => {
    if (!sourceToken || !balanceAsUnits) {
      return;
    }
    setAmount(
      fromTokenMinimalUnitString(
        balanceAsUnits.toString(10),
        sourceToken.decimals,
      ),
    );
  }, [balanceAsUnits, sourceToken]);

  const handleSlippageChange = useCallback((value) => {
    setSlippage(value);
  }, []);

  const handleDimissTokenAlert = useCallback(() => {
    setHasDismissedTokenAlert(true);
  }, []);

  const handleVerifyPress = useCallback(() => {
    if (!destinationToken) {
      return;
    }
    hideTokenVerificationModal();
    navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: explorer.token(destinationToken.address),
        title: strings('swaps.verify'),
      },
    });
  }, [explorer, destinationToken, hideTokenVerificationModal, navigation]);

  const handleAmountPress = useCallback(
    () => keypadViewRef?.current?.shake?.(),
    [],
  );

  const handleFlipTokens = useCallback(() => {
    setSourceToken(destinationToken);
    setDestinationToken(sourceToken);
  }, [destinationToken, sourceToken]);

  const disabledView =
    !destinationTokenHasEnoughOcurrances && !hasDismissedTokenAlert;

  if (!userHasOnboarded) {
    return (
      <ScreenView
        style={styles.container}
        contentContainerStyle={styles.screen}
      >
        <Onboarding setHasOnboarded={setHasOnboarded} />
      </ScreenView>
    );
  }

  return (
    <ScreenView
      style={styles.container}
      contentContainerStyle={styles.screen}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.content}>
        <View style={styles.accountSelector}>
          <AccountSelector />
        </View>
        <View
          style={[styles.tokenButtonContainer, disabledView && styles.disabled]}
          pointerEvents={disabledView ? 'none' : 'auto'}
        >
          {isInitialLoadingTokens ? (
            <ActivityIndicator size="small" />
          ) : (
            <TokenSelectButton
              label={strings('swaps.select_a_token')}
              onPress={toggleSourceModal}
              icon={sourceToken?.iconUrl}
              symbol={sourceToken?.symbol}
            />
          )}

          <TokenSelectModal
            isVisible={isSourceModalVisible}
            dismiss={toggleSourceModal}
            title={strings('swaps.convert_from')}
            tokens={swapsTokens}
            initialTokens={tokensWithBalance}
            onItemPress={handleSourceTokenPress}
            excludeAddresses={[destinationToken?.address]}
          />
        </View>
        <View
          style={[styles.amountContainer, disabledView && styles.disabled]}
          pointerEvents={disabledView ? 'none' : 'auto'}
        >
          <TouchableOpacity onPress={handleAmountPress}>
            <Text
              primary
              style={styles.amount}
              numberOfLines={1}
              adjustsFontSizeToFit
              allowFontScaling
            >
              {amount}
            </Text>
          </TouchableOpacity>
          {!!sourceToken &&
            (hasInvalidDecimals || (!isAmountZero && !hasEnoughBalance) ? (
              <Text style={styles.amountInvalid}>
                {hasInvalidDecimals
                  ? strings('swaps.allows_up_to_decimals', {
                      symbol: sourceToken.symbol,
                      decimals: sourceToken.decimals,
                      // eslint-disable-next-line no-mixed-spaces-and-tabs
                    })
                  : strings('swaps.not_enough', { symbol: sourceToken.symbol })}
              </Text>
            ) : isAmountZero ? (
              <Text>
                {!!sourceToken &&
                  balance !== null &&
                  strings('swaps.available_to_swap', {
                    asset: `${balance} ${sourceToken.symbol}`,
                  })}
                {!isSwapsNativeAsset(sourceToken) && hasBalance && (
                  <Text style={styles.linkText} onPress={handleUseMax}>
                    {' '}
                    {strings('swaps.use_max')}
                  </Text>
                )}
              </Text>
            ) : (
              <Text upper>{currencyAmount ? `~${currencyAmount}` : ''}</Text>
            ))}
          {!sourceToken && <Text> </Text>}
        </View>
        <View
          style={[
            styles.horizontalRuleContainer,
            disabledView && styles.disabled,
          ]}
          pointerEvents={disabledView ? 'none' : 'auto'}
        >
          <View style={styles.horizontalRule} />
          <TouchableOpacity onPress={handleFlipTokens}>
            <IonicIcon style={styles.arrowDown} name="md-arrow-down" />
          </TouchableOpacity>
          <View style={styles.horizontalRule} />
        </View>
        <View style={styles.tokenButtonContainer}>
          {isInitialLoadingTokens ? (
            <ActivityIndicator size="small" />
          ) : (
            <TokenSelectButton
              label={strings('swaps.select_a_token')}
              onPress={toggleDestinationModal}
              icon={destinationToken?.iconUrl}
              symbol={destinationToken?.symbol}
            />
          )}
          <TokenSelectModal
            isVisible={isDestinationModalVisible}
            dismiss={toggleDestinationModal}
            title={strings('swaps.convert_to')}
            tokens={swapsTokens}
            initialTokens={[
              swapsUtils.getNativeSwapsToken(chainId),
              ...tokensTopAssets
                .slice(0, MAX_TOP_ASSETS)
                .filter(
                  (asset) =>
                    asset.address !==
                    swapsUtils.getNativeSwapsToken(chainId).address,
                ),
            ]}
            onItemPress={handleDestinationTokenPress}
            excludeAddresses={[sourceToken?.address]}
          />
        </View>
        <View>
          {Boolean(destinationToken) &&
          !isSwapsNativeAsset(destinationToken) ? (
            destinationTokenHasEnoughOcurrances ? (
              <TouchableOpacity
                onPress={explorer.isValid ? handleVerifyPress : undefined}
                style={styles.verifyToken}
              >
                <Text small centered>
                  <Text reset bold>
                    {strings('swaps.verified_on_sources', {
                      sources: destinationToken.occurrences,
                    })}
                  </Text>
                  {` ${strings('swaps.verify_on')} `}
                  {explorer.isValid ? (
                    <Text reset link>
                      {explorer.name}
                    </Text>
                  ) : (
                    strings('swaps.a_block_explorer')
                  )}
                  .
                </Text>
              </TouchableOpacity>
            ) : (
              <ActionAlert
                type={
                  !destinationToken.occurances ||
                  isDynamicToken(destinationToken)
                    ? AlertType.Error
                    : AlertType.Warning
                }
                style={styles.tokenAlert}
                action={
                  hasDismissedTokenAlert ? null : strings('swaps.continue')
                }
                onPress={handleDimissTokenAlert}
                onInfoPress={toggleTokenVerificationModal}
              >
                {(textStyle) => (
                  <TouchableOpacity
                    onPress={explorer.isValid ? handleVerifyPress : undefined}
                  >
                    <Text style={textStyle} bold centered>
                      {!destinationToken.occurrences ||
                      isDynamicToken(destinationToken)
                        ? strings('swaps.added_manually', {
                            symbol: destinationToken.symbol,
                            // eslint-disable-next-line no-mixed-spaces-and-tabs
                          })
                        : strings('swaps.only_verified_on', {
                            symbol: destinationToken.symbol,
                            occurrences: destinationToken.occurrences,
                            // eslint-disable-next-line no-mixed-spaces-and-tabs
                          })}
                    </Text>
                    {!destinationToken.occurrences ||
                    isDynamicToken(destinationToken) ? (
                      <Text style={textStyle} centered>
                        {`${strings('swaps.verify_this_token_on')} `}
                        {explorer.isValid ? (
                          <Text reset link>
                            {explorer.name}
                          </Text>
                        ) : (
                          strings('swaps.a_block_explorer')
                        )}
                        {` ${strings('swaps.make_sure_trade')}`}
                      </Text>
                    ) : (
                      <Text style={textStyle} centered>
                        {`${strings('swaps.verify_address_on')} `}
                        {explorer.isValid ? (
                          <Text reset link>
                            {explorer.name}
                          </Text>
                        ) : (
                          strings('swaps.a_block_explorer')
                        )}
                        .
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </ActionAlert>
            )
          ) : (
            <Text> </Text>
          )}
        </View>
      </View>
      <View
        style={[styles.keypad, disabledView && styles.disabled]}
        pointerEvents={disabledView ? 'none' : 'auto'}
      >
        <AnimatableView ref={keypadViewRef}>
          <Keypad
            onChange={handleKeypadChange}
            value={amount}
            currency="native"
          />
        </AnimatableView>
        <View style={styles.buttonsContainer}>
          <View style={styles.column}>
            <TouchableOpacity
              onPress={toggleSlippageModal}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              disabled={isDirectWrapping}
            >
              <Text bold link={!isDirectWrapping}>
                {strings('swaps.max_slippage_amount', {
                  slippage: `${slippage}%`,
                })}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.column}>
            <View style={styles.ctaContainer}>
              <StyledButton
                type="blue"
                onPress={handleGetQuotesPress}
                containerStyle={styles.cta}
                disabled={
                  isInitialLoadingTokens ||
                  !sourceToken ||
                  !destinationToken ||
                  hasInvalidDecimals ||
                  isAmountZero
                }
              >
                {strings('swaps.get_quotes')}
              </StyledButton>
            </View>
          </View>
        </View>
      </View>
      <InfoModal
        isVisible={isTokenVerificationModalVisisble}
        toggleModal={toggleTokenVerificationModal}
        title={strings('swaps.token_verification')}
        body={
          <Text>
            {strings('swaps.token_multiple')}
            {` ${strings('swaps.token_check')} `}
            {explorer.isValid ? (
              <Text reset link onPress={handleVerifyPress}>
                {explorer.name}
              </Text>
            ) : (
              strings('swaps.a_block_explorer')
            )}
            {` ${strings('swaps.token_to_verify')}`}
          </Text>
        }
      />
      <SlippageModal
        isVisible={isSlippageModalVisible}
        dismiss={toggleSlippageModal}
        onChange={handleSlippageChange}
        slippage={slippage}
      />
    </ScreenView>
  );
}

SwapsAmountView.propTypes = {
  swapsTokens: PropTypes.arrayOf(PropTypes.object),
  swapsControllerTokens: PropTypes.arrayOf(PropTypes.object),
  tokensWithBalance: PropTypes.arrayOf(PropTypes.object),
  tokensTopAssets: PropTypes.arrayOf(PropTypes.object),
  /**
   * Map of accounts to information objects including balances
   */
  accounts: PropTypes.object,
  /**
   * A string that represents the selected address
   */
  selectedAddress: PropTypes.string,
  /**
   * An object containing token balances for current account and network in the format address => balance
   */
  balances: PropTypes.object,
  /**
   * ETH to current currency conversion rate
   */
  conversionRate: PropTypes.number,
  /**
   * Currency code of the currently-active currency
   */
  currentCurrency: PropTypes.string,
  /**
   * An object containing token exchange rates in the format address => exchangeRate
   */
  tokenExchangeRates: PropTypes.object,
  /**
   * Wether the user has been onboarded or not
   */
  userHasOnboarded: PropTypes.bool,
  /**
   * Function to set hasOnboarded
   */
  setHasOnboarded: PropTypes.func,
  /**
   * Current network provider configuration
   */
  providerConfig: PropTypes.object,
  /**
   * Chain Id
   */
  chainId: PropTypes.string,
  /**
   * Frequent RPC list from PreferencesController
   */
  frequentRpcList: PropTypes.array,
  /**
   * Function to set liveness
   */
  setLiveness: PropTypes.func,
};

const mapStateToProps = (state) => ({
  swapsTokens: swapsTokensSelector(state),
  swapsControllerTokens: swapsControllerTokens(state),
  accounts: selectAccounts(state),
  balances: selectContractBalances(state),
  selectedAddress: selectSelectedAddress(state),
  conversionRate: selectConversionRate(state),
  currentCurrency: selectCurrentCurrency(state),
  tokenExchangeRates: selectContractExchangeRates(state),
  providerConfig: selectProviderConfig(state),
  frequentRpcList: selectFrequentRpcList(state),
  chainId: selectChainId(state),
  tokensWithBalance: swapsTokensWithBalanceSelector(state),
  tokensTopAssets: swapsTopAssetsSelector(state),
  userHasOnboarded: swapsHasOnboardedSelector(state),
});

const mapDispatchToProps = (dispatch) => ({
  setHasOnboarded: (hasOnboarded) =>
    dispatch(setSwapsHasOnboarded(hasOnboarded)),
  setLiveness: (liveness, chainId) =>
    dispatch(setSwapsLiveness(liveness, chainId)),
});

export default connect(mapStateToProps, mapDispatchToProps)(SwapsAmountView);
