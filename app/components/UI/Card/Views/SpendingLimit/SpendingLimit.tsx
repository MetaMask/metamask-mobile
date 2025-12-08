import React, {
  useCallback,
  useState,
  useEffect,
  useContext,
  useMemo,
} from 'react';
import { TouchableOpacity, View, TextInput } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
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

const SpendingLimit = ({
  route,
}: {
  route?: {
    params?: {
      flow?: 'manage' | 'enable';
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
  const selectedTokenFromRoute = route?.params?.selectedToken;
  const priorityToken = route?.params?.priorityToken;
  const allTokens = route?.params?.allTokens;
  const delegationSettings = route?.params?.delegationSettings ?? null;
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

  // Aggregate loading states for cleaner usage throughout the component
  const isLoading = isDelegationLoading || isProcessing;

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_VIEWED)
        .addProperties({
          screen:
            flow === 'enable'
              ? CardScreens.ENABLE_TOKEN
              : CardScreens.SPENDING_LIMIT,
        })
        .build(),
    );
  }, [trackEvent, createEventBuilder, flow]);

  // Block back navigation while loading
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!isLoading || allowNavigation) {
        // If not loading or we're explicitly allowing navigation, allow it
        return;
      }

      // Prevent default navigation behavior
      e.preventDefault();
    });

    return unsubscribe;
  }, [navigation, isLoading, allowNavigation]);

  // Derive spending limit settings from priority token
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
    // If a token was passed from AssetSelectionBottomSheet (any flow), use it
    if (selectedTokenFromRoute) {
      setSelectedToken(selectedTokenFromRoute);
      return;
    }

    // For both flows, pre-select the priority token if no token is selected yet
    // and no token was passed from the route
    if (!selectedToken && priorityToken) {
      // Check if priority token is Solana
      const isPriorityTokenSolana =
        priorityToken?.caipChainId === SolScope.Mainnet ||
        priorityToken?.caipChainId?.startsWith('solana:');

      // Only pre-select if it's NOT Solana (Solana delegation is not supported)
      if (!isPriorityTokenSolana) {
        // Spread the entire priorityToken to preserve all fields including delegationContract
        setSelectedToken(priorityToken);
      }
    }
  }, [flow, selectedTokenFromRoute, priorityToken, allTokens, selectedToken]);

  // Listen for token selection from AssetSelectionBottomSheet modal
  useFocusEffect(
    useCallback(() => {
      // Check if we're returning from the asset selection modal with a selected token
      const params = route?.params as
        | {
            returnedSelectedToken?: CardTokenAllowance;
          }
        | undefined;
      if (params?.returnedSelectedToken) {
        setSelectedToken(params.returnedSelectedToken);

        // Clear the returned token from params to avoid re-applying it
        navigation.setParams({
          returnedSelectedToken: undefined,
        } as Record<string, unknown>);
      }
    }, [route?.params, navigation]),
  );

  const handleOptionSelect = useCallback((option: 'full' | 'restricted') => {
    setTempSelectedOption(option);

    // If switching to full access, return to initial view
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
    // When "Set a limit" is clicked, show both options and default to restricted
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
      // Check if SDK is available before proceeding
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

      // Determine the amount to use based on selected option
      const delegationAmount = isFullAccess
        ? BAANX_MAX_LIMIT
        : customLimit || '0';

      if (isSwitchingFromFullAccess || isLimitChange || isRestricted) {
        // Use selectedToken if available, otherwise fall back to priorityToken
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

        // Add delay to ensure the delegation is complete
        await new Promise((resolve) => setTimeout(resolve, 3000));
        dispatch(clearCacheData('card-external-wallet-details'));

        // Show success toast
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

        setAllowNavigation(true);
        setIsProcessing(false);
        setShowOptions(false);

        setTimeout(() => {
          navigation.goBack();
        }, 0);
      } else {
        setIsProcessing(false);
        setShowOptions(false);
        navigation.goBack();
      }
    } catch (error) {
      setAllowNavigation(false);
      setIsProcessing(false);

      // Don't show error toast if user cancelled the transaction
      if (error instanceof UserCancelledError) {
        Logger.log('User cancelled the delegation transaction');
        return;
      }

      Logger.error(error as Error, 'Failed to save spending limit');

      // Show error toast only for actual errors
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
  ]);

  const handleCancel = useCallback(() => {
    // Don't allow cancel while loading
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

  const handleOpenAssetSelection = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_BUTTON_CLICKED)
        .addProperties({
          action: CardActions.CHANGE_ASSET_BUTTON,
        })
        .build(),
    );

    navigation.navigate(
      ...createAssetSelectionModalNavigationDetails({
        tokensWithAllowances: allTokens ?? [],
        delegationSettings,
        cardExternalWalletDetails: externalWalletDetailsData,
        selectionOnly: true,
        hideSolanaAssets: true,
        callerRoute: Routes.CARD.SPENDING_LIMIT,
        callerParams: route?.params as Record<string, unknown>,
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
            Select token
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

  // Check if selected token is Solana
  const isSolanaSelected =
    selectedToken?.caipChainId === SolScope.Mainnet ||
    selectedToken?.caipChainId?.startsWith('solana:');

  const isConfirmDisabled = useMemo(() => {
    if (isSolanaSelected) return true;
    // For restricted mode, require a valid custom limit to be entered
    if (tempSelectedOption === 'restricted') {
      const limitNum = parseFloat(customLimit);
      // Allow 0 (to remove token) or any positive number
      return customLimit === '' || isNaN(limitNum) || limitNum < 0;
    }
    return false;
  }, [tempSelectedOption, isSolanaSelected, customLimit]);

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
            // Initial view - only show full access option without radio button
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
            // Options view - show both options with radio buttons in a single container
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
                        // Allow only numbers and decimal point
                        const sanitized = text.replace(/[^0-9.]/g, '');
                        // Prevent multiple decimal points
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
            label={strings('card.card_spending_limit.cancel')}
            size={ButtonSize.Lg}
            onPress={handleCancel}
            width={ButtonWidthTypes.Full}
            disabled={isLoading}
          />
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
};

export default SpendingLimit;
