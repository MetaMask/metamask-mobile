import React, { useCallback, useMemo, useState } from 'react';
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
import { useDispatch, useSelector } from 'react-redux';
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
import {
  SwapBridgeNavigationLocation,
  useSwapBridgeNavigation,
} from '../../../Bridge/hooks/useSwapBridgeNavigation';
import Routes from '../../../../../constants/navigation/Routes';
import CardImage from '../../components/CardImage';
import { LINEA_CHAIN_ID } from '@metamask/swaps-controller/dist/constants';
import { selectCardholderAccounts } from '../../../../../core/redux/slices/card';
import Logger from '../../../../../util/Logger';
import { selectChainId } from '../../../../../selectors/networkController';
import {
  setDestToken,
  setSourceToken,
} from '../../../../../core/redux/slices/bridge';
import { BridgeToken } from '../../../Bridge/types';
import { Hex } from '@metamask/utils';
import {
  selectEvmTokenFiatBalances,
  selectEvmTokens,
} from '../../../../../selectors/multichain';
import { getHighestFiatToken } from '../../util/getHighestFiatToken';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import generateDeviceAnalyticsMetaData from '../../../../../util/metrics';

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
  const dispatch = useDispatch();
  const { PreferencesController, NetworkController } = Engine.context;
  const [error, setError] = useState<boolean>(false);
  const [isLoadingNetworkChange, setIsLoadingNetworkChange] = useState(false);
  const [retries, setRetries] = useState(0);

  const navigation = useNavigation();
  const theme = useTheme();
  const { trackEvent, createEventBuilder } = useMetrics();

  const styles = createStyles(theme);

  const privacyMode = useSelector(selectPrivacyMode);
  const selectedChainId = useSelector(selectChainId);
  const cardholderAddresses = useSelector(selectCardholderAccounts);
  const evmTokens = useSelector(selectEvmTokens);
  const tokenFiatBalances = useSelector(selectEvmTokenFiatBalances);

  const tokens = useMemo(
    () =>
      evmTokens.map((token, i) => ({
        ...token,
        tokenFiatAmount: tokenFiatBalances[i],
      })),
    [evmTokens, tokenFiatBalances],
  );

  useFocusEffect(
    useCallback(() => {
      (async () => {
        if (selectedChainId !== LINEA_CHAIN_ID) {
          const id =
            NetworkController.findNetworkClientIdByChainId(LINEA_CHAIN_ID);

          try {
            if (id) {
              setIsLoadingNetworkChange(true);
              await NetworkController.setActiveNetwork(id);
            }
          } catch (err) {
            const mappedError =
              err instanceof Error ? err : new Error(String(err));
            Logger.error(mappedError, 'CardHome::Error setting active network');
            setError(true);
          } finally {
            setIsLoadingNetworkChange(false);
          }
        }
      })();
    }, [NetworkController, selectedChainId]),
  );

  const {
    priorityToken,
    fetchPriorityToken,
    isLoading: isLoadingPriorityToken,
    error: errorPriorityToken,
  } = useGetPriorityCardToken(cardholderAddresses?.[0]);
  const { balanceFiat, asset } = useAssetBalance(priorityToken);
  const { navigateToCardPage } = useNavigateToCardPage(navigation);
  const { goToSwaps } = useSwapBridgeNavigation({
    location: SwapBridgeNavigationLocation.TokenDetails,
    sourcePage: Routes.CARD.HOME,
  });

  const swapDestinationToken = useMemo(() => {
    if (!priorityToken) return undefined;
    return {
      ...priorityToken,
      image: asset?.image,
    } as BridgeToken;
  }, [priorityToken, asset]);

  const swapSourceToken = useMemo(() => {
    if (cardholderAddresses?.[0] && priorityToken) {
      const topToken = getHighestFiatToken(
        tokens,
        priorityToken.address as Hex,
      );

      if (!topToken?.isETH) {
        return topToken;
      }
    }
  }, [cardholderAddresses, priorityToken, tokens]);

  const openSwaps = useCallback(() => {
    if (swapDestinationToken) {
      dispatch(setDestToken(swapDestinationToken));

      if (swapSourceToken) {
        dispatch(
          setSourceToken({
            chainId: swapSourceToken.chainId as Hex,
            address: swapSourceToken.address,
            decimals: swapSourceToken.decimals,
            symbol: swapSourceToken.symbol,
            balance: swapSourceToken.balance,
            image: swapSourceToken.image,
            balanceFiat: swapSourceToken.balanceFiat,
            name: swapSourceToken.name,
          }),
        );
      }

      goToSwaps();
      trackEvent(
        createEventBuilder(MetaMetricsEvents.CARD_ADD_FUNDS_CLICKED)
          .addProperties({
            ...generateDeviceAnalyticsMetaData(),
          })
          .build(),
      );
    }
  }, [
    goToSwaps,
    dispatch,
    swapDestinationToken,
    swapSourceToken,
    trackEvent,
    createEventBuilder,
  ]);

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

  const isLoading = useMemo(
    () => isLoadingPriorityToken || isLoadingNetworkChange,
    [isLoadingPriorityToken, isLoadingNetworkChange],
  );

  const hasError = useMemo(
    () => errorPriorityToken || error || (!isLoading && !priorityToken),
    [errorPriorityToken, error, isLoading, priorityToken],
  );

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
              testID="try-again-button"
            />
          </View>
        )}
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator
          size="large"
          color={theme.colors.primary.default}
          testID="loader"
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.wrapper}
      showsVerticalScrollIndicator={false}
      alwaysBounceVertical={false}
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
              {balanceFiat ?? 0}
            </SensitiveText>
            <TouchableOpacity
              onPress={() => toggleIsBalanceAndAssetsHidden(!privacyMode)}
              testID="privacy-toggle-button"
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
              onPress={openSwaps}
              width={ButtonWidthTypes.Full}
              testID="add-funds-button"
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
        testID="advanced-card-management-item"
      />
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
