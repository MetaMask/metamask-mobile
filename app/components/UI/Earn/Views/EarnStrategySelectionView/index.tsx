import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Icon,
  IconColor,
  IconSize,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { Hex } from '@metamask/utils';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import Engine from '../../../../../core/Engine';
import {
  LENDING_FAQ_URL,
  MONEY_LANDING_URL,
  POOLED_STAKING_FAQ_URL,
  TRON_STAKING_FAQ_URL,
} from '../../../../../constants/urls';
import { strings } from '../../../../../../locales/i18n';
import EarnStrategyCard from '../../components/EarnStrategyCard';
import EarnStrategyInfoRow from '../../components/EarnStrategyInfoRow';
import { EARN_EXPERIENCES } from '../../constants/experiences';
import useEarnAssetStrategies from '../../hooks/useEarnAssetStrategies';
import { useStablecoinLendingRedirect } from '../../hooks/useStablecoinLendingRedirect';
import useStakingChain from '../../../Stake/hooks/useStakingChain';
import { useMoneyAccountDeposit } from '../../../Money/hooks/useMoneyAccount';
import type { EarnAssetId, EarnExperienceType } from '../../types/earnAssets';
import { earnAssetToToken, getEarnAssetMetadata } from '../../utils/earnAssets';

export interface EarnStrategySelectionViewRouteParams {
  assetId: EarnAssetId;
}

type EarnStrategySelectionRoute = RouteProp<
  { params: EarnStrategySelectionViewRouteParams },
  'params'
>;

const FAQ_URL_BY_EXPERIENCE: Record<EarnExperienceType, string> = {
  MONEY_ACCOUNT_DEPOSIT: MONEY_LANDING_URL,
  [EARN_EXPERIENCES.POOLED_STAKING]: POOLED_STAKING_FAQ_URL,
  [EARN_EXPERIENCES.STABLECOIN_LENDING]: LENDING_FAQ_URL,
  [EARN_EXPERIENCES.TRX_STAKING]: TRON_STAKING_FAQ_URL,
};

