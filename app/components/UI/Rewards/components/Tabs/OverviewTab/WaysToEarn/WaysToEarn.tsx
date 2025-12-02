import React, { useCallback, useMemo } from 'react';
import { FlatList, Linking } from 'react-native';
import {
  Box,
  Text,
  ButtonBase,
  Icon,
  TextVariant,
  BoxFlexDirection,
  BoxAlignItems,
  TextColor,
  IconName,
  IconSize,
  IconColor,
  ButtonVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../../../locales/i18n';
import Routes from '../../../../../../../constants/navigation/Routes';
import { SwapSupportedNetworksSection } from './SwapSupportedNetworksSection';
import MetamaskRewardsPointsImage from '../../../../../../../images/rewards/metamask-rewards-points.svg';
import { ModalType } from '../../../../components/RewardsBottomSheetModal';
import {
  SwapBridgeNavigationLocation,
  useSwapBridgeNavigation,
} from '../../../../../Bridge/hooks/useSwapBridgeNavigation';
import { useRampNavigation } from '../../../../../Ramp/hooks/useRampNavigation';
import { toCaipAssetType } from '@metamask/utils';
import { useSelector } from 'react-redux';
import { selectIsFirstTimePerpsUser } from '../../../../../Perps/selectors/perpsController';
import {
  selectRewardsCardSpendFeatureFlags,
  selectRewardsMusdDepositEnabledFlag,
} from '../../../../../../../selectors/featureFlagController/rewards';
import {
  useFeatureFlag,
  FeatureFlagNames,
} from '../../../../../../hooks/useFeatureFlag';
import { PredictEventValues } from '../../../../../Predict/constants/eventNames';
import {
  MetaMetricsEvents,
  useMetrics,
} from '../../../../../../hooks/useMetrics';
import { RewardsMetricsButtons } from '../../../../utils';
import { NETWORKS_CHAIN_ID } from '../../../../../../../constants/network';
import { getDecimalChainId } from '../../../../../../../util/networks';

export enum WayToEarnType {
  SWAPS = 'swaps',
  PERPS = 'perps',
  REFERRALS = 'referrals',
  LOYALTY = 'loyalty',
  PREDICT = 'predict',
  CARD = 'card',
  DEPOSIT_MUSD = 'deposit_musd',
  HOLD_MUSD = 'hold_musd',
}

interface WayToEarn {
  type: WayToEarnType;
  title: string;
  description: string;
  icon: string;
}

const waysToEarn: WayToEarn[] = [
  {
    type: WayToEarnType.SWAPS,
    title: strings('rewards.ways_to_earn.swap.title'),
    description: strings('rewards.ways_to_earn.swap.description'),
    icon: IconName.SwapVertical,
  },
  {
    type: WayToEarnType.PERPS,
    title: strings('rewards.ways_to_earn.perps.title'),
    description: strings('rewards.ways_to_earn.perps.description'),
    icon: IconName.Candlestick,
  },
  {
    type: WayToEarnType.PREDICT,
    title: strings('rewards.ways_to_earn.predict.title'),
    description: strings('rewards.ways_to_earn.predict.description'),
    icon: IconName.Speedometer,
  },
  {
    type: WayToEarnType.REFERRALS,
    title: strings('rewards.ways_to_earn.referrals.title'),
    description: strings('rewards.ways_to_earn.referrals.description'),
    icon: IconName.UserCircleAdd,
  },
  {
    type: WayToEarnType.LOYALTY,
    title: strings('rewards.ways_to_earn.loyalty.title'),
    description: strings('rewards.ways_to_earn.loyalty.description'),
    icon: IconName.Gift,
  },
  {
    type: WayToEarnType.CARD,
    title: strings('rewards.ways_to_earn.card.title'),
    description: strings('rewards.ways_to_earn.card.description'),
    icon: IconName.Card,
  },
  {
    type: WayToEarnType.DEPOSIT_MUSD,
    title: strings('rewards.ways_to_earn.deposit_musd.title'),
    description: strings('rewards.ways_to_earn.deposit_musd.description'),
    icon: IconName.Coin,
  },
  {
    type: WayToEarnType.HOLD_MUSD,
    title: strings('rewards.ways_to_earn.hold_musd.title'),
    description: strings('rewards.ways_to_earn.hold_musd.description'),
    icon: IconName.Coin,
  },
];

const Separator = () => <Box twClassName="border-b border-muted" />;

const WaysToEarnSheetTitle = ({
  title,
  points,
}: {
  title: string;
  points: string;
}) => (
  <>
    <Text variant={TextVariant.HeadingLg}>{title}</Text>
    <Box
      flexDirection={BoxFlexDirection.Row}
      twClassName="bg-muted px-2 mt-2 py-1 rounded-md gap-1"
      alignItems={BoxAlignItems.Center}
    >
      <MetamaskRewardsPointsImage
        width={16}
        height={16}
        name="MetamaskRewardsPoints"
      />
      <Text variant={TextVariant.BodySm}>{points}</Text>
    </Box>
  </>
);

const getBottomSheetData = (type: WayToEarnType) => {
  switch (type) {
    case WayToEarnType.SWAPS:
      return {
        title: (
          <WaysToEarnSheetTitle
            title={strings('rewards.ways_to_earn.swap.sheet.title')}
            points={strings('rewards.ways_to_earn.swap.sheet.points')}
          />
        ),
        description: (
          <Box twClassName="flex flex-col gap-8">
            <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
              {strings('rewards.ways_to_earn.swap.sheet.description')}
            </Text>
            <SwapSupportedNetworksSection />
          </Box>
        ),
        ctaLabel: strings('rewards.ways_to_earn.swap.sheet.cta_label'),
      };
    case WayToEarnType.PERPS:
      return {
        title: (
          <WaysToEarnSheetTitle
            title={strings('rewards.ways_to_earn.perps.sheet.title')}
            points={strings('rewards.ways_to_earn.perps.sheet.points')}
          />
        ),
        description: (
          <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
            {strings('rewards.ways_to_earn.perps.sheet.description')}
          </Text>
        ),
        ctaLabel: strings('rewards.ways_to_earn.perps.sheet.cta_label'),
      };
    case WayToEarnType.LOYALTY:
      return {
        title: (
          <WaysToEarnSheetTitle
            title={strings('rewards.ways_to_earn.loyalty.sheet.title')}
            points={strings('rewards.ways_to_earn.loyalty.sheet.points')}
          />
        ),
        description: (
          <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
            {strings('rewards.ways_to_earn.loyalty.sheet.description')}
          </Text>
        ),
        ctaLabel: strings('rewards.ways_to_earn.loyalty.sheet.cta_label'),
      };
    case WayToEarnType.PREDICT:
      return {
        title: (
          <WaysToEarnSheetTitle
            title={strings('rewards.ways_to_earn.predict.sheet.title')}
            points={strings('rewards.ways_to_earn.predict.sheet.points')}
          />
        ),
        description: (
          <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
            {strings('rewards.ways_to_earn.predict.sheet.description')}
          </Text>
        ),
        ctaLabel: strings('rewards.ways_to_earn.predict.sheet.cta_label'),
      };
    case WayToEarnType.CARD:
      return {
        title: (
          <WaysToEarnSheetTitle
            title={strings('rewards.ways_to_earn.card.sheet.title')}
            points={strings('rewards.ways_to_earn.card.sheet.points')}
          />
        ),
        description: (
          <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
            {strings('rewards.ways_to_earn.card.sheet.description')}
          </Text>
        ),
        ctaLabel: strings('rewards.ways_to_earn.card.sheet.cta_label'),
      };
    case WayToEarnType.DEPOSIT_MUSD:
      return {
        title: (
          <WaysToEarnSheetTitle
            title={strings('rewards.ways_to_earn.deposit_musd.sheet.title')}
            points={strings('rewards.ways_to_earn.deposit_musd.sheet.points')}
          />
        ),
        description: (
          <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
            {strings('rewards.ways_to_earn.deposit_musd.sheet.description')}
          </Text>
        ),
        ctaLabel: strings('rewards.ways_to_earn.deposit_musd.sheet.cta_label'),
      };
    case WayToEarnType.HOLD_MUSD:
      return {
        title: (
          <WaysToEarnSheetTitle
            title={strings('rewards.ways_to_earn.hold_musd.sheet.title')}
            points={strings('rewards.ways_to_earn.hold_musd.sheet.points')}
          />
        ),
        description: (
          <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
            {strings('rewards.ways_to_earn.hold_musd.sheet.description')}
          </Text>
        ),
        ctaLabel: strings('rewards.ways_to_earn.hold_musd.sheet.cta_label'),
      };
    default:
      throw new Error(`Unknown earning way type: ${type}`);
  }
};

export const WaysToEarn = () => {
  const navigation = useNavigation();
  const isFirstTimePerpsUser = useSelector(selectIsFirstTimePerpsUser);
  const isCardSpendEnabled = useSelector(selectRewardsCardSpendFeatureFlags);
  const isPredictEnabled = useFeatureFlag(
    FeatureFlagNames.predictTradingEnabled,
  );
  const isMusdDepositEnabled = useSelector(selectRewardsMusdDepositEnabledFlag);
  const isMusdHoldingEnabled = useFeatureFlag(
    FeatureFlagNames.rewardsEnableMusdHolding,
  );
  const { trackEvent, createEventBuilder } = useMetrics();

  // Use the swap/bridge navigation hook
  const { goToSwaps } = useSwapBridgeNavigation({
    location: SwapBridgeNavigationLocation.Rewards,
    sourcePage: 'rewards_overview',
  });

  // Create CAIP-19 assetId for mUSD to use with buy page
  const musdAssetId = useMemo(() => {
    const chainId = NETWORKS_CHAIN_ID.LINEA_MAINNET;
    const address = '0xaca92e438df0b2401ff60da7e4337b687a2435da';
    const decimalChainId = getDecimalChainId(chainId);
    return toCaipAssetType('eip155', decimalChainId, 'erc20', address);
  }, []);

  const { goToBuy } = useRampNavigation();

  const goToPerps = useCallback(() => {
    if (isFirstTimePerpsUser) {
      navigation.navigate(Routes.PERPS.TUTORIAL);
    } else {
      navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.PERPS_HOME,
      });
    }
  }, [navigation, isFirstTimePerpsUser]);

  const handleCTAPress = async (type: WayToEarnType) => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.REWARDS_WAYS_TO_EARN_CTA_CLICKED)
        .addProperties({
          ways_to_earn_type: type,
        })
        .build(),
    );
    navigation.goBack(); // Close the modal first
    switch (type) {
      case WayToEarnType.SWAPS:
        goToSwaps();
        break;
      case WayToEarnType.PERPS:
        goToPerps();
        break;
      case WayToEarnType.LOYALTY:
        navigation.navigate(Routes.REWARDS_SETTINGS_VIEW);
        break;
      case WayToEarnType.PREDICT:
        navigation.navigate(Routes.PREDICT.ROOT, {
          screen: Routes.PREDICT.MARKET_LIST,
          params: {
            entryPoint: PredictEventValues.ENTRY_POINT.REWARDS,
          },
        });
        break;
      case WayToEarnType.CARD:
        navigation.navigate(Routes.CARD.ROOT);
        break;
      case WayToEarnType.DEPOSIT_MUSD:
        Linking.openURL('https://go.metamask.io/turtle-musd');
        break;
      case WayToEarnType.HOLD_MUSD:
        goToBuy({ assetId: musdAssetId });
        break;
    }
  };

  const handleEarningWayPress = (wayToEarn: WayToEarn) => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.REWARDS_PAGE_BUTTON_CLICKED)
        .addProperties({
          button_type: RewardsMetricsButtons.WAYS_TO_EARN,
          ways_to_earn_type: wayToEarn.type,
        })
        .build(),
    );
    switch (wayToEarn.type) {
      case WayToEarnType.SWAPS:
      case WayToEarnType.LOYALTY:
      case WayToEarnType.PERPS:
      case WayToEarnType.PREDICT:
      case WayToEarnType.CARD:
      case WayToEarnType.DEPOSIT_MUSD:
      case WayToEarnType.HOLD_MUSD: {
        const { title, description, ctaLabel } = getBottomSheetData(
          wayToEarn.type,
        );
        navigation.navigate(Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL, {
          title,
          description,
          showIcon: false,
          type: ModalType.Confirmation,
          confirmAction: {
            label: ctaLabel,
            onPress: () => {
              handleCTAPress(wayToEarn.type);
            },
            variant: ButtonVariant.Primary,
          },
          showCancelButton: false,
        });
        break;
      }
      case WayToEarnType.REFERRALS: {
        navigation.navigate(Routes.MODAL.REWARDS_REFERRAL_BOTTOM_SHEET_MODAL);
        break;
      }
    }
  };

  return (
    <Box twClassName="p-4">
      <Text variant={TextVariant.HeadingMd} twClassName="mb-4">
        {strings('rewards.ways_to_earn.title')}
      </Text>

      <Box twClassName="rounded-xl bg-muted">
        <FlatList
          horizontal={false}
          data={waysToEarn.filter((wte) => {
            if (wte.type === WayToEarnType.CARD && !isCardSpendEnabled) {
              return false;
            }
            if (wte.type === WayToEarnType.PREDICT && !isPredictEnabled) {
              return false;
            }
            if (
              wte.type === WayToEarnType.DEPOSIT_MUSD &&
              !isMusdDepositEnabled
            ) {
              return false;
            }
            if (wte.type === WayToEarnType.HOLD_MUSD && !isMusdHoldingEnabled) {
              return false;
            }
            return true;
          })}
          keyExtractor={(wayToEarn) => wayToEarn.title}
          ItemSeparatorComponent={Separator}
          scrollEnabled={false}
          renderItem={({ item: wayToEarn }) => (
            <ButtonBase
              twClassName="h-auto px-4 py-3 bg-inherit"
              onPress={() => handleEarningWayPress(wayToEarn)}
            >
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                twClassName="flex-1"
              >
                <Box twClassName="mr-3 h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Icon
                    color={IconColor.IconAlternative}
                    name={wayToEarn.icon as IconName}
                    size={IconSize.Lg}
                  />
                </Box>

                <Box>
                  <Text
                    variant={TextVariant.BodyMd}
                    fontWeight={FontWeight.Medium}
                  >
                    {wayToEarn.title}
                  </Text>
                  <Text
                    variant={TextVariant.BodySm}
                    fontWeight={FontWeight.Medium}
                    color={TextColor.TextAlternative}
                  >
                    {wayToEarn.description}
                  </Text>
                </Box>
              </Box>
            </ButtonBase>
          )}
        />
      </Box>
    </Box>
  );
};
