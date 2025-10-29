import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';

import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';

import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../../../component-library/components/Texts/SensitiveText';
import Engine from '../../../../../core/Engine';
import { useTheme } from '../../../../../util/theme';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import createStyles from './CardHome.styles';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { useGetPriorityCardToken } from '../../hooks/useGetPriorityCardToken';
import { strings } from '../../../../../../locales/i18n';
import { useAssetBalance } from '../../hooks/useAssetBalance';
import { useNavigateToCardPage } from '../../hooks/useNavigateToCardPage';
import { AllowanceState, CardStatus, CardType, CardWarning } from '../../types';
import CardAssetItem from '../../components/CardAssetItem';
import ManageCardListItem from '../../components/ManageCardListItem';
import CardImage from '../../components/CardImage';
import { selectChainId } from '../../../../../selectors/networkController';
import { CardHomeSelectors } from '../../../../../../e2e/selectors/Card/CardHome.selectors';
import {
  TOKEN_BALANCE_LOADING,
  TOKEN_BALANCE_LOADING_UPPERCASE,
  TOKEN_RATE_UNDEFINED,
} from '../../../Tokens/constants';
import { BottomSheetRef } from '../../../../../component-library/components/BottomSheets/BottomSheet';
import AddFundsBottomSheet from '../../components/AddFundsBottomSheet';
import { useOpenSwaps } from '../../hooks/useOpenSwaps';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { Skeleton } from '../../../../../component-library/components/Skeleton';
import { DEPOSIT_SUPPORTED_TOKENS } from '../../constants';
import { useCardSDK } from '../../sdk';
import Routes from '../../../../../constants/navigation/Routes';
import useIsBaanxLoginEnabled from '../../hooks/isBaanxLoginEnabled';
import useCardDetails from '../../hooks/useCardDetails';
import {
  selectIsAuthenticatedCard,
  setIsAuthenticatedCard,
  setAuthenticatedPriorityToken,
  setAuthenticatedPriorityTokenLastFetched,
  setUserCardLocation,
} from '../../../../../core/redux/slices/card';
import { useCardProvision } from '../../hooks/useCardProvision';
import CardWarningBox from '../../components/CardWarningBox/CardWarningBox';
import { useIsSwapEnabledForPriorityToken } from '../../hooks/useIsSwapEnabledForPriorityToken';
import { isAuthenticationError } from '../../util/isAuthenticationError';
import { removeCardBaanxToken } from '../../util/cardTokenVault';
import Logger from '../../../../../util/Logger';

/**
 * CardHome Component
 *
 * Main view for the MetaMask Card feature that displays:
 * - User's card balance with privacy controls
 * - Priority token information for spending
 * - Card management options (advanced management)
 *
 * @param props - Component props
 * @returns JSX element representing the card home screen
 */