const EarnStrategySelectionView = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const { params } = useRoute<EarnStrategySelectionRoute>();
  const { assetId } = params;
  const {
    asset: earnAsset,
    strategies,
    isLoading,
    hasError,
  } = useEarnAssetStrategies(assetId);
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>();
  const { isStakingSupportedChain } = useStakingChain();
  const { initiateDeposit } = useMoneyAccountDeposit();
  const token = useMemo(
    () => (earnAsset ? earnAssetToToken(earnAsset) : undefined),
    [earnAsset],
  );
  const tokenMetadata = useMemo(
    () => (earnAsset ? getEarnAssetMetadata(earnAsset) : undefined),
    [earnAsset],
  );
  const handleLendingRedirect = useStablecoinLendingRedirect({ asset: token });

  useEffect(() => {
    if (
      strategies.length > 0 &&
      !strategies.some(({ id }) => id === selectedStrategyId)
    ) {
      setSelectedStrategyId(strategies[0].id);
    }
  }, [selectedStrategyId, strategies]);

  const selectedStrategy = useMemo(
    () => strategies.find(({ id }) => id === selectedStrategyId),
    [selectedStrategyId, strategies],
  );
  const tokenLabel =
    tokenMetadata?.ticker ?? tokenMetadata?.symbol ?? tokenMetadata?.name ?? '';

  const handleGetStartedPress = useCallback(async () => {
    if (!selectedStrategy || !earnAsset) return;

    const experienceType = selectedStrategy.experience.type;

    if (experienceType === 'MONEY_ACCOUNT_DEPOSIT') {
      if (earnAsset.kind !== 'held' || !('address' in earnAsset.asset)) {
        throw new Error(
          'Money deposit requires a held asset with address property',
        );
      }

      await initiateDeposit({
        preferredPaymentToken: {
          address: earnAsset.asset.address as Hex,
          chainId: earnAsset.asset.chainId as Hex,
        },
        intent: 'convert',
      });
      return;
    }

    if (experienceType === EARN_EXPERIENCES.STABLECOIN_LENDING) {
      await handleLendingRedirect();
      return;
    }

    if (
      experienceType === EARN_EXPERIENCES.POOLED_STAKING &&
      !isStakingSupportedChain
    ) {
      await Engine.context.MultichainNetworkController.setActiveNetwork(
        'mainnet',
      );
    }

    if (!token) {
      throw new Error('Earn strategy asset metadata is unavailable');
    }

    navigation.navigate('StakeScreens', {
      screen: Routes.STAKING.STAKE,
      params: {
        token,
      },
    });
  }, [
    earnAsset,
    handleLendingRedirect,
    initiateDeposit,
    isStakingSupportedChain,
    navigation,
    selectedStrategy,
    token,
  ]);

  const handleLearnMorePress = useCallback(() => {
    if (!selectedStrategy) return;

    navigation.navigate(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
      params: {
        newTabUrl: FAQ_URL_BY_EXPERIENCE[selectedStrategy.experience.type],
        timestamp: Date.now(),
        fromEarnStrategySelection: true,
      },
    });
  }, [navigation, selectedStrategy]);

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);
  const handleStrategyPress = useCallback((strategyId: string) => {
    setSelectedStrategyId(strategyId);
  }, []);

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={tw.style('flex-1 bg-default')}
      testID="earn-strategy-selection-view"
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="px-4 py-2"
      >
        <ButtonIcon
          iconName="ArrowLeft"
          size={ButtonIconSize.Md}
          onPress={handleBackPress}
          accessibilityLabel={strings('navigation.back')}
          testID="earn-strategy-selection-back-button"
        />
      </Box>

      <Box twClassName="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={tw.style('px-4 pb-6')}
        >
          <Text
            variant={TextVariant.HeadingLg}
            color={TextColor.TextDefault}
            twClassName="mt-6"
          >
            {strings('earn.strategy_selection.title')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="mt-2"
          >
            {strings('earn.strategy_selection.subtitle', {
              asset: tokenLabel,
            })}
          </Text>

          {isLoading ? (
            <Box
              flexDirection={BoxFlexDirection.Row}
              gap={3}
              twClassName="mt-7"
              testID="earn-strategy-selection-loading"
            >
              <Skeleton height={170} twClassName="flex-1 rounded-2xl" />
              <Skeleton height={170} twClassName="flex-1 rounded-2xl" />
            </Box>
          ) : !earnAsset ? (
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.ErrorDefault}
              twClassName="mt-7"
              testID="earn-strategy-selection-error"
            >
              {strings('earn_module.asset_unavailable')}
            </Text>
          ) : (
            <>
              {hasError && (
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.ErrorDefault}
                  twClassName="mt-7"
                  testID="earn-strategy-selection-degraded"
                >
                  {strings('earn_module.rate_unavailable')}
                </Text>
              )}
              <Box
                flexDirection={BoxFlexDirection.Row}
                gap={3}
                twClassName="mt-7"
              >
                {strategies.map((strategy) => (
                  <EarnStrategyCard
                    key={strategy.id}
                    risk={strategy.risk}
                    title={strategy.title}
                    subtitle={strategy.subtitle}
                    tertiaryText={strategy.tertiaryText}
                    isFeeSubsidized={strategy.experience.isFeeSubsidized}
                    selected={selectedStrategyId === strategy.id}
                    onPress={() => handleStrategyPress(strategy.id)}
                    testID={`earn-strategy-card-${strategy.id}`}
                  />
                ))}
              </Box>
            </>
          )}

          {selectedStrategy && (
            <Box gap={4} twClassName="mt-7">
              {selectedStrategy.infoRows.map((infoRow) => (
                <EarnStrategyInfoRow
                  key={infoRow.id}
                  text={infoRow.text}
                  startAccessory={
                    <Box
                      twClassName="h-8 w-8 items-center justify-center rounded-full bg-muted"
                      accessible={false}
                    >
                      <Icon
                        name={infoRow.icon}
                        size={IconSize.Sm}
                        color={IconColor.SuccessDefault}
                      />
                    </Box>
                  }
                />
              ))}
            </Box>
          )}
        </ScrollView>
      </Box>

      <Box gap={2} twClassName="px-4 pt-3 pb-3">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          isDisabled={!selectedStrategy}
          onPress={handleGetStartedPress}
          testID="earn-strategy-selection-get-started-button"
        >
          {strings('earn.strategy_selection.get_started')}
        </Button>
        <Button
          variant={ButtonVariant.Tertiary}
          isFullWidth
          isDisabled={!selectedStrategy}
          onPress={handleLearnMorePress}
          testID="earn-strategy-selection-learn-more-button"
        >
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {strings('earn.strategy_selection.learn_more')}
          </Text>
        </Button>
      </Box>
    </SafeAreaView>
  );
};

export default EarnStrategySelectionView;
