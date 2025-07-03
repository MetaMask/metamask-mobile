import React, {
  useRef,
  useCallback,
  useEffect,
  useReducer,
  useMemo,
} from 'react';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { View } from 'react-native';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './EarnTokenList.styles';
import {
  getDecimalChainId,
  isPortfolioViewEnabled,
} from '../../../../../util/networks';
import { TokenI } from '../../../Tokens/types';
import { ScrollView } from 'react-native-gesture-handler';
import { Hex } from '@metamask/utils';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import {
  EVENT_LOCATIONS,
  EVENT_PROVIDERS,
} from '../../../Stake/constants/events';
import { strings } from '../../../../../../locales/i18n';
import UpsellBanner from '../../../Stake/components/UpsellBanner';
import { UPSELL_BANNER_VARIANTS } from '../../../Stake/components/UpsellBanner/UpsellBanner.types';
import Engine from '../../../../../core/Engine';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import useEarnTokens from '../../hooks/useEarnTokens';
import { useSelector } from 'react-redux';
import {
  selectPooledStakingEnabledFlag,
  selectStablecoinLendingEnabledFlag,
} from '../../selectors/featureFlags';
import useEarnNetworkPolling from '../../hooks/useEarnNetworkPolling';
import { EARN_INPUT_VIEW_ACTIONS } from '../../Views/EarnInputView/EarnInputView.types';
import EarnDepositTokenListItem from '../EarnDepositTokenListItem';
import EarnWithdrawalTokenListItem from '../EarnWithdrawalTokenListItem';
import { EarnTokenDetails } from '../../types/lending.types';
import BN4 from 'bnjs4';
import { sortByHighestBalance, sortByHighestRewards } from '../../utils';

const isEmptyBalance = (token: { balanceFormatted: string }) =>
  parseFloat(token?.balanceFormatted) === 0;

const EarnTokenListSkeletonPlaceholder = () => (
  <View testID="earn-token-list-skeleton">
    <SkeletonPlaceholder>
      <SkeletonPlaceholder.Item
        width={'auto'}
        height={150}
        borderRadius={8}
        marginBottom={12}
      />
      <>
        {[1, 2, 3, 4, 5].map((value) => (
          <SkeletonPlaceholder.Item
            key={value}
            width={'auto'}
            height={42}
            borderRadius={8}
            margin={16}
          />
        ))}
      </>
    </SkeletonPlaceholder>
  </View>
);

interface EarnTokenListViewRouteParams {
  tokenFilter: {
    includeReceiptTokens: boolean;
  };
  onItemPressScreen: string;
}

export interface EarnTokenListProps {
  route: RouteProp<{ params: EarnTokenListViewRouteParams }, 'params'>;
}

