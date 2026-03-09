import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Icon,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Image, TouchableOpacity } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import { OrderPreview, PredictMarket, PredictOutcome } from '../../types';
import { formatCents } from '../../utils/format';

export interface PredictBuyPreviewHeaderProps {
  market: PredictMarket;
  outcome: PredictOutcome;
  preview?: OrderPreview | null;
  onBack?: () => void;
}

export interface PredictBuyPreviewHeaderTitleProps {
  market: PredictMarket;
  outcome: PredictOutcome;
  preview?: OrderPreview | null;
}

const getOutcomeTokenLabel = (
  outcome: PredictOutcome,
  preview?: OrderPreview | null,
) => {
  const selectedOutcomeToken =
    outcome.tokens.find((token) => token.id === preview?.outcomeTokenId) ??
    outcome.tokens[0];
  const sharePrice = preview?.sharePrice ?? selectedOutcomeToken?.price ?? 0;

  return {
    title: selectedOutcomeToken?.title ?? '',
    sharePrice,
  };
};

export function PredictBuyPreviewHeaderTitle({
  market,
  outcome,
  preview,
}: PredictBuyPreviewHeaderTitleProps) {
  const tw = useTailwind();
  const { title: outcomeTokenTitle, sharePrice } = getOutcomeTokenLabel(
    outcome,
    preview,
  );

  const separator = '·';
  const outcomeTokenLabel = strings('predict.buy_preview_outcome_at_price', {
    outcome: outcomeTokenTitle,
    price: formatCents(sharePrice),
  });

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="gap-3"
    >
      <Image
        source={{ uri: outcome.image }}
        style={tw.style('w-10 h-10 rounded')}
      />
      <Box flexDirection={BoxFlexDirection.Column} twClassName="flex-1 min-w-0">
        <Text
          variant={TextVariant.HeadingSm}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {market.title}
        </Text>
        <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-1">
          {!!outcome.groupItemTitle && (
            <>
              <Text
                variant={TextVariant.BodySm}
                twClassName="font-medium"
                color={TextColor.TextAlternative}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {outcome.groupItemTitle}
              </Text>
              <Text
                variant={TextVariant.BodySm}
                twClassName="font-medium"
                color={TextColor.TextAlternative}
              >
                {separator}
              </Text>
            </>
          )}
          <Text
            variant={TextVariant.BodySm}
            twClassName="font-medium"
            color={
              outcomeTokenTitle === 'Yes'
                ? TextColor.SuccessDefault
                : TextColor.ErrorDefault
            }
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {outcomeTokenLabel}
          </Text>
        </Box>
      </Box>
    </Box>
  );
}

export function PredictBuyPreviewHeaderBack({
  onBack,
}: {
  onBack?: () => void;
}) {
  const { goBack } = useNavigation();

  return (
    <TouchableOpacity testID="back-button" onPress={onBack ?? goBack}>
      <Icon name={IconName.ArrowLeft} size={IconSize.Md} />
    </TouchableOpacity>
  );
}

const PredictBuyPreviewHeader = ({
  market,
  outcome,
  preview,
  onBack,
}: PredictBuyPreviewHeaderProps) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    twClassName="w-full gap-4 p-4"
  >
    <PredictBuyPreviewHeaderBack onBack={onBack} />
    <PredictBuyPreviewHeaderTitle
      market={market}
      outcome={outcome}
      preview={preview}
    />
  </Box>
);

export default PredictBuyPreviewHeader;
