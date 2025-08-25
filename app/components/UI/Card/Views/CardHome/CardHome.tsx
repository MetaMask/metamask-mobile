import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';

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
  useFocusEffect,
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
import { LINEA_CHAIN_ID } from '@metamask/swaps-controller/dist/constants';
import { selectCardholderAccounts } from '../../../../../core/redux/slices/card';
import Logger from '../../../../../util/Logger';
import { selectChainId } from '../../../../../selectors/networkController';
import { CardHomeSelectors } from '../../../../../../e2e/selectors/Card/CardHome.selectors';
import {
  TOKEN_BALANCE_LOADING,
  TOKEN_BALANCE_LOADING_UPPERCASE,
  TOKEN_RATE_UNDEFINED,
} from '../../../Tokens/constants';
import SkeletonText from '../../../Ramp/Aggregator/components/SkeletonText';
import { BottomSheetRef } from '../../../../../component-library/components/BottomSheets/BottomSheet';
import AddFundsBottomSheet from '../../components/AddFundsBottomSheet';
import { useOpenSwaps } from '../../hooks/useOpenSwaps';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { SUPPORTED_BOTTOMSHEET_TOKENS_SYMBOLS } from '../../constants';
import { selectSelectedInternalAccount } from '../../../../../selectors/accountsController';
import { useIsCardholder } from '../../hooks/useIsCardholder';

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
  const { PreferencesController, NetworkController, AccountsController } =
    Engine.context;
  const [error, setError] = useState<boolean>(false);
  const [isLoadingNetworkChange, setIsLoadingNetworkChange] = useState(true);
  const [openAddFundsBottomSheet, setOpenAddFundsBottomSheet] = useState(false);
  const [retries, setRetries] = useState(0);
  const sheetRef = useRef<BottomSheetRef>(null);

  const { trackEvent, createEventBuilder } = useMetrics();
  const navigation = useNavigation();
  const theme = useTheme();

  const styles = createStyles(theme);

  const privacyMode = useSelector(selectPrivacyMode);
  const selectedChainId = useSelector(selectChainId);
  const cardholderAddresses = useSelector(selectCardholderAccounts);
  const selectedAccount = useSelector(selectSelectedInternalAccount);
  const isCardholder = useIsCardholder();

  // Handle network and account changes
  useFocusEffect(
    useCallback(() => {
      const handleNetworkAndAccountChanges = async () => {
        // Handle network change first
        if (selectedChainId !== LINEA_CHAIN_ID) {
          const networkClientId =
            NetworkController.findNetworkClientIdByChainId(LINEA_CHAIN_ID);

          try {
            if (networkClientId) {
              await NetworkController.setActiveNetwork(networkClientId);
            }
          } catch (err) {
            const mappedError =
              err instanceof Error ? err : new Error(String(err));
            Logger.error(mappedError, 'CardHome::Error setting active network');
            setError(true);
            setIsLoadingNetworkChange(false);
            return;
          }
        }

        setIsLoadingNetworkChange(false);

        // Handle account change after network is correct
        if (!isCardholder) {
          const account = AccountsController.getAccountByAddress(
            cardholderAddresses?.[0],
          );

          if (!account) {
            setError(true);
          } else {
            AccountsController.setSelectedAccount(account.id);
          }
        }
      };

      handleNetworkAndAccountChanges();
    }, [
      NetworkController,
      AccountsController,
      selectedChainId,
      cardholderAddresses,
      isCardholder,
    ]),
  );

  const {
    priorityToken,
    fetchPriorityToken,
    isLoading: isLoadingPriorityToken,
    error: errorPriorityToken,
  } = useGetPriorityCardToken(
    selectedAccount?.address,
    selectedChainId === LINEA_CHAIN_ID,
  );
  const { balanceFiat, mainBalance } = useAssetBalance(priorityToken);
  const { navigateToCardPage } = useNavigateToCardPage(navigation);
  const { openSwaps } = useOpenSwaps({
    priorityToken: priorityToken ?? undefined,
  });

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

  const hasError = useMemo(
    () => error || errorPriorityToken,
    [error, errorPriorityToken],
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
        cardholderAddresses={cardholderAddresses}
        navigate={navigation.navigate}
      />
    ),
    [
      sheetRef,
      setOpenAddFundsBottomSheet,
      priorityToken,
      cardholderAddresses,
      selectedChainId,
      navigation,
    ],
  );

  const addFundsAction = useCallback(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.CARD_ADD_FUNDS_CLICKED).build(),
    );

    if (
      priorityToken?.symbol &&
      SUPPORTED_BOTTOMSHEET_TOKENS_SYMBOLS.includes(priorityToken.symbol)
    ) {
      setOpenAddFundsBottomSheet(true);
    } else if (priorityToken) {
      openSwaps({
        chainId: selectedChainId,
        cardholderAddress: cardholderAddresses?.[0],
      });
    }
  }, [
    trackEvent,
    createEventBuilder,
    priorityToken,
    openSwaps,
    selectedChainId,
    cardholderAddresses,
  ]);

  if (hasError) {
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

  if (
    isLoadingPriorityToken ||
    isLoadingNetworkChange ||
    (!priorityToken && !hasError)
  ) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color={theme.colors.primary.default}
          testID={CardHomeSelectors.LOADER}
        />
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
      {priorityToken && (
        <View style={styles.cardBalanceContainer}>
          <View
            style={[
              styles.balanceTextContainer,
              styles.defaultHorizontalPadding,
            ]}
          >
            <SensitiveText
              isHidden={privacyMode}
              length={SensitiveTextLength.Long}
              variant={TextVariant.HeadingLG}
            >
              {balanceAmount === TOKEN_BALANCE_LOADING ||
              balanceAmount === TOKEN_BALANCE_LOADING_UPPERCASE ? (
                <SkeletonText thin style={styles.skeleton} />
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
            <CardAssetItem
              assetKey={priorityToken}
              privacyMode={privacyMode}
              disabled
            />
          </View>

          <View
            style={[
              styles.addFundsButtonContainer,
              styles.defaultHorizontalPadding,
            ]}
          >
            <Button
              variant={ButtonVariants.Primary}
              label={strings('card.card_home.add_funds')}
              size={ButtonSize.Sm}
              onPress={addFundsAction}
              width={ButtonWidthTypes.Full}
              testID={CardHomeSelectors.ADD_FUNDS_BUTTON}
            />
          </View>
        </View>
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