const EarnTokenList = () => {
  // Start polling lending networks when this component mounts and stops when it unmounts
  // This is currently the main component that needs data cross chain on boot
  useEarnNetworkPolling();

  // Temp: Used as workaround for BadgeNetwork not properly anchoring to its parent BadgeWrapper.
  const [, forceUpdate] = useReducer((x) => x + 1, 0);
  const { createEventBuilder, trackEvent } = useMetrics();
  const { styles } = useStyles(styleSheet, {});
  const { navigate } = useNavigation();
  const { params } = useRoute<EarnTokenListProps['route']>();
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  const isPooledStakingEnabled = useSelector(selectPooledStakingEnabledFlag);
  const { includeReceiptTokens } = params?.tokenFilter ?? {};

  const { earnTokens, earnOutputTokens, earnableTotalFiatFormatted } =
    useEarnTokens();

  const tokens = includeReceiptTokens ? earnOutputTokens : earnTokens;

  // Temp workaround for BadgeNetwork component not anchoring correctly on initial render.
  // We force a rerender to ensure the BadgeNetwork component properly anchors to its BadgeWrapper.
  useEffect(() => {
    // Force a re-render after initial mount
    const timer = setTimeout(() => {
      forceUpdate();
    }, 100); // Adjust timing as needed

    return () => clearTimeout(timer);
  }, []);

  const closeBottomSheetAndNavigate = useCallback(
    (navigateFunc: () => void) => {
      bottomSheetRef.current?.onCloseBottomSheet(navigateFunc);
    },
    [],
  );

  const redirectToDepositScreen = async (token: TokenI) => {
    closeBottomSheetAndNavigate(() => {
      navigate('StakeScreens', {
        screen: Routes.STAKING.STAKE,
        params: { token },
      });
    });
  };

  const redirectToWithdrawalScreen = (token: TokenI) => {
    closeBottomSheetAndNavigate(() => {
      navigate('StakeScreens', {
        screen: Routes.STAKING.UNSTAKE,
        params: { token },
      });
    });
  };

  const handleRedirectToInputScreen = async (token: TokenI) => {
    const { NetworkController } = Engine.context;

    const networkClientId = NetworkController.findNetworkClientIdByChainId(
      token.chainId as Hex,
    );

    if (!networkClientId) {
      console.error(
        `EarnDepositTokenListItem redirect failed: could not retrieve networkClientId for chainId: ${token.chainId}`,
      );
      return;
    }

    const onItemPressScreen = params?.onItemPressScreen ?? '';

    if (onItemPressScreen === EARN_INPUT_VIEW_ACTIONS.DEPOSIT) {
      await Engine.context.NetworkController.setActiveNetwork(networkClientId);
      redirectToDepositScreen(token);
    } else if (onItemPressScreen === EARN_INPUT_VIEW_ACTIONS.WITHDRAW) {
      await Engine.context.NetworkController.setActiveNetwork(networkClientId);
      redirectToWithdrawalScreen(token);
    }

    trackEvent(
      createEventBuilder(MetaMetricsEvents.EARN_TOKEN_LIST_ITEM_CLICKED)
        .addProperties({
          provider: EVENT_PROVIDERS.CONSENSYS,
          location: EVENT_LOCATIONS.WALLET_ACTIONS_BOTTOM_SHEET,
          token_name: token.name,
          token_symbol: token.symbol,
          token_chain_id: getDecimalChainId(token.chainId),
        })
        .build(),
    );
  };

  const isNoEarnableTokensWithBalance = useMemo(
    () =>
      earnTokens?.every((token) =>
        new BN4(token.balanceMinimalUnit).eq(new BN4(0)),
      ),
    [earnTokens],
  );

  const highestAvailableApr = useMemo(
    () =>
      earnTokens?.reduce((highestApr, token) => {
        const parsedApr = parseFloat(token?.experience?.apr);

        return parsedApr > highestApr ? parsedApr : highestApr;
      }, 0),
    [earnTokens],
  );

  /**
   * We want to sort the tokens by estimated fiat rewards in descending order.
   * Tokens where a user has a non-zero balance will be listed first by highest fiat rewards.
   * Tokens where a user doesn't have a balance will not be listed for now to avoid dead end on deposit screen.
   */
  const tokensSortedByHighestYield = useMemo(() => {
    if (!tokens?.length) return [];

    const tokensWithBalance: EarnTokenDetails[] = [];

    tokens?.forEach((token) => {
      const hasTokenBalance = new BN4(token.balanceMinimalUnit).gt(new BN4(0));
      // show at least ETH if no other tokens have balance
      if (hasTokenBalance || token.isETH) {
        tokensWithBalance.push(token);
      }
    });

    return [...sortByHighestRewards(tokensWithBalance)];
  }, [tokens]);

  const tokensSortedByHighestBalance = useMemo(() => {
    if (!tokens?.length) return [];

    return [...sortByHighestBalance(tokens)];
  }, [tokens]);

  const renderTokenListItems = () => {
    const onItemPressScreen = params?.onItemPressScreen;

    let filteredTokens;
    if (onItemPressScreen === EARN_INPUT_VIEW_ACTIONS.DEPOSIT) {
      filteredTokens = tokensSortedByHighestYield;
    } else {
      filteredTokens = tokensSortedByHighestBalance;
    }

    return filteredTokens.map((token) => {
      if (token.isETH && !token.isStaked && !isPooledStakingEnabled) {
        return null;
      }

      return (
        token?.chainId && (
          <View
            style={styles.listItemContainer}
            key={`${token.name}-${token.symbol}-${token.chainId}`}
          >
            {onItemPressScreen === EARN_INPUT_VIEW_ACTIONS.WITHDRAW ? (
              <EarnWithdrawalTokenListItem
                earnToken={token}
                onPress={handleRedirectToInputScreen}
              />
            ) : (
              <EarnDepositTokenListItem
                token={token}
                onPress={handleRedirectToInputScreen}
                primaryText={{
                  value: `${token?.experience?.apr || 0}% APR`,
                  color: TextColor.Success,
                }}
                {...(!isEmptyBalance(token) && {
                  secondaryText: {
                    value: token.balanceFormatted,
                  },
                })}
              />
            )}
          </View>
        )
      );
    });
  };

  return (
    <BottomSheet ref={bottomSheetRef}>
      <BottomSheetHeader>
        <Text variant={TextVariant.HeadingSM}>
          {params?.onItemPressScreen === EARN_INPUT_VIEW_ACTIONS.WITHDRAW
            ? strings('stake.select_a_token_to_withdraw')
            : strings('stake.select_a_token_to_deposit')}
        </Text>
      </BottomSheetHeader>
      <ScrollView style={styles.container}>
        {earnTokens?.length &&
          params?.onItemPressScreen === EARN_INPUT_VIEW_ACTIONS.DEPOSIT && (
            <UpsellBanner
              primaryText={strings('stake.you_could_earn_up_to')}
              secondaryText={
                isNoEarnableTokensWithBalance
                  ? `${highestAvailableApr.toString()}%`
                  : `${earnableTotalFiatFormatted}`
              }
              tertiaryText={strings('stake.per_year_on_your_tokens')}
              variant={UPSELL_BANNER_VARIANTS.HEADER}
            />
          )}
        {earnTokens?.length ? (
          renderTokenListItems()
        ) : (
          <EarnTokenListSkeletonPlaceholder />
        )}
      </ScrollView>
    </BottomSheet>
  );
};

/**
 * Temporary wrapper to prevent rending if feature flags aren't enabled.
 * We can delete this wrapped once these feature flags are removed.
 */
const EarnTokenListWrapper = () => {
  const isStablecoinLendingEnabled = useSelector(
    selectStablecoinLendingEnabledFlag,
  );

  if (isStablecoinLendingEnabled && isPortfolioViewEnabled()) {
    return <EarnTokenList />;
  }

  return <></>;
};

export default EarnTokenListWrapper;
