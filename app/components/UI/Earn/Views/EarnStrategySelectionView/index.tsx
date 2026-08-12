import React, { useCallback, useState } from 'react';
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
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { TokenI } from '../../../Tokens/types';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { strings } from '../../../../../../locales/i18n';
import EarnStrategyCard, {
  EarnStrategyRiskLevel,
} from '../../components/EarnStrategyCard';
import EarnStrategyInfoRow from '../../components/EarnStrategyInfoRow';

export interface EarnStrategySelectionViewRouteParams {
  token: TokenI;
}

type EarnStrategySelectionRoute = RouteProp<
  { params: EarnStrategySelectionViewRouteParams },
  'params'
>;

// TODO: Add pooled-staking config when wiring up real asset data. We'll need a function that takes in an asset and returns the strategy configs for it.
const strategyConfigs = [
  {
    id: 'money',
    risk: EarnStrategyRiskLevel.Recommended,
    titleKey: 'earn.strategy_selection.strategies.money.title',
    subtitleKey: 'earn.strategy_selection.strategies.money.subtitle',
    tertiaryTextKey: 'earn.strategy_selection.strategies.money.tertiary_text',
  },
  {
    id: 'lending',
    risk: EarnStrategyRiskLevel.Medium,
    titleKey: 'earn.strategy_selection.strategies.lending.title',
    subtitleKey: 'earn.strategy_selection.strategies.lending.subtitle',
    tertiaryTextKey: 'earn.strategy_selection.strategies.lending.tertiary_text',
  },
] as const;

type StrategyId = 'money' | 'lending';

interface InfoRowConfig {
  id: string;
  icon: IconName;
  textKey: string;
}

const infoRowConfigs: Record<StrategyId, InfoRowConfig[]> = {
  money: [
    {
      id: '1',
      icon: IconName.Chart,
      textKey: 'earn.strategy_selection.info_rows.money_account.row_1',
    },
    {
      id: '2',
      icon: IconName.Lock,
      textKey: 'earn.strategy_selection.info_rows.money_account.row_2',
    },
    {
      id: '3',
      icon: IconName.SecurityTick,
      textKey: 'earn.strategy_selection.info_rows.money_account.row_3',
    },
  ],
  lending: [
    {
      id: '1',
      icon: IconName.Chart,
      textKey: 'earn.strategy_selection.info_rows.lending.row_1',
    },
    {
      id: '2',
      icon: IconName.Lock,
      textKey: 'earn.strategy_selection.info_rows.lending.row_2',
    },
    {
      id: '3',
      icon: IconName.SecurityTick,
      textKey: 'earn.strategy_selection.info_rows.lending.row_3',
    },
  ],
};

const EarnStrategySelectionView = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const { params } = useRoute<EarnStrategySelectionRoute>();
  const { token } = params;
  const tokenLabel = token.ticker ?? token.symbol ?? token.name ?? '';
  const [selectedStrategyId, setSelectedStrategyId] =
    useState<StrategyId>('money');

  const handleNoop = useCallback(() => undefined, []);
  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);
  const handleStrategyPress = useCallback((strategyId: StrategyId) => {
    setSelectedStrategyId(strategyId);
  }, []);
  const selectedInfoRows = infoRowConfigs[selectedStrategyId];

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={tw.style('flex-1 bg-default')}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="px-4 py-2"
      >
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          size={ButtonIconSize.Md}
          onPress={handleBackPress}
          accessibilityLabel={strings('navigation.back')}
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
            {/* TODO: Only render the "for free" portion of the subtitle if the strategy is "money" and the fee is paid by MetaMask */}
            {strings('earn.strategy_selection.subtitle', {
              asset: tokenLabel,
            })}
          </Text>

          <Box flexDirection={BoxFlexDirection.Row} gap={3} twClassName="mt-7">
            {strategyConfigs.map((strategy) => (
              <EarnStrategyCard
                key={strategy.id}
                risk={strategy.risk}
                title={strings(strategy.titleKey)}
                subtitle={strings(strategy.subtitleKey, {
                  asset: tokenLabel,
                })}
                tertiaryText={strings(strategy.tertiaryTextKey)}
                selected={selectedStrategyId === strategy.id}
                onPress={() => handleStrategyPress(strategy.id)}
              />
            ))}
          </Box>

          <Box gap={4} twClassName="mt-7">
            {selectedInfoRows.map((infoRow) => (
              <EarnStrategyInfoRow
                key={infoRow.id}
                text={strings(infoRow.textKey)}
                startAccessory={
                  <Box twClassName="h-8 w-8 items-center justify-center rounded-full bg-muted">
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
        </ScrollView>
      </Box>

      <Box gap={2} twClassName="px-4 pt-3 pb-3">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handleNoop}
        >
          {strings('earn.strategy_selection.get_started')}
        </Button>
        <Button
          variant={ButtonVariant.Tertiary}
          isFullWidth
          onPress={handleNoop}
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
