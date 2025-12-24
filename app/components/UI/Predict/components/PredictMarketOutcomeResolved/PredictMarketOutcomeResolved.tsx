import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { PredictOutcome } from '../../types';
import { formatVolume } from '../../utils/format';

interface PredictMarketOutcomeResolvedProps {
  outcome: PredictOutcome;
  noContainer?: boolean;
}

const PredictMarketOutcomeResolved: React.FC<
  PredictMarketOutcomeResolvedProps
> = ({ outcome, noContainer = false }) => {
  const tokenOnePrice = outcome.tokens[0].price;
  const tokenTwoPrice = outcome.tokens[1].price;
  const tokenOneIsWinner = tokenOnePrice > tokenTwoPrice;
  const tokenTwoIsWinner = tokenTwoPrice > tokenOnePrice;

  const winnerTitle = tokenOneIsWinner
    ? outcome.tokens[0].title
    : tokenTwoIsWinner
      ? outcome.tokens[1].title
      : strings('predict.outcome_draw');

  const textColor = tokenOneIsWinner
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
          {tokenOneIsWinner && (
            <Icon
              name={IconName.Confirmation}
              size={IconSize.Md}
              color={IconColor.Success}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default PredictMarketOutcomeResolved;
