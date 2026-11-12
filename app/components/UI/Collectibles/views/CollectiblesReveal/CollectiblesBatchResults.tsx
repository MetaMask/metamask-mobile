import React, { type RefObject } from 'react';
import { FlatList, useWindowDimensions, View } from 'react-native';
import { typography } from '@metamask/design-tokens';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonVariant,
  Card,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { useCollectiblesShare } from '../../hooks/useCollectiblesShare';
import CardImage from '../../components/CardImage';
import CardSummary from '../../components/CardDisplay/CardSummary';
import SoldCardTreatment from '../../components/CardDisplay/SoldCardTreatment';
import PackList from '../../components/PackList/PackList';
import CtaButton from '../../components/CtaButton';
import ReplitAnimatedAmount from '../../components/CollectiblesMotion/ReplitAnimatedAmount';
import { getCardTitle } from '../../components/CardDisplay/cardLabels';
import { formatUsd } from '../../providers/pack-partner/utils/format';
import { formatPurchaseAmount } from '../../components/PackPurchaseSheet/packPurchaseAmounts';
import type { CollectiblesCard, CollectiblesPack } from '../../types';

export const getSaleAmount = (card: CollectiblesCard): string | undefined =>
  !card.sale &&
  card.buyback.status === 'available' &&
  card.buyback.amount &&
  BigInt(card.buyback.amount) > 0n
    ? card.buyback.amount
    : undefined;
export const soldLabel = (card: CollectiblesCard) =>
  strings(
    card.sale?.automatic
      ? 'collectibles.batch.sold_automatically'
      : 'collectibles.batch.sold',
  );

interface Props {
  cards: CollectiblesCard[];
  pack?: CollectiblesPack;
  packs: CollectiblesPack[];
  packsLoading?: boolean;
  packsError?: boolean;
  onRetryPacks?: () => void;
  selectedMints: string[];
  onToggle: (mint: string) => void;
  onSell: () => void;
  onBuyAgain: () => void;
  onDone: () => void;
  onDiscover: (pack: CollectiblesPack) => void;
  spent: number;
  actionsDisabled?: boolean;
  saleSourceRef?: RefObject<View | null>;
  registerCardSource?: (mint: string, view: View | null) => void;
  isActive?: boolean;
}

