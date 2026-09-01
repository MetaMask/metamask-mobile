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
import useEarnOpportunityNavigation from '../../hooks/useEarnOpportunityNavigation';
import { EarnStrategySelectionModalTestIds } from './EarnStrategySelectionModal.testIds';

export interface EarnStrategySelectionModalRouteParams {
  earnAsset: EarnAsset;
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
    {
      percentage: truncateNumber(strategy.rate.percentage),
      asset: assetSymbol,
    },
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
  const [isNavigatingToDeposit, setIsNavigatingToDeposit] = useState(false);
  const { showToast, EarnToastOptions } = useEarnToasts();
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const { params } = useRoute<EarnStrategySelectionModalRoute>();
  const { earnAsset } = params;

  const [selectedStrategyId, setSelectedStrategyId] = useState<string>();
  const { navigateToDepositForExperience } = useEarnOpportunityNavigation();

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
    setIsNavigatingToDeposit(true);

    if (!selectedStrategy || !earnAsset) {
      handleGetStartedAfterClose();
      return;
    }

    sheetRef.current?.onCloseBottomSheet(handleGetStartedAfterClose);
  }, [earnAsset, handleGetStartedAfterClose, selectedStrategy]);

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
      goBack={navigation.goBack}
      isInteractable
      testID={EarnStrategySelectionModalTestIds.MODAL}
      twClassName="flex-1"
    >
      <BottomSheetHeader
        onClose={handleClose}
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