const CardHome = () => {
  const { PreferencesController } = Engine.context;
  const [openAddFundsBottomSheet, setOpenAddFundsBottomSheet] = useState(false);
  const [retries, setRetries] = useState(0);
  const sheetRef = useRef<BottomSheetRef>(null);
  const { logoutFromProvider, isLoading: isSDKLoading } = useCardSDK();
  const isBaanxLoginEnabled = useIsBaanxLoginEnabled();

  const { trackEvent, createEventBuilder } = useMetrics();
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const theme = useTheme();

  const styles = createStyles(theme);

  const privacyMode = useSelector(selectPrivacyMode);
  const selectedChainId = useSelector(selectChainId);
  const isAuthenticated = useSelector(selectIsAuthenticatedCard);

  const {
    priorityToken,
    fetchPriorityToken,
    isLoading: isLoadingPriorityToken,
    error: priorityTokenError,
    warning: priorityTokenWarning,
  } = useGetPriorityCardToken();
  const { balanceFiat, mainBalance, rawFiatNumber, rawTokenBalance, asset } =
    useAssetBalance(priorityToken);
  const {
    cardDetails,
    pollCardStatusUntilProvisioned,
    fetchCardDetails,
    isLoading: isLoadingCardDetails,
    error: cardDetailsError,
    warning: cardDetailsWarning,
    isLoadingPollCardStatusUntilProvisioned,
  } = useCardDetails();
  const { provisionCard, isLoading: isLoadingProvisionCard } =
    useCardProvision();
  const { navigateToCardPage } = useNavigateToCardPage(navigation);
  const { openSwaps } = useOpenSwaps({
    priorityToken,
  });
  const isSwapEnabledForPriorityToken = useIsSwapEnabledForPriorityToken(
    priorityToken?.walletAddress,
  );

  const toggleIsBalanceAndAssetsHidden = useCallback(
    (value: boolean) => {
      PreferencesController.setPrivacyMode(value);
    },
    [PreferencesController],
  );

  const isAllowanceLimited = useMemo(
    () =>
      !isAuthenticated &&
      priorityToken?.allowanceState === AllowanceState.Limited,
    [priorityToken, isAuthenticated],
  );

  const balanceAmount = useMemo(() => {
    if (!balanceFiat || balanceFiat === TOKEN_RATE_UNDEFINED) {
      return mainBalance;
    }

    return balanceFiat;
  }, [balanceFiat, mainBalance]);

  const renderAddFundsBottomSheet = useCallback(
    () => (
      <AddFundsBottomSheet
        sheetRef={sheetRef}
        setOpenAddFundsBottomSheet={setOpenAddFundsBottomSheet}
        priorityToken={priorityToken ?? undefined}
        chainId={selectedChainId}
        navigate={navigation.navigate}
      />
    ),
    [
      sheetRef,
      setOpenAddFundsBottomSheet,
      priorityToken,
      selectedChainId,
      navigation,
    ],
  );

  // Track event only once after priorityToken and balances are loaded
  const hasTrackedCardHomeView = useRef(false);

  useEffect(() => {
    // Early return if already tracked to prevent any possibility of duplicate tracking
    if (hasTrackedCardHomeView.current) {
      return;
    }

    // Don't track while SDK is still loading to prevent premature tracking
    if (isSDKLoading) {
      return;
    }

    const hasValidMainBalance =
      mainBalance !== undefined &&
      mainBalance !== TOKEN_BALANCE_LOADING &&
      mainBalance !== TOKEN_BALANCE_LOADING_UPPERCASE;

    const hasValidFiatBalance =
      balanceFiat !== undefined &&
      balanceFiat !== TOKEN_BALANCE_LOADING &&
      balanceFiat !== TOKEN_BALANCE_LOADING_UPPERCASE &&
      balanceFiat !== TOKEN_RATE_UNDEFINED;

    const isLoaded =
      !!priorityToken && (hasValidMainBalance || hasValidFiatBalance);

    if (isLoaded) {
      // Set flag immediately to prevent race conditions
      hasTrackedCardHomeView.current = true;

      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_HOME_VIEWED)
          .addProperties({
            token_symbol_priority: priorityToken?.symbol,
            token_raw_balance_priority:
              rawTokenBalance !== undefined && isNaN(rawTokenBalance)
                ? 0
                : rawTokenBalance,
            token_fiat_balance_priority:
              rawFiatNumber !== undefined && isNaN(rawFiatNumber)
                ? 0
                : rawFiatNumber,
          })
          .build(),
      );
    }
  }, [
    priorityToken,
    mainBalance,
    balanceFiat,
    rawTokenBalance,
    rawFiatNumber,
    trackEvent,
    createEventBuilder,
    isSDKLoading,
  ]);

  const addFundsAction = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_ADD_FUNDS_CLICKED).build(),
    );
    const isPriorityTokenSupportedDeposit = !!DEPOSIT_SUPPORTED_TOKENS.find(
      (t) => t.toLowerCase() === priorityToken?.symbol?.toLowerCase(),
    );

    if (isPriorityTokenSupportedDeposit) {
      setOpenAddFundsBottomSheet(true);
    } else if (priorityToken) {
      openSwaps({
        chainId: selectedChainId,
      });
    }
  }, [
    trackEvent,
    createEventBuilder,
    priorityToken,
    openSwaps,
    selectedChainId,
  ]);

  const changeAssetAction = useCallback(() => {
    if (isAuthenticated) {
      // open asset bottom sheet
    } else {
      navigation.navigate(Routes.CARD.WELCOME);
    }
  }, [isAuthenticated, navigation]);

  const manageSpendingLimitAction = useCallback(() => {
    if (isAuthenticated) {
      // open spending limit screen
    } else {
      navigation.navigate(Routes.CARD.WELCOME);
    }
  }, [isAuthenticated, navigation]);

  const logoutAction = () => {
    logoutFromProvider();
    navigation.goBack();
  };

  const isLoading = useMemo(
    () => isLoadingPriorityToken || isLoadingCardDetails,
    [isLoadingPriorityToken, isLoadingCardDetails],
  );

  const enableCardAction = useCallback(async () => {
    await provisionCard();
    const isProvisioned = await pollCardStatusUntilProvisioned();

    if (isProvisioned) {
      fetchPriorityToken();
      changeAssetAction();
    }
  }, [
    provisionCard,
    pollCardStatusUntilProvisioned,
    fetchPriorityToken,
    changeAssetAction,
  ]);

  const ButtonsSection = useMemo(() => {
    if (isLoading) {
      return (
        <Skeleton
          height={28}
          width={'100%'}
          style={styles.skeletonRounded}
          testID={CardHomeSelectors.ADD_FUNDS_BUTTON_SKELETON}
        />
      );
    }

    if (isBaanxLoginEnabled) {
      if (cardDetailsWarning === CardWarning.NoCard) {
        return (
          <Button
            variant={ButtonVariants.Primary}
            style={styles.defaultMarginTop}
            label={strings('card.card_home.enable_card_button_label')}
            size={ButtonSize.Lg}
            onPress={enableCardAction}
            width={ButtonWidthTypes.Full}
            disabled={
              isLoading ||
              isLoadingPollCardStatusUntilProvisioned ||
              isLoadingProvisionCard
            }
            loading={
              isLoading ||
              isLoadingPollCardStatusUntilProvisioned ||
              isLoadingProvisionCard
            }
            testID={CardHomeSelectors.ENABLE_CARD_BUTTON}
          />
        );
      }

      if (priorityTokenWarning === CardWarning.NeedDelegation) {
        return (
          <Button
            variant={ButtonVariants.Primary}
            style={styles.defaultMarginTop}
            label={strings('card.card_home.enable_assets_button_label')}
            size={ButtonSize.Lg}
            onPress={changeAssetAction}
            width={ButtonWidthTypes.Full}
            disabled={isLoading}
            loading={isLoading}
            testID={CardHomeSelectors.ENABLE_ASSETS_BUTTON}
          />
        );
      }

      return (
        <View style={styles.buttonsContainer}>
          <Button
            variant={ButtonVariants.Primary}
            style={
              !isSwapEnabledForPriorityToken
                ? styles.halfWidthButtonDisabled
                : styles.halfWidthButton
            }
            label={strings('card.card_home.add_funds')}
            size={ButtonSize.Lg}
            onPress={addFundsAction}
            width={ButtonWidthTypes.Full}
            disabled={!isSwapEnabledForPriorityToken}
            loading={isLoading}
            testID={CardHomeSelectors.ADD_FUNDS_BUTTON}
          />
          <Button
            variant={ButtonVariants.Secondary}
            style={styles.halfWidthButton}
            label={strings('card.card_home.change_asset')}
            size={ButtonSize.Lg}
            onPress={changeAssetAction}
            width={ButtonWidthTypes.Full}
            loading={isLoading}
            testID={CardHomeSelectors.CHANGE_ASSET_BUTTON}
          />
        </View>
      );
    }

    return (
      <Button
        variant={ButtonVariants.Primary}
        label={strings('card.card_home.add_funds')}
        size={ButtonSize.Lg}
        onPress={addFundsAction}
        width={ButtonWidthTypes.Full}
        loading={isLoading}
        testID={CardHomeSelectors.ADD_FUNDS_BUTTON}
      />
    );
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    addFundsAction,
    priorityTokenWarning,
    isLoading,
    isSwapEnabledForPriorityToken,
  ]);

  const error = useMemo(
    () => priorityTokenError || cardDetailsError,
    [priorityTokenError, cardDetailsError],
  );

  // Handle authentication errors (expired token, invalid credentials, etc.)
  useEffect(() => {
    const handleAuthenticationError = async () => {
      if (!error) {
        return;
      }

      // Check if the error is authentication-related
      if (isAuthenticated && isAuthenticationError(cardDetailsError)) {
        Logger.log(
          'CardHome: Authentication error detected, clearing auth state and redirecting',
        );

        // Clear authentication state
        await removeCardBaanxToken();
        dispatch(setIsAuthenticatedCard(false));
        dispatch(setAuthenticatedPriorityToken(null));
        dispatch(setAuthenticatedPriorityTokenLastFetched(null));
        dispatch(setUserCardLocation(null));

        // Redirect to welcome screen for re-authentication
        navigation.navigate(Routes.CARD.WELCOME);
      }
    };

    handleAuthenticationError();
  }, [error, isAuthenticated, dispatch, navigation, cardDetailsError]);

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Icon
          name={IconName.Forest}
          size={IconSize.Xl}
          color={theme.colors.icon.default}
        />
        <Text
          variant={TextVariant.HeadingSM}
          color={theme.colors.text.alternative}
        >
          {strings('card.card_home.error_title')}
        </Text>
        <Text
          variant={TextVariant.BodyMD}
          color={theme.colors.text.alternative}
          style={styles.errorDescription}
        >
          {strings('card.card_home.error_description')}
        </Text>
        {retries < 3 && !isAuthenticationError(error) && (
          <View style={styles.tryAgainButtonContainer}>
            <Button
              variant={ButtonVariants.Primary}
              label={strings('card.card_home.try_again')}
              size={ButtonSize.Md}
              onPress={() => {
                setRetries((prevState) => prevState + 1);
                fetchPriorityToken();

                if (cardDetailsError) {
                  fetchCardDetails();
                }
              }}
              testID={CardHomeSelectors.TRY_AGAIN_BUTTON}
            />
          </View>
        )}
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.wrapper}
      showsVerticalScrollIndicator={false}
      alwaysBounceVertical={false}
      contentContainerStyle={styles.contentContainer}
    >
      {cardDetailsWarning && <CardWarningBox warning={cardDetailsWarning} />}
      <View style={styles.cardBalanceContainer}>
        <View
          style={[
            styles.balanceTextContainer,
            styles.defaultHorizontalPadding,
            priorityTokenWarning === CardWarning.NeedDelegation &&
              styles.shouldBeHidden,
          ]}
        >
          <SensitiveText
            isHidden={privacyMode}
            length={SensitiveTextLength.Long}
            variant={TextVariant.HeadingLG}
          >
            {isLoading ||
            balanceAmount === TOKEN_BALANCE_LOADING ||
            balanceAmount === TOKEN_BALANCE_LOADING_UPPERCASE ? (
              <Skeleton
                height={28}
                width={'50%'}
                style={styles.skeletonRounded}
                testID={CardHomeSelectors.BALANCE_SKELETON}
              />
            ) : (
              balanceAmount ?? '0'
            )}
          </SensitiveText>
          <TouchableOpacity
            onPress={() => toggleIsBalanceAndAssetsHidden(!privacyMode)}
            testID={CardHomeSelectors.PRIVACY_TOGGLE_BUTTON}
          >
            <Icon
              name={privacyMode ? IconName.EyeSlash : IconName.Eye}
              size={IconSize.Md}
              color={theme.colors.icon.alternative}
            />
          </TouchableOpacity>
        </View>
        {isAllowanceLimited && (
          <View
            style={[
              styles.limitedAllowanceWarningContainer,
              styles.defaultHorizontalPadding,
            ]}
          >
            <Text>
              <Text
                variant={TextVariant.BodySM}
                color={theme.colors.text.alternative}
              >
                {strings('card.card_home.limited_spending_warning', {
                  manageCard: '',
                })}
              </Text>
              <Text
                variant={TextVariant.BodySM}
                color={theme.colors.text.alternative}
                style={styles.limitedAllowanceManageCardText}
              >
                {strings('card.card_home.manage_card_options.manage_card')}
                {'.'}
              </Text>
            </Text>
          </View>
        )}
        <View
          style={[
            styles.cardImageContainer,
            styles.defaultHorizontalPadding,
            isAllowanceLimited && styles.defaultMarginTop,
          ]}
        >
          {isLoading ? (
            <Skeleton
              height={240}
              width={'100%'}
              style={styles.skeletonRounded}
            />
          ) : (
            <CardImage
              type={cardDetails?.type ?? CardType.VIRTUAL}
              status={cardDetails?.status ?? CardStatus.ACTIVE}
              address={priorityToken?.walletAddress}
            />
          )}
        </View>
        <View
          style={[
            styles.cardAssetItemContainer,
            styles.defaultHorizontalPadding,
            priorityTokenWarning === CardWarning.NeedDelegation &&
              styles.shouldBeHidden,
          ]}
        >
          {isLoading ? (
            <Skeleton
              height={50}
              width={'100%'}
              style={styles.skeletonRounded}
              testID={CardHomeSelectors.CARD_ASSET_ITEM_SKELETON}
            />
          ) : (
            <CardAssetItem asset={asset} privacyMode={privacyMode} />
          )}
        </View>

        <View
          style={[styles.buttonsContainerBase, styles.defaultHorizontalPadding]}
        >
          {ButtonsSection}
        </View>
      </View>

      <View
        style={[
          priorityTokenWarning === CardWarning.NeedDelegation &&
            styles.shouldBeHidden,
        ]}
      >
        {isBaanxLoginEnabled && (
          <ManageCardListItem
            title={strings(
              'card.card_home.manage_card_options.manage_spending_limit',
            )}
            description={strings(
              priorityToken?.allowanceState === AllowanceState.Enabled
                ? 'card.card_home.manage_card_options.manage_spending_limit_description_full'
                : 'card.card_home.manage_card_options.manage_spending_limit_description_restricted',
            )}
            rightIcon={IconName.ArrowRight}
            onPress={manageSpendingLimitAction}
            testID={CardHomeSelectors.MANAGE_SPENDING_LIMIT_ITEM}
          />
        )}

        <ManageCardListItem
          title={strings('card.card_home.manage_card_options.manage_card')}
          description={strings(
            'card.card_home.manage_card_options.advanced_card_management_description',
          )}
          rightIcon={IconName.Export}
          onPress={navigateToCardPage}
          testID={CardHomeSelectors.ADVANCED_CARD_MANAGEMENT_ITEM}
        />
      </View>

      {isAuthenticated && (
        <ManageCardListItem
          title="Logout"
          description="Logout of your Card account"
          rightIcon={IconName.Logout}
          onPress={logoutAction}
        />
      )}

      {openAddFundsBottomSheet && renderAddFundsBottomSheet()}
    </ScrollView>
  );
};

export default CardHome;
