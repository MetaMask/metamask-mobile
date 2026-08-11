import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import { PredictOutcome } from '../../types';
import { formatVolume } from '../../utils/format';

interface PredictMarketOutcomeResolvedProps {
  outcome: PredictOutcome;
  noContainer?: boolean;
}

const PredictMarketOutcomeResolved: React.FC<
  PredictMarketOutcomeResolvedProps
> = ({ outcome, noContainer = false }) => {
  const resolvedTokens = outcome.tokens.filter((token) =>
    Number.isFinite(token.price),
  );
  const winningToken = resolvedTokens.reduce(
    (currentWinner, token) =>
      !currentWinner || token.price > currentWinner.price
        ? token
        : currentWinner,
    resolvedTokens[0],
  );
  const winningTokenCount = winningToken
    ? resolvedTokens.filter((token) => token.price === winningToken.price)
        .length
    : 0;
  const hasBinaryWinner = resolvedTokens.length > 1 && winningTokenCount === 1;
  const singleTokenIsWinner =
    resolvedTokens.length === 1 && (winningToken?.price ?? 0) > 0.5;
  const hasWinner = hasBinaryWinner || singleTokenIsWinner;

  const winnerTitle = hasWinner
    ? (winningToken?.title ?? strings('predict.outcome_draw'))
    : resolvedTokens.length === 1
      ? strings('predict.outcome_loser')
      : strings('predict.outcome_draw');

  const textColor = hasWinner
    ? TextColor.TextDefault
    : TextColor.TextAlternative;

  return (
    <Box twClassName={noContainer ? 'pt-2' : ' bg-muted rounded-xl p-4 mb-4'}>
      <Box
        flexDirection={BoxFlexDirection.Row}
        justifyContent={BoxJustifyContent.Between}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-2"
      >
        <Box flexDirection={BoxFlexDirection.Column} twClassName="gap-1">
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextDefault}
            twClassName="font-medium"
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {outcome.groupItemTitle ?? outcome.title}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            twClassName="font-medium"
          >
            ${formatVolume(outcome.volume)}{' '}
            {strings('predict.volume_abbreviated')}
          </Text>
        </Box>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-1"
        >
          <Text
            variant={TextVariant.BodyMd}
            color={textColor}
            twClassName="font-medium"
          >
            {winnerTitle}
          </Text>
          {hasWinner && (
            <Icon
              name={IconName.Confirmation}
              size={IconSize.Md}
              color={IconColor.SuccessDefault}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default PredictMarketOutcomeResolved;
