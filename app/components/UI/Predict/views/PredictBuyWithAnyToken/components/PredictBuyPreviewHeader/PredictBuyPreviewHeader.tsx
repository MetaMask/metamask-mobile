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
import { getBuyOutcomeImage } from '../../../../constants/sports';
import { formatCents } from '../../../../utils/format';
import { getDisplayBuyPrice } from '../../../../utils/prices';
import PredictRegTimeTag from '../../../../components/PredictRegTimeTag';
import { usePredictRegTimeBuyAccessory } from '../../../../hooks/usePredictRegTimeBuyAccessory';

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

const getOutcomeTokenLabel = (
  outcome: PredictOutcome,
  outcomeToken: PredictOutcomeToken,
  preview?: OrderPreview | null,
) => {
  const selectedOutcomeToken =
    outcome.tokens.find((token) => token.id === preview?.outcomeTokenId) ??
    outcomeToken;
  const sharePrice =
    preview?.sharePrice ?? getDisplayBuyPrice(selectedOutcomeToken) ?? 0;

  return {
    title: selectedOutcomeToken?.title ?? '',
    sharePrice,
  };
};

export function PredictBuyPreviewHeaderTitle({
  market,
  outcome,
  outcomeToken,
  preview,
}: PredictBuyPreviewHeaderTitleProps) {
  const tw = useTailwind();
  const { title: outcomeTokenTitle, sharePrice } = getOutcomeTokenLabel(
    outcome,
    outcomeToken,
    preview,
  );
  const { showRegTimeTag, onRegTimeInfoPress, regTimeInfoSheet } =
    usePredictRegTimeBuyAccessory({
      game: market.game,
      sportsMarketType: outcome.sportsMarketType,
    });

  const separator = '·';
  const outcomeTokenLabel = strings('predict.buy_preview_outcome_at_price', {
    outcome: outcomeTokenTitle,
    price: formatCents(sharePrice),
  });

  return (
    <>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="flex-1 min-w-0 gap-3"
      >
        <Image
          source={{
            uri: getBuyOutcomeImage({
              outcome,
              outcomeToken,
              game: market.game,
            }),
          }}
          style={tw.style('w-10 h-10 rounded')}
        />
        <Box
          flexDirection={BoxFlexDirection.Column}
          twClassName="flex-1 min-w-0"
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-2 min-w-0"
          >
            <Text
              variant={TextVariant.HeadingSm}
              numberOfLines={1}
              ellipsizeMode="tail"
              twClassName="flex-1"
            >
              {market.title}
            </Text>
            {showRegTimeTag ? (
              <PredictRegTimeTag onPress={onRegTimeInfoPress} />
            ) : null}
          </Box>
          <Box
            flexDirection={BoxFlexDirection.Row}
            twClassName="gap-1 flex-wrap"
          >
            {!!outcome.groupItemTitle && (
              <>
                <Text
                  variant={TextVariant.BodySm}
                  twClassName="font-medium"
                  color={TextColor.TextAlternative}
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
            >
              {outcomeTokenLabel}
            </Text>
          </Box>
        </Box>
      </Box>
      {regTimeInfoSheet}
    </>
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
