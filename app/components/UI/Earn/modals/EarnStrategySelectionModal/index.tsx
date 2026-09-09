import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  BottomSheet,
  BottomSheetHeader,
  BottomSheetRef,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  IconName,
} from '@metamask/design-system-react-native';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { ScrollView } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { strings } from '../../../../../../locales/i18n';
import EarnStrategyCard, {
  EarnStrategyCardVariant,
} from '../../components/EarnStrategyCard';
import type {
  MoneyAccountDepositExperience,
  NonMoneyAccountExperience,
} from '../../components/EarnStrategyCard/EarnStrategyCard.types';
import { EARN_EXPERIENCES } from '../../constants/experiences';
import type { TokenI } from '../../../Tokens/types';
import type { EarnAsset } from '../../types/earnAssets';
import Logger from '../../../../../util/Logger';
import useEarnToasts from '../../hooks/useEarnToasts';
import {
  isMoneyAccountDepositExperience,
  isNonMoneyAccountExperience,
  truncateNumber,
} from '../../utils';
import useEarnOpportunityNavigation, {
  getEarnExperienceRedirectTarget,
} from '../../hooks/useEarnOpportunityNavigation';
import { useEarnAnalytics } from '../../hooks/useEarnAnalytics';
import useMountEffect from '../../../Money/hooks/useMountEffect';
import { useMoneyNavigation } from '../../../Money/hooks/useMoneyNavigation';
import {
  EARN_MODULE_BUTTON_INTENTS,
  EARN_MODULE_BUTTON_TYPES,
  EARN_MODULE_ENTRY_POINTS,
  EARN_MODULE_BOTTOM_SHEET_NAMES,
  EARN_MODULE_STRATEGY_TYPES,
  EARN_MODULE_COMPONENT_NAMES,
} from '../../constants/earnModuleEvents';
import { getEarnModuleAssetProperties } from '../../utils/earnModuleAnalytics';
import type { EarnModuleNavigationContext } from '../../types/earnModuleEvents.types';
import { EarnStrategySelectionModalTestIds } from './EarnStrategySelectionModal.testIds';

export interface EarnStrategySelectionModalRouteParams {
  earnAsset: EarnAsset;
  analyticsContext?: EarnModuleNavigationContext;
}

type EarnStrategySelectionModalRoute = RouteProp<
  { params: EarnStrategySelectionModalRouteParams },
  'params'
>;

/**
 * Returns the token required to start a staking strategy.
 *
 * @param token - Token representation for the selected Earn asset.
 * @returns Token representation for the staking flow.
 * @throws When token metadata is unavailable.
 */
export const requireEarnStrategyToken = (token?: TokenI): TokenI => {
  if (!token) {
    throw new Error('Earn strategy asset metadata is unavailable');
  }

  return token;
};

interface StrategyCardRenderContext {
  earnAsset: EarnAsset;
  selectedStrategyId?: string;
  onStrategyPress: (strategyId: string) => void;
}

const renderMoneyStrategyCard = (
  strategy: MoneyAccountDepositExperience,
  { selectedStrategyId, onStrategyPress }: StrategyCardRenderContext,
) => {
  const row1Text =
    strategy.rate.status === 'ready'
      ? strings('earn.strategy_selection.strategies.money.info_rows.row_1', {
          percentage: truncateNumber(strategy.rate.percentage),
        })
      : strings('earn.strategy_selection.strategies.rate_unavailable_subtitle');

  const infoRows = [
    {
      id: 'row_1',
      text: row1Text,
      icon: IconName.Diagram,
    },
    {
      id: 'row_2',
      text: strings('earn.strategy_selection.strategies.money.info_rows.row_2'),
      icon: IconName.Tint,
    },
    {
      id: 'row_3',
      text: strings('earn.strategy_selection.strategies.money.info_rows.row_3'),
      icon: IconName.SecurityTick,
    },
  ];

  return (
    <EarnStrategyCard
      key={strategy.id}
      variant={EarnStrategyCardVariant.Primary}
      experience={strategy}
      title={strings('earn.strategy_selection.strategies.money.title')}
      infoRows={infoRows}
      isActive={selectedStrategyId === strategy.id}
      onPress={() => onStrategyPress(strategy.id)}
      testID={EarnStrategySelectionModalTestIds.STRATEGY_CARD(strategy.id)}
    />
  );
};