/** Replit's haul summary. Only the user selects sales; the two-column list is virtualized. */
export default function CollectiblesBatchResults({
  cards,
  pack,
  packs,
  packsLoading = false,
  packsError = false,
  onRetryPacks,
  selectedMints,
  onToggle,
  onSell,
  onBuyAgain,
  onDone,
  onDiscover,
  spent,
  actionsDisabled = false,
  saleSourceRef,
  registerCardSource,
  isActive = true,
}: Props) {
  const tw = useTailwind();
  const { fontScale } = useWindowDimensions();
  const share = useCollectiblesShare();
  const amount = cards.reduce(
    (sum, card) =>
      sum +
      (selectedMints.includes(card.mint)
        ? BigInt(getSaleAmount(card) ?? '0')
        : 0n),
    0n,
  );
  const insured = cards.reduce(
    (sum, card) => sum + (card.insuredValue ?? 0),
    0,
  );
  const kept = cards.reduce(
    (sum, card) => sum + (!card.sale ? (card.insuredValue ?? 0) : 0),
    0,
  );
  const received = cards.reduce(
    (sum, card) =>
      sum + (card.sale?.status === 'completed' ? BigInt(card.sale.amount) : 0n),
    0n,
  );
  const hasEligible = cards.some((card) => getSaleAmount(card) !== undefined);
  return (
    <Box twClassName="flex-1" testID="collectibles-batch-results">
      <Box paddingHorizontal={4} paddingBottom={4}>
        <Text variant={TextVariant.HeadingLg} twClassName="text-center">
          {strings('collectibles.haul.title')}
        </Text>
      </Box>
      <FlatList
        data={cards}
        numColumns={2}
        keyExtractor={(card) => card.memo ?? card.mint}
        extraData={selectedMints}
        contentContainerStyle={tw.style('px-4 pb-6 gap-3')}
        columnWrapperStyle={tw.style('-mx-1.5')}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
        ListHeaderComponent={
          <Box gap={4} paddingBottom={3}>
            <Box twClassName="items-center py-2" gap={1}>
              <ReplitAnimatedAmount
                value={insured}
                isActive={isActive}
                testID="collectibles-batch-total-value"
              />
              <Text color={TextColor.TextAlternative}>
                {strings('collectibles.haul.value')}
              </Text>
            </Box>
            <Box gap={3} twClassName="border-y border-muted py-3">
              {[
                [strings('collectibles.haul.kept'), formatUsd(kept)],
                [
                  strings('collectibles.haul.received'),
                  formatPurchaseAmount(received),
                ],
                [strings('collectibles.haul.spent'), formatUsd(spent)],
              ].map(([label, value]) => (
                <Box key={label} twClassName="flex-row justify-between gap-3">
                  <Text color={TextColor.TextAlternative}>{label}</Text>
                  <Text>{value}</Text>
                </Box>
              ))}
            </Box>
            {pack && (
              <Button
                isFullWidth
                variant={ButtonVariant.Secondary}
                onPress={onBuyAgain}
                isDisabled={actionsDisabled}
                testID="collectibles-batch-buy-again"
              >
                {strings('collectibles.batch.buy_again')}
              </Button>
            )}
            <Box twClassName="border-t border-muted pt-5" gap={1}>
              <Text variant={TextVariant.HeadingMd}>
                {strings('collectibles.haul.opened', { count: cards.length })}
              </Text>
              <Box twClassName="flex-row justify-between gap-2">
                {hasEligible && (
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.TextAlternative}
                    twClassName="flex-1"
                  >
                    {strings('collectibles.haul.select')}
                  </Text>
                )}
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  {strings('collectibles.haul.selection', {
                    count: selectedMints.length,
                  })}
                </Text>
              </Box>
            </Box>
          </Box>
        }
        renderItem={({ item: card }) => {
          const sold = card.sale?.status === 'completed';
          const selected = selectedMints.includes(card.mint);
          const eligible = getSaleAmount(card) !== undefined;
          return (
            <Box twClassName="w-1/2 px-1.5">
              <Card
                isInteractive={eligible}
                onPress={() => eligible && onToggle(card.mint)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected, disabled: !eligible }}
                accessibilityLabel={getCardTitle(card)}
                testID={`collectibles-batch-card-${card.mint}`}
                twClassName={`w-full p-2 rounded-2xl ${selected ? 'border-primary-default bg-primary-muted' : ''}`}
              >
                <Box
                  twClassName="relative"
                  collapsable={false}
                  ref={(view: View | null) =>
                    registerCardSource?.(card.mint, view)
                  }
                >
                  {sold ? (
                    <SoldCardTreatment label={soldLabel(card)}>
                      <CardImage
                        uri={card.image}
                        previewUri={card.mediumImage}
                        accessibilityLabel={getCardTitle(card)}
                      />
                    </SoldCardTreatment>
                  ) : (
                    <CardImage
                      uri={card.image}
                      previewUri={card.mediumImage}
                      accessibilityLabel={getCardTitle(card)}
                    />
                  )}
                  {eligible && (
                    <Box
                      twClassName={`absolute right-1 top-1 rounded-full w-6 h-6 items-center justify-center border ${selected ? 'bg-primary-default border-primary-default' : 'bg-default border-muted'}`}
                    >
                      <Text
                        variant={TextVariant.BodySm}
                        color={
                          selected
                            ? TextColor.PrimaryInverse
                            : TextColor.TextDefault
                        }
                      >
                        {selected ? '✓' : ''}
                      </Text>
                    </Box>
                  )}
                </Box>
                <Box twClassName={sold ? 'opacity-50' : ''}>
                  <CardSummary
                    card={card}
                    value={
                      sold && card.sale
                        ? Number(card.sale.amount) / 1_000_000
                        : card.insuredValue
                    }
                  />
                </Box>
                <Box
                  twClassName="justify-center"
                  style={{
                    minHeight: Math.max(
                      32,
                      typography.sBodyXS.lineHeight * fontScale,
                    ),
                  }}
                  testID={`collectibles-batch-card-action-${card.mint}`}
                >
                  {card.sale?.status === 'pending' && (
                    <Text
                      variant={TextVariant.BodyXs}
                      color={TextColor.TextAlternative}
                      numberOfLines={1}
                    >
                      {strings('collectibles.batch.sale_pending')}
                    </Text>
                  )}
                  {!card.sale && (
                    <ButtonIcon
                      size={ButtonIconSize.Md}
                      iconName={IconName.Share}
                      accessibilityLabel={strings('collectibles.card.share')}
                      onPress={() => share.open([card])}
                    />
                  )}
                </Box>
              </Card>
            </Box>
          );
        }}
        ListFooterComponent={
          <Box gap={4} paddingTop={6}>
            <Text variant={TextVariant.HeadingMd}>
              {strings('collectibles.batch.discover')}
            </Text>
            <PackList
              packs={packs.filter((item) => item.code !== pack?.code)}
              isLoading={packsLoading}
              error={packsError}
              onRetry={onRetryPacks}
              onOpen={onDiscover}
              tileWidth={144}
              horizontalInset={0}
            />
          </Box>
        }
      />
      <SafeAreaView
        edges={{ bottom: 'maximum' }}
        style={tw.style('px-4 pt-3 pb-4 gap-2 bg-default')}
      >
        {hasEligible && (
          <View ref={saleSourceRef} collapsable={false}>
            <CtaButton
              label={strings('collectibles.haul.buyback', {
                amount: formatPurchaseAmount(amount),
              })}
              onPress={onSell}
              isDisabled={actionsDisabled || !selectedMints.length}
              testID="collectibles-batch-sell-selected"
            />
          </View>
        )}
        <Button
          isFullWidth
          variant={
            hasEligible ? ButtonVariant.Secondary : ButtonVariant.Primary
          }
          onPress={onDone}
          testID="collectibles-batch-done"
        >
          {strings('collectibles.reveal.done')}
        </Button>
      </SafeAreaView>
      {share.composer}
    </Box>
  );
}
