import React, {
  useCallback,
  useState,
  useEffect,
  useContext,
  useMemo,
} from 'react';
import {
  TouchableOpacity,
  View,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {
  StackActions,
  useNavigation,
  useFocusEffect,
} from '@react-navigation/native';
import { useTheme } from '../../../../../util/theme';
import {
  useCardDelegation,
  UserCancelledError,
} from '../../hooks/useCardDelegation';
import { useCardSDK } from '../../sdk';
import { strings } from '../../../../../../locales/i18n';
import {
  BAANX_MAX_LIMIT,
  ARBITRARY_ALLOWANCE,
  caipChainIdToNetwork,
} from '../../constants';
import Logger from '../../../../../util/Logger';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import createStyles from './SpendingLimit.styles';
import { SolScope } from '@metamask/keyring-api';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import {
  AllowanceState,
  CardTokenAllowance,
  DelegationSettingsResponse,
  CardExternalWalletDetailsResponse,
} from '../../types';
import { createAssetSelectionModalNavigationDetails } from '../../components/AssetSelectionBottomSheet';
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import { buildTokenIconUrl } from '../../util/buildTokenIconUrl';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { CardActions, CardScreens } from '../../util/metrics';
import { clearCacheData } from '../../../../../core/redux/slices/card';
import { useDispatch } from 'react-redux';
import Routes from '../../../../../constants/navigation/Routes';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { mapCaipChainIdToChainName } from '../../util/mapCaipChainIdToChainName';
import useSpendingLimitData from '../../hooks/useSpendingLimitData';

const SpendingLimit = ({
  route,
}: {
  route?: {
    params?: {
      flow?: 'manage' | 'enable' | 'onboarding';
      selectedToken?: CardTokenAllowance;
      priorityToken?: CardTokenAllowance | null;
      allTokens?: CardTokenAllowance[];
      delegationSettings?: DelegationSettingsResponse | null;
      externalWalletDetailsData?:
        | {
            walletDetails: never[];
            mappedWalletDetails: never[];
            priorityWalletDetail: null;
          }
        | {
            walletDetails: CardExternalWalletDetailsResponse;
            mappedWalletDetails: CardTokenAllowance[];
            priorityWalletDetail: CardTokenAllowance | undefined;
          }
        | null;
    };
  };
}) => {
  const navigation = useNavigation();
  const theme = useTheme();
  const styles = createStyles(theme);
  const { toastRef } = useContext(ToastContext);
  const { trackEvent, createEventBuilder } = useMetrics();
  const { sdk } = useCardSDK();

  const flow = route?.params?.flow || 'manage';
  const isOnboardingFlow = flow === 'onboarding';

  const {
    availableTokens: hookAvailableTokens,
    delegationSettings: hookDelegationSettings,
    isLoading: isLoadingHookData,
    error: hookError,
    fetchData: fetchHookData,
  } = useSpendingLimitData();

  useEffect(() => {
    if (isOnboardingFlow) {
      fetchHookData();
    }
  }, [isOnboardingFlow, fetchHookData]);

  const selectedTokenFromRoute = route?.params?.selectedToken;
  const priorityToken = route?.params?.priorityToken ?? null;
  const routeAllTokens = route?.params?.allTokens;
  const routeDelegationSettings = route?.params?.delegationSettings;

  const allTokens = useMemo(() => {
    if (routeAllTokens) return routeAllTokens;
    if (isOnboardingFlow) return hookAvailableTokens;
    return [];
  }, [routeAllTokens, isOnboardingFlow, hookAvailableTokens]);

  const delegationSettings = useMemo(() => {
    if (routeDelegationSettings !== undefined) return routeDelegationSettings;
    if (isOnboardingFlow) return hookDelegationSettings;
    return null;
  }, [routeDelegationSettings, isOnboardingFlow, hookDelegationSettings]);

  const externalWalletDetailsData = route?.params?.externalWalletDetailsData;
  const [showOptions, setShowOptions] = useState(false);
  const [selectedToken, setSelectedToken] = useState<CardTokenAllowance | null>(
    null,
  );
  const [tempSelectedOption, setTempSelectedOption] = useState<
    'full' | 'restricted'
  >('full');
  const [customLimit, setCustomLimit] = useState<string>('');
  const [allowNavigation, setAllowNavigation] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { submitDelegation, isLoading: isDelegationLoading } =
    useCardDelegation(selectedToken);
  const dispatch = useDispatch();

  const isLoading = isDelegationLoading || isProcessing;

  useEffect(() => {
    let screen = CardScreens.SPENDING_LIMIT;
    if (flow === 'enable') {
      screen = CardScreens.ENABLE_TOKEN;
    }

    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties({
          screen,
          flow,
        })
        .build(),
    );
  }, [trackEvent, createEventBuilder, flow]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!isLoading || allowNavigation) {
        return;
      }

      e.preventDefault();
    });

    return unsubscribe;
  }, [navigation, isLoading, allowNavigation]);

  const spendingLimitSettings = useMemo(() => {
    if (!priorityToken) {
      return { isFullAccess: false, limitAmount: '0' };
    }

    const allowanceNum = parseFloat(priorityToken.allowance || '0');
    const arbitraryAllowanceNum =
      typeof ARBITRARY_ALLOWANCE === 'string'
        ? parseFloat(ARBITRARY_ALLOWANCE)
        : ARBITRARY_ALLOWANCE;
    const isFullAccess =
      priorityToken.allowanceState === AllowanceState.Enabled ||
      allowanceNum >= arbitraryAllowanceNum;

    return {
      isFullAccess,
      limitAmount: isFullAccess ? undefined : priorityToken.allowance || '0',
    };
  }, [priorityToken]);

  useEffect(() => {
    if (selectedTokenFromRoute) {
      setSelectedToken(selectedTokenFromRoute);
      return;
    }

    if (!selectedToken && priorityToken) {
      const isPriorityTokenSolana =
        priorityToken?.caipChainId === SolScope.Mainnet ||
        priorityToken?.caipChainId?.startsWith('solana:');

      if (!isPriorityTokenSolana) {
        // Spread the entire priorityToken to preserve all fields including delegationContract
        setSelectedToken(priorityToken);
      }
    }
  }, [flow, selectedTokenFromRoute, priorityToken, allTokens, selectedToken]);

  useFocusEffect(
    useCallback(() => {
      const params = route?.params as
        | {
            returnedSelectedToken?: CardTokenAllowance;
          }
        | undefined;
      if (params?.returnedSelectedToken) {
        setSelectedToken(params.returnedSelectedToken);

        navigation.setParams({
          returnedSelectedToken: undefined,
          selectedToken: undefined,
        } as Record<string, unknown>);
      }
    }, [route?.params, navigation]),
  );

  const handleOptionSelect = useCallback((option: 'full' | 'restricted') => {
    setTempSelectedOption(option);

    if (option === 'full') {
      setShowOptions(false);
    }
  }, []);

  const handleEditLimit = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({
          action: CardActions.ENABLE_TOKEN_SET_LIMIT_BUTTON,
        })
        .build(),
    );
    setTempSelectedOption('restricted');
    setShowOptions(true);
  }, [trackEvent, createEventBuilder]);

  const handleConfirm = useCallback(async () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({
          action: CardActions.ENABLE_TOKEN_CONFIRM_BUTTON,
        })
        .build(),
    );
    const isFullAccess = tempSelectedOption === 'full';
    const isRestricted = tempSelectedOption === 'restricted';

    try {
      if (!sdk) {
        Logger.error(
          new Error('SDK not available'),
          'Cannot update spending limit',
        );
        toastRef?.current?.showToast({
          variant: ToastVariants.Icon,
          labelOptions: [
            { label: strings('card.card_spending_limit.update_error') },
          ],
          iconName: IconName.Danger,
          iconColor: theme.colors.error.default,
          backgroundColor: theme.colors.error.muted,
          hasNoTimeout: false,
        });
        return;
      }

      setIsProcessing(true);

      const currentLimit = parseFloat(spendingLimitSettings.limitAmount || '0');
      const newLimit = parseFloat(BAANX_MAX_LIMIT);

      const isSwitchingFromFullAccess =
        spendingLimitSettings.isFullAccess && !isFullAccess;

      const isLimitChange = Math.abs(newLimit - currentLimit) > 0.01;

      const delegationAmount = isFullAccess
        ? BAANX_MAX_LIMIT
        : customLimit || '0';

      if (isSwitchingFromFullAccess || isLimitChange || isRestricted) {
        const tokenToUse = selectedToken || priorityToken;
        const currency = tokenToUse?.symbol;
        const network = tokenToUse?.caipChainId
          ? caipChainIdToNetwork[tokenToUse.caipChainId]
          : null;

        if (!network) {
          throw new Error('Network not found');
        }

        await submitDelegation({
          amount: delegationAmount,
          currency: currency || '',
          network,
        });

        await new Promise((resolve) => setTimeout(resolve, 3000));
        dispatch(clearCacheData('card-external-wallet-details'));

        if (!isOnboardingFlow) {
          toastRef?.current?.showToast({
            variant: ToastVariants.Icon,
            labelOptions: [
              { label: strings('card.card_spending_limit.update_success') },
            ],
            iconName: IconName.Confirmation,
            iconColor: theme.colors.success.default,
            backgroundColor: theme.colors.success.muted,
            hasNoTimeout: false,
          });
        }

        setAllowNavigation(true);
        setIsProcessing(false);
        setShowOptions(false);

        setTimeout(() => {
          if (isOnboardingFlow) {
            navigation.dispatch(
              StackActions.replace(Routes.CARD.ONBOARDING.ROOT, {
                screen: Routes.CARD.ONBOARDING.COMPLETE,
              }),
            );
          } else {
            navigation.goBack();
          }
        }, 0);
      } else {
        setIsProcessing(false);
        setShowOptions(false);
        if (isOnboardingFlow) {
          navigation.dispatch(
            StackActions.replace(Routes.CARD.ONBOARDING.ROOT, {
              screen: Routes.CARD.ONBOARDING.COMPLETE,
            }),
          );
        } else {
          navigation.goBack();
        }
      }
    } catch (error) {
      setAllowNavigation(false);
      setIsProcessing(false);

      if (error instanceof UserCancelledError) {
        Logger.log('User cancelled the delegation transaction');
        return;
      }

      Logger.error(error as Error, 'Failed to save spending limit');

      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        labelOptions: [
          { label: strings('card.card_spending_limit.update_error') },
        ],
        iconName: IconName.Danger,
        iconColor: theme.colors.error.default,
        backgroundColor: theme.colors.error.muted,
        hasNoTimeout: false,
      });

      setTempSelectedOption(
        spendingLimitSettings.isFullAccess ? 'full' : 'restricted',
      );
    }
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    tempSelectedOption,
    customLimit,
    sdk,
    spendingLimitSettings.isFullAccess,
    spendingLimitSettings.limitAmount,
    submitDelegation,
    selectedToken,
    priorityToken,
    trackEvent,
    createEventBuilder,
    toastRef,
    theme.colors.success.default,
    theme.colors.success.muted,
    theme.colors.error.default,
    theme.colors.error.muted,
    dispatch,
    navigation,
    isOnboardingFlow,
  ]);

  const handleCancel = useCallback(() => {
    if (isLoading) {
      return;
    }

    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({
          action: CardActions.ENABLE_TOKEN_CANCEL_BUTTON,
        })
        .build(),
    );

    if (showOptions) {
      setShowOptions(false);
    } else {
      navigation.goBack();
    }
  }, [navigation, showOptions, trackEvent, createEventBuilder, isLoading]);

  const handleSkip = useCallback(() => {
    if (isLoading) {
      return;
    }

    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({
          action: CardActions.ENABLE_TOKEN_CANCEL_BUTTON,
          skipped: true,
        })
        .build(),
    );

    navigation.dispatch(
      StackActions.replace(Routes.CARD.ONBOARDING.ROOT, {
        screen: Routes.CARD.ONBOARDING.COMPLETE,
      }),
    );
  }, [navigation, trackEvent, createEventBuilder, isLoading]);

  const handleOpenAssetSelection = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({
          action: CardActions.CHANGE_ASSET_BUTTON,
        })
        .build(),
    );

    const { selectedToken: _excludedSelectedToken, ...restParams } =
      route?.params ?? {};

    navigation.navigate(
      ...createAssetSelectionModalNavigationDetails({
        tokensWithAllowances: allTokens ?? [],
        delegationSettings,
        cardExternalWalletDetails: externalWalletDetailsData,
        selectionOnly: true,
        hideSolanaAssets: true,
        callerRoute: Routes.CARD.SPENDING_LIMIT,
        callerParams: restParams as Record<string, unknown>,
      }),
    );
  }, [
    navigation,
    allTokens,
    delegationSettings,
    externalWalletDetailsData,
    trackEvent,
    createEventBuilder,
    route?.params,
  ]);

  const renderSelectedToken = () => {
    if (!selectedToken) {
      return (
        <View style={styles.selectedTokenContainer}>
          <Text variant={TextVariant.BodyMD} style={styles.placeholderText}>
            {strings('card.card_spending_limit.select_token')}
          </Text>
          <Icon name={IconName.ArrowDown} size={IconSize.Sm} />
        </View>
      );
    }

    const iconUrl = buildTokenIconUrl(
      selectedToken.caipChainId,
      selectedToken.address || '',
    );

    return (
      <View style={styles.selectedTokenContainer}>
        <AvatarToken
          name={selectedToken.symbol || ''}
          imageSource={iconUrl ? { uri: iconUrl } : undefined}
          size={AvatarSize.Md}
          style={styles.selectedTokenIcon}
        />
        <View style={styles.selectedTokenInfo}>
          <Text variant={TextVariant.BodyMD} style={styles.selectedTokenSymbol}>
            {selectedToken.symbol}
          </Text>
          <Text variant={TextVariant.BodySM} style={styles.selectedChainName}>
            {mapCaipChainIdToChainName(selectedToken.caipChainId)}
          </Text>
        </View>
        <Icon name={IconName.ArrowDown} size={IconSize.Sm} />
      </View>
    );
  };

  const isSolanaSelected =
    selectedToken?.caipChainId === SolScope.Mainnet ||
    selectedToken?.caipChainId?.startsWith('solana:');

  const isConfirmDisabled = useMemo(() => {
    if (isOnboardingFlow && !selectedToken) return true;
    if (isSolanaSelected) return true;
    if (tempSelectedOption === 'restricted') {
      const limitNum = parseFloat(customLimit);
      return customLimit === '' || isNaN(limitNum) || limitNum < 0;
    }
    return false;
  }, [
    tempSelectedOption,
    isSolanaSelected,
    customLimit,
    isOnboardingFlow,
    selectedToken,
  ]);

  if (isOnboardingFlow && isLoadingHookData) {
    return (
      <SafeAreaView style={styles.safeAreaView} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={theme.colors.primary.default}
          />
          <Text variant={TextVariant.BodyMD} style={styles.loadingText}>
            {strings('card.card_spending_limit.loading')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isOnboardingFlow && hookError && !delegationSettings) {
    return (
      <SafeAreaView style={styles.safeAreaView} edges={['bottom']}>
        <View style={styles.errorContainer}>
          <Icon
            name={IconName.Danger}
            size={IconSize.Xl}
            color={theme.colors.error.default}
          />
          <Text variant={TextVariant.BodyMD} style={styles.errorText}>
            {strings('card.card_spending_limit.load_error')}
          </Text>
          <View style={styles.errorButtonsContainer}>
            <Button
              variant={ButtonVariants.Primary}
              label={strings('card.card_spending_limit.retry')}
              size={ButtonSize.Md}
              onPress={fetchHookData}
              width={ButtonWidthTypes.Full}
            />
            <Button
              variant={ButtonVariants.Secondary}
              label={strings('card.card_spending_limit.skip')}
              size={ButtonSize.Md}
              onPress={handleSkip}
              width={ButtonWidthTypes.Full}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeAreaView} edges={['bottom']}>
      <KeyboardAwareScrollView
        style={styles.wrapper}
        showsVerticalScrollIndicator={false}
        alwaysBounceVertical={false}
        enableOnAndroid
        enableAutomaticScroll
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.assetContainer}>
          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={handleOpenAssetSelection}
          >
            {renderSelectedToken()}
          </TouchableOpacity>
        </View>

        <View style={styles.optionsContainer}>
          {!showOptions ? (
            <View style={styles.optionCard}>
              <Text
                variant={TextVariant.BodyMDMedium}
                style={styles.optionTitle}
              >
                {strings('card.card_spending_limit.full_access_title')}
              </Text>
              <Text
                variant={TextVariant.BodySM}
                style={styles.optionDescription}
              >
                {strings('card.card_spending_limit.full_access_description')}
              </Text>
              <TouchableOpacity
                style={styles.editLimitButton}
                onPress={handleEditLimit}
              >
                <Text variant={TextVariant.BodySM} style={styles.editLimitText}>
                  {strings('card.card_spending_limit.set_new_limit')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.optionCard}>
              <TouchableOpacity
                style={styles.optionItem}
                onPress={() => {
                  handleOptionSelect('full');
                  trackEvent(
                    createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
                      .addProperties({
                        action: CardActions.ENABLE_TOKEN_FULL_ACCESS_BUTTON,
                      })
                      .build(),
                  );
                }}
              >
                <View style={styles.optionHeader}>
                  <View style={styles.radioButton}>
                    {tempSelectedOption === 'full' && (
                      <View style={styles.radioButtonSelected} />
                    )}
                  </View>
                  <Text
                    variant={TextVariant.BodyMDMedium}
                    style={styles.optionTitle}
                  >
                    {strings('card.card_spending_limit.full_access_title')}
                  </Text>
                </View>
                <Text
                  variant={TextVariant.BodySM}
                  style={styles.optionDescription}
                >
                  {strings('card.card_spending_limit.full_access_description')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.optionItem}
                onPress={() => handleOptionSelect('restricted')}
              >
                <View style={styles.optionHeader}>
                  <View style={styles.radioButton}>
                    {tempSelectedOption === 'restricted' && (
                      <View style={styles.radioButtonSelected} />
                    )}
                  </View>
                  <Text
                    variant={TextVariant.BodyMDMedium}
                    style={styles.optionTitle}
                  >
                    {strings('card.card_spending_limit.restricted_limit_title')}
                  </Text>
                </View>
                <Text
                  variant={TextVariant.BodySM}
                  style={styles.optionDescription}
                >
                  {strings(
                    'card.card_spending_limit.restricted_limit_description',
                  )}
                </Text>
                {tempSelectedOption === 'restricted' && (
                  <View style={styles.limitInputContainer}>
                    <TextInput
                      style={styles.limitInput}
                      value={customLimit}
                      onChangeText={(text) => {
                        const sanitized = text.replace(/[^0-9.]/g, '');
                        const parts = sanitized.split('.');
                        const formatted =
                          parts.length > 2
                            ? parts[0] + '.' + parts.slice(1).join('')
                            : sanitized;
                        setCustomLimit(formatted);
                      }}
                      placeholder="0"
                      placeholderTextColor={theme.colors.text.muted}
                      keyboardType="decimal-pad"
                      returnKeyType="done"
                    />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.buttonsContainer}>
          {isSolanaSelected && (
            <View style={styles.warningContainer}>
              <Icon
                name={IconName.Info}
                size={IconSize.Sm}
                color={theme.colors.warning.default}
                style={styles.warningIcon}
              />
              <Text
                variant={TextVariant.BodySM}
                style={[
                  styles.warningText,
                  { color: theme.colors.warning.default },
                ]}
              >
                {strings('card.card_spending_limit.solana_not_supported')}
              </Text>
            </View>
          )}
          <Button
            variant={ButtonVariants.Primary}
            label={strings('card.card_spending_limit.confirm_new_limit')}
            size={ButtonSize.Lg}
            onPress={handleConfirm}
            width={ButtonWidthTypes.Full}
            disabled={isConfirmDisabled || isLoading}
            style={
              isConfirmDisabled || isLoading ? styles.disabledButton : undefined
            }
            loading={isLoading}
          />
          <Button
            variant={ButtonVariants.Secondary}
            label={
              isOnboardingFlow
                ? strings('card.card_spending_limit.skip')
                : strings('card.card_spending_limit.cancel')
            }
            size={ButtonSize.Lg}
            onPress={isOnboardingFlow ? handleSkip : handleCancel}
            width={ButtonWidthTypes.Full}
            disabled={isLoading}
          />
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

export default SpendingLimit;
