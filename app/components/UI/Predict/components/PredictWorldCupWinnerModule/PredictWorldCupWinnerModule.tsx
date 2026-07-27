import React, { useCallback } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { usePredictActionGuard } from '../../hooks/usePredictActionGuard';
import { usePredictPreviewSheet } from '../../contexts';
import { useResolvedPredictEntryPoint } from '../../hooks/useResolvedPredictEntryPoint';
import { formatPercentage } from '../../utils/format';
import { PredictEventValues } from '../../constants/eventNames';
import type {
  PredictMarket,
  PredictOutcome,
  PredictOutcomeToken,
} from '../../types';
import type {
  PredictEntryPoint,
  PredictNavigationParamList,
} from '../../types/navigation';
import type { TransactionActiveAbTestEntry } from '../../../../../util/transactions/transaction-active-ab-test-attribution-registry';

const PREDICT_WORLD_CUP_HUB_ANALYTICS_TAB = {
  PROPS: 'props',
} as const;

export const PREDICT_WORLD_CUP_WINNER_MODULE_TEST_IDS = {
  CONTAINER: 'predict-world-cup-winner-module',
  HEADING: 'predict-world-cup-winner-module-heading',
  TILE: 'predict-world-cup-winner-module-tile',
} as const;

interface WinnerTileProps {
  outcome: PredictOutcome;
  onPress: (outcome: PredictOutcome, token: PredictOutcomeToken) => void;
}

const WinnerTile: React.FC<WinnerTileProps> = ({ outcome, onPress }) => {
  const tw = useTailwind();
  const yesToken = outcome.tokens[0];
  const probability = yesToken
    ? formatPercentage(yesToken.price * 100, { truncate: true })
    : '–';

  return (
    <Pressable
      onPress={() => yesToken && onPress(outcome, yesToken)}
      style={tw.style(
        'flex-row items-center rounded-xl bg-muted gap-2 py-1 px-3',
      )}
      testID={`${PREDICT_WORLD_CUP_WINNER_MODULE_TEST_IDS.TILE}-${outcome.id}`}
    >
      {outcome.image ? (
        <Image
          source={{ uri: outcome.image }}
          style={tw.style('rounded-lg flex-shrink-0', {
            width: 32,
            height: 32,
          })}
          contentFit="cover"
        />
      ) : (
        <View
          style={tw.style('rounded-lg bg-overlay-default flex-shrink-0', {
            width: 32,
            height: 32,
          })}
        />
      )}
      <Box twClassName="min-w-0">
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextDefault}
          style={tw.style('font-medium')}
          numberOfLines={1}
        >
          {outcome.groupItemTitle}
        </Text>
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {probability}
        </Text>
      </Box>
    </Pressable>
  );
};

interface PredictWorldCupWinnerModuleProps {
  market: PredictMarket;
  entryPoint?: PredictEntryPoint;
  predictScreen?: string;
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
}

const PredictWorldCupWinnerModule: React.FC<
  PredictWorldCupWinnerModuleProps
> = ({
  market,
  entryPoint: propEntryPoint,
  predictScreen,
  transactionActiveAbTests,
}) => {
  const tw = useTailwind();
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const { openBuySheet } = usePredictPreviewSheet();
  const { executeGuardedAction } = usePredictActionGuard({ navigation });
  const resolvedEntryPoint = useResolvedPredictEntryPoint(propEntryPoint);

  const handleTilePress = useCallback(
    (outcome: PredictOutcome, outcomeToken: PredictOutcomeToken) => {
      executeGuardedAction(
        () => {
          openBuySheet({
            market,
            outcome,
            outcomeToken,
            entryPoint: resolvedEntryPoint,
            predictFeedTab: PREDICT_WORLD_CUP_HUB_ANALYTICS_TAB.PROPS,
            ...(predictScreen && { predictScreen }),
            ...(transactionActiveAbTests?.length && {
              transactionActiveAbTests,
            }),
          });
        },
        { attemptedAction: PredictEventValues.ATTEMPTED_ACTION.PREDICT },
      );
    },
    [
      executeGuardedAction,
      market,
      openBuySheet,
      predictScreen,
      resolvedEntryPoint,
      transactionActiveAbTests,
    ],
  );

  const mid = Math.ceil(market.outcomes.length / 2);
  const topRow = market.outcomes.slice(0, mid);
  const bottomRow = market.outcomes.slice(mid);

  return (
    <Box
      twClassName="pb-4"
      testID={PREDICT_WORLD_CUP_WINNER_MODULE_TEST_IDS.CONTAINER}
    >
      <Text
        variant={TextVariant.HeadingSm}
        color={TextColor.TextDefault}
        style={tw.style('font-medium px-4 mb-3')}
        testID={PREDICT_WORLD_CUP_WINNER_MODULE_TEST_IDS.HEADING}
      >
        {strings('predict.world_cup.who_will_win')}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tw.style('px-4 gap-2 flex-col')}
      >
        <View style={tw.style('flex-row gap-2')}>
          {topRow.map((outcome) => (
            <WinnerTile
              key={outcome.id}
              outcome={outcome}
              onPress={handleTilePress}
            />
          ))}
        </View>
        {bottomRow.length > 0 && (
          <View style={tw.style('flex-row gap-2')}>
            {bottomRow.map((outcome) => (
              <WinnerTile
                key={outcome.id}
                outcome={outcome}
                onPress={handleTilePress}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </Box>
  );
};

export default PredictWorldCupWinnerModule;
