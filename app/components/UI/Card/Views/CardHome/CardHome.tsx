import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';

import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';

import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import { useSelector } from 'react-redux';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../../../component-library/components/Texts/SensitiveText';
import Engine from '../../../../../core/Engine';
import { useTheme } from '../../../../../util/theme';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import createStyles, { headerStyle } from './CardHome.styles';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import { useGetPriorityCardToken } from '../../hooks/useGetPriorityCardToken';
import { strings } from '../../../../../../locales/i18n';
import { useAssetBalance } from '../../hooks/useAssetBalance';
import { useNavigateToCardPage } from '../../hooks/useNavigateToCardPage';
import { AllowanceState } from '../../types';
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
import {
  Skeleton,
  SkeletonProps,
} from '../../../../../component-library/components/Skeleton';
import { isE2E } from '../../../../../util/test/utils';
import useSupportedTokens from '../../../Ramp/Deposit/hooks/useSupportedTokens';

const SkeletonLoading = (props: SkeletonProps) => {
  if (isE2E) return null;

  return <Skeleton {...props} />;
};

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

  const { trackEvent, createEventBuilder } = useMetrics();
  const navigation = useNavigation();
  const theme = useTheme();

  const styles = createStyles(theme);

  const privacyMode = useSelector(selectPrivacyMode);
  const selectedChainId = useSelector(selectChainId);

  const {
    priorityToken,
    fetchPriorityToken,
    isLoading: isLoadingPriorityToken,
    error,
  } = useGetPriorityCardToken();
  const { balanceFiat, mainBalance } = useAssetBalance(priorityToken);
  const { navigateToCardPage } = useNavigateToCardPage(navigation);
  const { openSwaps } = useOpenSwaps({
    priorityToken: priorityToken ?? undefined,
  });
  const depositSupportedTokens = useSupportedTokens();

  const toggleIsBalanceAndAssetsHidden = useCallback(
    (value: boolean) => {
      PreferencesController.setPrivacyMode(value);
    },
    [PreferencesController],
  );

  const isAllowanceLimited = useMemo(
    () => priorityToken?.allowanceState === AllowanceState.Limited,
    [priorityToken],
  );

  const balanceAmount = useMemo(() => {
    if (!balanceFiat || balanceFiat === TOKEN_RATE_UNDEFINED) {
      return mainBalance;
    }

    return balanceFiat;
  }, [balanceFiat, mainBalance]);

  const isPriorityTokenSupportedDeposit = useMemo(() => {
    if (priorityToken?.symbol) {
      return depositSupportedTokens.find(
        (token) =>
          token.symbol.toLowerCase() === priorityToken.symbol?.toLowerCase(),
      );
    }
  }, [priorityToken, depositSupportedTokens]);

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

  const addFundsAction = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_ADD_FUNDS_CLICKED).build(),
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
    isPriorityTokenSupportedDeposit,
    selectedChainId,
  ]);

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
        {retries < 3 && (
          <View style={styles.tryAgainButtonContainer}>
            <Button
              variant={ButtonVariants.Primary}
              label={strings('card.card_home.try_again')}
              size={ButtonSize.Md}
              onPress={() => {
                setRetries((prevState) => prevState + 1);
                fetchPriorityToken();
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
      <View style={styles.cardBalanceContainer}>
        <View
          style={[styles.balanceTextContainer, styles.defaultHorizontalPadding]}
        >
          <SensitiveText
            isHidden={privacyMode}
            length={SensitiveTextLength.Long}
            variant={TextVariant.HeadingLG}
          >
            {isLoadingPriorityToken ||
            balanceAmount === TOKEN_BALANCE_LOADING ||
            balanceAmount === TOKEN_BALANCE_LOADING_UPPERCASE ? (
              <SkeletonLoading
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
          <CardImage />
        </View>
        <View
          style={[
            styles.cardAssetItemContainer,
            styles.defaultHorizontalPadding,
          ]}
        >
          {isLoadingPriorityToken || !priorityToken ? (
            <SkeletonLoading
              height={50}
              width={'100%'}
              style={styles.skeletonRounded}
              testID={CardHomeSelectors.CARD_ASSET_ITEM_SKELETON}
            />
          ) : (
            <CardAssetItem assetKey={priorityToken} privacyMode={privacyMode} />
          )}
        </View>

        <View
          style={[
            styles.addFundsButtonContainer,
            styles.defaultHorizontalPadding,
          ]}
        >
          {isLoadingPriorityToken ? (
            <SkeletonLoading
              height={28}
              width={'100%'}
              style={styles.skeletonRounded}
              testID={CardHomeSelectors.ADD_FUNDS_BUTTON_SKELETON}
            />
          ) : (
            <Button
              variant={ButtonVariants.Primary}
              label={strings('card.card_home.add_funds')}
              size={ButtonSize.Sm}
              onPress={addFundsAction}
              width={ButtonWidthTypes.Full}
              loading={isLoadingPriorityToken}
              testID={CardHomeSelectors.ADD_FUNDS_BUTTON}
            />
          )}
        </View>
      </View>

      <ManageCardListItem
        title={strings('card.card_home.manage_card_options.manage_card')}
        description={strings(
          'card.card_home.manage_card_options.advanced_card_management_description',
        )}
        rightIcon={IconName.Export}
        onPress={navigateToCardPage}
        testID={CardHomeSelectors.ADVANCED_CARD_MANAGEMENT_ITEM}
      />

      {openAddFundsBottomSheet && renderAddFundsBottomSheet()}
    </ScrollView>
  );
};

CardHome.navigationOptions = ({
  navigation,
}: {
  navigation: NavigationProp<ParamListBase>;
}) => ({
  headerLeft: () => (
    <ButtonIcon
      style={headerStyle.icon}
      size={ButtonIconSizes.Md}
      iconName={IconName.ArrowLeft}
      onPress={() => navigation.goBack()}
    />
  ),
  headerTitle: () => (
    <Text
      variant={TextVariant.HeadingSM}
      style={headerStyle.title}
      testID={'card-view-title'}
    >
      {strings('card.card')}
    </Text>
  ),
  headerRight: () => (
    <ButtonIcon
      size={ButtonIconSizes.Md}
      iconName={IconName.Setting}
      style={headerStyle.invisibleIcon}
    />
  ),
});

export default CardHome;
