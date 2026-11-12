import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  Skeleton,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import I18n, { strings } from '../../../../../../locales/i18n';
import { CollectiblesPackDetailTestIds as IDs } from '../../Collectibles.testIds';
import CardImage from '../../components/CardImage';
import {
  getCardTitle,
  getGradeLabel,
  getRarityLabel,
} from '../../components/CardDisplay/cardLabels';
import type { CollectiblesOpening } from '../../types';
import { getIntlDateTimeFormatter } from '../../../../../util/intl';
import { formatUsd } from '../../providers/pack-partner/utils/format';

/** A public pull is informational, not a link into the user's owned collection. */
export const OpeningRow = ({ card }: { card: CollectiblesOpening }) => (
  <Box
    testID={IDs.OPENING(card.id)}
    twClassName="mx-5 border-b border-muted py-4"
  >
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={3}
      twClassName="w-full"
    >
      <Box twClassName="w-15 rounded-lg bg-muted p-1.5">
        <CardImage
          uri={card.mediumImage ?? card.image}
          accessibilityLabel={getCardTitle(card)}
          transparent
        />
      </Box>
      <Box gap={1} twClassName="min-w-0 flex-1">
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Bold}
          numberOfLines={2}
        >
          {getCardTitle(card)}
        </Text>
        <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
          {[getGradeLabel(card), card.rarity && getRarityLabel(card.rarity)]
            .filter(Boolean)
            .join(' · ')}
        </Text>
        <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
          {getIntlDateTimeFormatter(I18n.locale, {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
          }).format(card.openedAt)}
        </Text>
      </Box>
      {card.insuredValue !== undefined && (
        <Box gap={1} twClassName="max-w-[30%]">
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Medium}
            twClassName="text-right"
          >
            {formatUsd(card.insuredValue)}
          </Text>
          <Text
            variant={TextVariant.BodyXs}
            color={TextColor.TextAlternative}
            twClassName="text-right"
          >
            {strings('collectibles.card.insured_value')}
          </Text>
        </Box>
      )}
    </Box>
  </Box>
);

export const OpeningsFooter = ({
  loading,
  failed,
  empty,
  onRetry,
}: {
  loading: boolean;
  failed: boolean;
  empty: boolean;
  onRetry: () => void;
}) => (
  <Box twClassName="px-5 py-3 gap-3">
    {loading ? (
      <Skeleton height={82} testID="collectibles-openings-loading" />
    ) : failed ? (
      <>
        <Text color={TextColor.TextAlternative}>
          {strings('collectibles.pack_detail.openings_error')}
        </Text>
        <Button onPress={onRetry}>
          {strings('collectibles.errors.retry')}
        </Button>
      </>
    ) : empty ? (
      <Text color={TextColor.TextAlternative}>
        {strings('collectibles.pack_detail.no_openings')}
      </Text>
    ) : null}
  </Box>
);