const renderNonMoneyStrategyCard = (
  strategy: NonMoneyAccountExperience,
  { earnAsset, selectedStrategyId, onStrategyPress }: StrategyCardRenderContext,
) => {
  if (strategy.rate.status !== 'ready' || earnAsset.kind !== 'held') {
    return null;
  }

  const assetSymbol =
    strategy.type === EARN_EXPERIENCES.STABLECOIN_LENDING
      ? earnAsset.asset.symbol
      : undefined;

  const title = strings(
    `earn.strategy_selection.strategies.${strategy.type.toLowerCase()}.title`,
    { asset: assetSymbol },
  );
  const subtitle = strings(
    `earn.strategy_selection.strategies.${strategy.type.toLowerCase()}.subtitle`,
    { percentage: truncateNumber(strategy.rate.percentage) },
  );

  return (
    <EarnStrategyCard
      key={strategy.id}
      variant={EarnStrategyCardVariant.Secondary}
      experience={strategy}
      title={title}
      subtitle={subtitle}
      isActive={selectedStrategyId === strategy.id}
      onPress={() => onStrategyPress(strategy.id)}
      testID={EarnStrategySelectionModalTestIds.STRATEGY_CARD(strategy.id)}
    />
  );
};

const EarnStrategySelectionModal = () => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const isNavigatingToDepositRef = useRef(false);
  const [isNavigatingToDeposit, setIsNavigatingToDeposit] = useState(false);
  const { showToast, EarnToastOptions } = useEarnToasts();
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const { params } = useRoute<EarnStrategySelectionModalRoute>();
  const { earnAsset } = params;
  const { isOnboardingRedirectNeeded } = useMoneyNavigation();

  const [selectedStrategyId, setSelectedStrategyId] = useState<string>();
  const { navigateToDepositForExperience } = useEarnOpportunityNavigation();
  const { trackBottomSheetViewed, trackButtonClicked, trackSurfaceClicked } =
    useEarnAnalytics({
      bottom_sheet_name:
        EARN_MODULE_BOTTOM_SHEET_NAMES.STRATEGY_SELECTION_MODAL,
      entry_point:
        params.analyticsContext?.entry_point ??
        EARN_MODULE_ENTRY_POINTS.EARN_SECTION_LIST,
      screen_name: params.analyticsContext?.screen_name,
    });

  useMountEffect(trackBottomSheetViewed);

  const strategies = earnAsset.experiences;

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

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleGoBack = useCallback(() => {
    /**
     * Get Started also closes the bottom sheet before navigating to deposit.
     * Track only user-initiated non-deposit dismissals as close events.
     */
    if (!isNavigatingToDepositRef.current) {
      trackSurfaceClicked({
        component_name:
          EARN_MODULE_COMPONENT_NAMES.EARN_STRATEGY_SELECTION_MODAL_CLOSE_ICON,
      });
    }
    navigation.goBack();
  }, [navigation, trackSurfaceClicked]);

  const handleGetStartedAfterClose = useCallback(async () => {
    try {
      if (!selectedStrategy || !earnAsset) {
        throw new Error('Selected strategy or earn asset is not available');
      }

      await navigateToDepositForExperience(earnAsset, selectedStrategy);
    } catch (error) {
      showToast(EarnToastOptions.earnStrategySelection.navigationToDeposit);
      Logger.error(
        error as Error,
        '[Earn Strategy Selection Modal] Failed to navigate to deposit screen for earn asset',
      );
    } finally {
      setIsNavigatingToDeposit(false);
    }
  }, [
    earnAsset,
    navigateToDepositForExperience,
    selectedStrategy,
    showToast,
    EarnToastOptions.earnStrategySelection.navigationToDeposit,
  ]);

  const handleGetStartedPress = useCallback(() => {
    if (!selectedStrategy || !earnAsset) {
      handleGetStartedAfterClose();
      return;
    }

    const selectedStrategyIndex = strategies.findIndex(
      ({ id }) => id === selectedStrategy.id,
    );
    const selectedStrategyType =
      selectedStrategy.type as EARN_MODULE_STRATEGY_TYPES;

    trackButtonClicked({
      button_type: EARN_MODULE_BUTTON_TYPES.TEXT,
      button_intent: EARN_MODULE_BUTTON_INTENTS.DEPOSIT,
      label_key: 'earn.strategy_selection.get_started',
      ...getEarnModuleAssetProperties(
        earnAsset,
        params.analyticsContext?.asset_position,
        params.analyticsContext?.assets_in_list,
      ),
      selected_strategy_type:
        selectedStrategyType.toLowerCase() as Lowercase<EARN_MODULE_STRATEGY_TYPES>,
      selected_strategy_position: selectedStrategyIndex + 1,
      rate_type: selectedStrategy.rate.type.toLowerCase() as Lowercase<
        'apr' | 'apy'
      >,
      ...(selectedStrategy.rate.status === 'ready'
        ? {
            selected_strategy_rate_percentage: Number(
              truncateNumber(selectedStrategy.rate.percentage),
            ),
          }
        : {}),
      is_fee_subsidized: selectedStrategy.isFeeSubsidized,
      redirect_target: getEarnExperienceRedirectTarget(
        selectedStrategy,
        isOnboardingRedirectNeeded,
      ),
    });
    isNavigatingToDepositRef.current = true;
    setIsNavigatingToDeposit(true);
    sheetRef.current?.onCloseBottomSheet(handleGetStartedAfterClose);
  }, [
    earnAsset,
    handleGetStartedAfterClose,
    isOnboardingRedirectNeeded,
    params.analyticsContext?.asset_position,
    params.analyticsContext?.assets_in_list,
    selectedStrategy,
    strategies,
    trackButtonClicked,
  ]);

  const handleStrategyPress = useCallback((strategyId: string) => {
    setSelectedStrategyId(strategyId);
  }, []);

  const strategyContent = (
    <Box gap={4} twClassName="mt-1">
      {strategies.map((strategy) => {
        if (isMoneyAccountDepositExperience(strategy)) {
          return renderMoneyStrategyCard(strategy, {
            earnAsset,
            selectedStrategyId,
            onStrategyPress: handleStrategyPress,
          });
        }

        if (!isNonMoneyAccountExperience(strategy)) {
          throw new Error(`Unsupported Earn experience: ${strategy.type}`);
        }

        return renderNonMoneyStrategyCard(strategy, {
          earnAsset,
          selectedStrategyId,
          onStrategyPress: handleStrategyPress,
        });
      })}
    </Box>
  );

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={handleGoBack}
      isInteractable
      testID={EarnStrategySelectionModalTestIds.MODAL}
      twClassName="flex-1"
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{
          testID: EarnStrategySelectionModalTestIds.CLOSE_BUTTON,
        }}
        testID={EarnStrategySelectionModalTestIds.MODAL_HEADER}
      >
        {strings('earn.strategy_selection.title')}
      </BottomSheetHeader>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw.style('px-4 pb-6')}
      >
        {strategyContent}
      </ScrollView>

      <Box twClassName="px-4 pt-3 pb-3">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          isDisabled={!selectedStrategy || isNavigatingToDeposit}
          isLoading={isNavigatingToDeposit}
          onPress={handleGetStartedPress}
          testID={EarnStrategySelectionModalTestIds.GET_STARTED_BUTTON}
        >
          {strings('earn.strategy_selection.get_started')}
        </Button>
      </Box>
    </BottomSheet>
  );
};

export default EarnStrategySelectionModal;
