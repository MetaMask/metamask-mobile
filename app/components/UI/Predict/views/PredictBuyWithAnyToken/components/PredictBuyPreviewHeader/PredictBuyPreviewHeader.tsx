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
import { strings } from '../../../../../../../../locales/i18n';
import {
  OrderPreview,
  PredictMarket,
  PredictOutcome,
  PredictOutcomeToken,
} from '../../../../types';
import { formatCents } from '../../../../utils/format';
import { resolvePredictBuyHeaderDisplay } from '../../../../utils/predictBuyHeader';

export interface PredictBuyPreviewHeaderProps {
  market: PredictMarket;
  outcome: PredictOutcome;
  outcomeToken: PredictOutcomeToken;
  preview?: OrderPreview | null;
  onBack?: () => void;
}

export interface PredictBuyPreviewHeaderTitleProps {
  market: PredictMarket;
  outcome: PredictOutcome;
  outcomeToken: PredictOutcomeToken;
  preview?: OrderPreview | null;
}

export function PredictBuyPreviewHeaderTitle({
  market,
  outcome,
  outcomeToken,
  preview,
}: PredictBuyPreviewHeaderTitleProps) {
  const tw = useTailwind();
  const { selectedOutcomeToken, outcomeGroupTitle, outcomeTokenTitle, image } =
    resolvePredictBuyHeaderDisplay({
      market,
      outcome,
      outcomeToken,
      previewOutcomeTokenId: preview?.outcomeTokenId,
    });
  const sharePrice = preview?.sharePrice ?? selectedOutcomeToken.price ?? 0;

  const separator = '·';
  const outcomeTokenLabel = strings('predict.buy_preview_outcome_at_price', {
    outcome: outcomeTokenTitle,
    price: formatCents(sharePrice),
  });

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="flex-1 min-w-0 gap-3"
    >
      <Image source={{ uri: image }} style={tw.style('w-10 h-10 rounded')} />
      <Box flexDirection={BoxFlexDirection.Column} twClassName="flex-1 min-w-0">
        <Text variant={TextVariant.HeadingSm}>{market.title}</Text>
        <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-1 flex-wrap">
          {!!outcomeGroupTitle && (
            <>
              <Text
                variant={TextVariant.BodySm}
                twClassName="font-medium"
                color={TextColor.TextAlternative}
              >
                {outcomeGroupTitle}
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
  outcomeToken,
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
      outcomeToken={outcomeToken}
      preview={preview}
    />
  </Box>
);

export default PredictBuyPreviewHeader;
