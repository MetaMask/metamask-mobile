import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import React from 'react';
import { Image, View } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { useStyles } from '../../../../../component-library/hooks';
import {
  PredictMarket,
  PredictOutcomeToken,
  PredictOutcome as PredictOutcomeType,
} from '../../types';
import {
  PredictNavigationParamList,
  PredictEntryPoint,
} from '../../types/navigation';
import { PredictEventValues } from '../../constants/eventNames';
import {
  formatCents,
  formatPercentage,
  formatVolume,
} from '../../utils/format';
import styleSheet from './PredictMarketOutcome.styles';
import { usePredictActionGuard } from '../../hooks/usePredictActionGuard';
import { usePredictPreviewSheet } from '../../contexts';
import { useVisibleOutcomePrices } from '../../hooks/useVisibleOutcomePrices';
import { buildPriceQueriesFromOutcome } from '../../utils/pricingQueries';

interface PredictMarketOutcomeProps {
  market: PredictMarket;
  outcome: PredictOutcomeType;
  entryPoint?: PredictEntryPoint;
  outcomeToken?: PredictOutcomeToken;
  isClosed?: boolean;
  visible?: boolean;
  getTokenPrice?: (token: PredictOutcomeToken) => number;
}

const MAX_LABEL_LENGTH = 6;

const PredictMarketOutcome: React.FC<PredictMarketOutcomeProps> = ({
  market,
  outcome,
  entryPoint = PredictEventValues.ENTRY_POINT.PREDICT_FEED,
  isClosed = false,
  outcomeToken,
  visible = true,
  getTokenPrice: externalGetTokenPrice,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const tw = useTailwind();
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();

  const { executeGuardedAction } = usePredictActionGuard({
    navigation,
  });
  const { openBuySheet } = usePredictPreviewSheet();

  const priceQueries = React.useMemo(
    () => buildPriceQueriesFromOutcome(outcome),
    [outcome],
  );
  const { getTokenPrice: internalGetTokenPrice } = useVisibleOutcomePrices({
    queries: priceQueries,
    tokens: outcome.tokens,
    visible: visible && !isClosed,
    enabled: !externalGetTokenPrice,
  });
  const getTokenPrice = externalGetTokenPrice ?? internalGetTokenPrice;
  const displayedTokens = React.useMemo(
    () =>
      outcome.tokens.map((token) => ({
        ...token,
        price: isClosed ? token.price : getTokenPrice(token),
      })),
    [getTokenPrice, isClosed, outcome.tokens],
  );
  const displayedOutcome = React.useMemo(
    () => ({
      ...outcome,
      tokens: displayedTokens,
    }),
    [displayedTokens, outcome],
  );

  const getOutcomePrices = (): number[] =>
    displayedOutcome.tokens.map((token) => token.price);

  const getYesPercentage = (): string => {
    const prices = getOutcomePrices();
    if (prices.length > 0) {
      return formatPercentage(prices[0] * 100, { truncate: true });
    }
    return '0%';
  };

  const getTitle = (): string => {
    if (isClosed && outcomeToken) {
      return outcomeToken.title;
    }
    return displayedOutcome.groupItemTitle || displayedOutcome.title || '';
  };

  const getImageUrl = (): string => displayedOutcome.image;

  const getVolumeDisplay = (): string =>
    formatVolume(displayedOutcome.volume ?? 0);

  const isBiggerLabel =
    displayedOutcome.tokens[0].title.length > MAX_LABEL_LENGTH ||
    displayedOutcome.tokens[1].title.length > MAX_LABEL_LENGTH;

  const handleBuy = (token: PredictOutcomeToken) => {
    executeGuardedAction(
      () => {
        openBuySheet({
          market,
          outcome: displayedOutcome,
          outcomeToken: token,
          entryPoint,
        });
      },
      {
        attemptedAction: PredictEventValues.ATTEMPTED_ACTION.PREDICT,
      },
    );
  };

  return (
    <View style={styles.marketContainer}>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="w-full gap-3"
      >
        <Box twClassName="w-10 h-10 rounded-lg bg-muted overflow-hidden self-start">
          {getImageUrl() ? (
            <Image
              source={{ uri: getImageUrl() }}
              style={tw.style('w-full h-full')}
              resizeMode="cover"
            />
          ) : (
            <Box twClassName="w-full h-full bg-muted" />
          )}
        </Box>
        <Box twClassName="flex-1 -mt-1">
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextDefault}
            style={tw.style('font-medium')}
          >
            {getTitle()}
          </Text>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            ${getVolumeDisplay()} {strings('predict.volume_abbreviated')}
          </Text>
        </Box>
        {isClosed && outcomeToken ? (
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-1"
          >
            <Text
              variant={TextVariant.BodyMd}
              twClassName="font-medium"
              color={
                outcomeToken.price === 1
                  ? TextColor.TextDefault
                  : TextColor.TextAlternative
              }
            >
              {outcomeToken.price === 1
                ? strings('predict.outcome_winner')
                : strings('predict.outcome_loser')}
            </Text>
            {outcomeToken.price === 1 && (
              <Icon
                name={IconName.Confirmation}
                size={IconSize.Md}
                color={
                  outcomeToken.price === 1
                    ? TextColor.SuccessDefault
                    : TextColor.TextMuted
                }
              />
            )}
          </Box>
        ) : (
          <Text
            style={tw.style('text-[20px] font-medium')}
            color={TextColor.TextDefault}
          >
            {getYesPercentage()}
          </Text>
        )}
      </Box>
      {!isClosed && (
        <View style={styles.buttonContainer}>
          <Button
            variant={ButtonVariants.Secondary}
            size={ButtonSize.Md}
            width={ButtonWidthTypes.Full}
            label={
              <Text
                style={tw.style('font-medium text-center')}
                color={TextColor.SuccessDefault}
              >
                {displayedOutcome.tokens[0].title}
                {isBiggerLabel ? '\n' : ' • '}
                {formatCents(displayedOutcome.tokens[0].price)}
              </Text>
            }
            onPress={() => handleBuy(displayedOutcome.tokens[0])}
            style={[styles.buttonYes, isBiggerLabel && tw.style('h-full py-2')]}
          />
          <Button
            variant={ButtonVariants.Secondary}
            size={ButtonSize.Md}
            width={ButtonWidthTypes.Full}
            label={
              <Text
                style={tw.style('font-medium text-center')}
                color={TextColor.ErrorDefault}
              >
                {displayedOutcome.tokens[1].title}
                {isBiggerLabel ? '\n' : ' • '}
                {formatCents(displayedOutcome.tokens[1].price)}
              </Text>
            }
            onPress={() => handleBuy(displayedOutcome.tokens[1])}
            style={[styles.buttonNo, isBiggerLabel && tw.style('h-full py-2')]}
          />
        </View>
      )}
    </View>
  );
};

export default PredictMarketOutcome;
