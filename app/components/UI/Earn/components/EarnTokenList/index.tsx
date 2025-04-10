import React, { useRef, useCallback } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import {
  EVENT_LOCATIONS,
  EVENT_PROVIDERS,
} from '../../../Stake/constants/events';
import { strings } from '../../../../../../locales/i18n';
import UpsellBanner from '../../../Stake/components/UpsellBanner';
import { UPSELL_BANNER_VARIANTS } from '../../../Stake/components/UpsellBanner/UpsellBanner.types';
import { isStablecoinLendingFeatureEnabled } from '../../../Stake/constants';
import EarnTokenListItem from '../EarnTokenListItem';
import Engine from '../../../../../core/Engine';
import { EARN_INPUT_VIEW_ACTIONS } from '../../../Earn/Views/EarnInputView/EarnInputView.types';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import useEarnTokens from '../../hooks/useEarnTokens';

const isEmptyBalance = (token: { balanceFormatted: string }) =>
  parseFloat(token?.balanceFormatted) === 0;

// Temporary: Will be replaced by actual API call in near future.
const MOCK_ESTIMATE_REWARDS = '$454';

const EarnTokenListSkeletonPlaceholder = () => (
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
);

const EarnTokenList = () => {
  const { createEventBuilder, trackEvent } = useMetrics();
  const { styles } = useStyles(styleSheet, {});
  const { navigate } = useNavigation();
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  const supportedStablecoins = useEarnTokens();

  const closeBottomSheetAndNavigate = useCallback(
    (navigateFunc: () => void) => {
      bottomSheetRef.current?.onCloseBottomSheet(navigateFunc);
    },
    [],
  );

  const handleRedirectToInputScreen = async (token: TokenI) => {
    const { NetworkController } = Engine.context;

    const networkClientId = NetworkController.findNetworkClientIdByChainId(
      token.chainId as Hex,
    );

    if (!networkClientId) {
      console.error(
        `EarnTokenListItem redirect failed: could not retrieve networkClientId for chainId: ${token.chainId}`,
      );
      return;
    }

    await Engine.context.NetworkController.setActiveNetwork(networkClientId);

    const action = token.isETH
      ? EARN_INPUT_VIEW_ACTIONS.STAKE
      : EARN_INPUT_VIEW_ACTIONS.LEND;

    closeBottomSheetAndNavigate(() => {
      navigate('StakeScreens', {
        screen: Routes.STAKING.STAKE,
        params: { token, action },
      });
    });

    trackEvent(
      createEventBuilder(MetaMetricsEvents.EARN_TOKEN_LIST_ITEM_CLICKED)
        .addProperties({
          provider: EVENT_PROVIDERS.CONSENSYS,
          location: EVENT_LOCATIONS.WALLET_ACTIONS_BOTTOM_SHEET,
          token_name: token.name,
          token_symbol: token.symbol,
          token_chain_id: getDecimalChainId(token.chainId),
          action,
        })
        .build(),
    );
  };

  return (
    <BottomSheet ref={bottomSheetRef}>
      <BottomSheetHeader>
        <Text variant={TextVariant.HeadingSM}>
          {strings('stake.select_a_token')}
        </Text>
      </BottomSheetHeader>
      <ScrollView style={styles.container}>
        {supportedStablecoins?.length ? (
          <>
            <UpsellBanner
              primaryText={strings('stake.you_could_earn')}
              secondaryText={MOCK_ESTIMATE_REWARDS}
              tertiaryText={strings('stake.per_year_on_your_tokens')}
              variant={UPSELL_BANNER_VARIANTS.HEADER}
            />
            {supportedStablecoins?.map(
              (token, index) =>
                token?.chainId && (
                  <View
                    style={styles.listItemContainer}
                    key={`${token.name}-${token.symbol}-${index}`}
                  >
                    <EarnTokenListItem
                      token={token}
                      onPress={handleRedirectToInputScreen}
                      primaryText={{
                        value: `${token.apr}% APR`,
                        color: TextColor.Success,
                      }}
                      {...(!isEmptyBalance(token) && {
                        secondaryText: {
                          value: token.balanceFormatted,
                        },
                      })}
                    />
                  </View>
                ),
            )}
          </>
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
  if (isStablecoinLendingFeatureEnabled() && isPortfolioViewEnabled()) {
    return <EarnTokenList />;
  }

  return <></>;
};

export default EarnTokenListWrapper;
