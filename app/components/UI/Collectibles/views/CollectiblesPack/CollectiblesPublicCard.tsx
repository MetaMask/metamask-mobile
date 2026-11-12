import GradingBadge from '../../components/CardDisplay/GradingBadge';
import React, { useRef, useState } from 'react';
import { Modal, ScrollView, useWindowDimensions } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  Box,
  Button,
  ButtonVariant,
  HeaderStandard,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import I18n, { strings } from '../../../../../../locales/i18n';
import { getIntlDateTimeFormatter } from '../../../../../util/intl';
import ModalSafeAreaProvider from '../../../../../component-library/components-temp/ModalSafeAreaProvider';
import type { CollectiblesInventoryCard } from '../../types';
import {
  getCardTitle,
  getGradeLabel,
} from '../../components/CardDisplay/cardLabels';
import CardInformation from '../../components/CardDisplay/CardInformation';
import CardMetadataStats from '../../components/CardDisplay/CardMetadataStats';
import InteractiveCard from '../../components/InteractiveCard';
import RarityTag from '../../components/RarityTag';
import CtaButton from '../../components/CtaButton';
import { useCollectiblesPresentation } from '../../hooks/useCollectiblesPresentation';
import { formatUsd } from '../../providers/pack-partner/utils/format';

/** A confirmed indexed sale. Missing FX enrichment is never replaced by appraisal. */
export interface PublicCardSaleReceipt {
  amountUsd: number | null;
}

/** Public metadata has no owned-card or sell actions; buying opens a separate review. */
export default function CollectiblesPublicCard({
  card,
  onClose,
  onBuyPack,
  saleReceipt,
  sourcePackName,
  contextLabel,
}: {
  card: CollectiblesInventoryCard;
  onClose: () => void;
  onBuyPack?: () => void;
  saleReceipt?: PublicCardSaleReceipt;
  sourcePackName?: string;
  contextLabel?: string;
}) {
  const tw = useTailwind();
  const { animate } = useCollectiblesPresentation();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  const [showMore, setShowMore] = useState(true);
  const heroHeight = Math.max(560, height - insets.top - insets.bottom - 160);
  const gradeLabel = getGradeLabel(card);
  const openedAt =
    'openedAt' in card && typeof card.openedAt === 'number'
      ? card.openedAt
      : undefined;
  const opener =
    'openerAddress' in card && typeof card.openerAddress === 'string'
      ? card.openerAddress
      : undefined;
  const openingContext =
    contextLabel ??
    (openedAt === undefined
      ? undefined
      : strings(
          opener
            ? 'collectibles_discovery.opened_by_at'
            : 'collectibles_discovery.opened_at',
          {
            address: opener ? `${opener.slice(0, 6)}…${opener.slice(-4)}` : '',
            date: getIntlDateTimeFormatter(I18n.locale, {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            }).format(openedAt),
          },
        ));
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <ModalSafeAreaProvider>
        <SafeAreaView
          edges={['left', 'right']}
          style={tw.style('flex-1 bg-default')}
          testID="collectibles-public-card"
        >
          <HeaderStandard
            includesTopInset
            onBack={onClose}
            backButtonProps={{ accessibilityLabel: strings('navigation.back') }}
          />
          <ScrollView
            ref={scroll}
            onScroll={(event) => {
              if (event.nativeEvent.contentOffset.y > 16) setShowMore(false);
            }}
            scrollEventThrottle={16}
            contentContainerStyle={tw.style('pb-6')}
          >
            <Box
              twClassName="items-center justify-center px-4 gap-3"
              style={{ minHeight: heroHeight }}
            >
              <Box twClassName="w-4/5 max-w-80">
                <InteractiveCard
                  name={getCardTitle(card)}
                  frontImage={card.image}
                  frontPreviewImage={card.mediumImage}
                  backImage={card.backImage}
                  backPreviewImage={card.mediumBackImage}
                  isActive={animate}
                  soldLabel={
                    saleReceipt ? strings('collectibles.batch.sold') : undefined
                  }
                />
              </Box>
              {sourcePackName && (
                <Text
                  variant={TextVariant.BodyXs}
                  color={TextColor.TextAlternative}
                  twClassName="text-center"
                  testID="collectibles-public-card-source-pack"
                >
                  {sourcePackName}
                </Text>
              )}
              <Text variant={TextVariant.HeadingLg} twClassName="text-center">
                {getCardTitle(card)}
              </Text>
              <Box twClassName="flex-row items-center justify-center gap-2 flex-wrap">
                {gradeLabel && <GradingBadge label={gradeLabel} />}
                {card.rarity && <RarityTag rarity={card.rarity} />}
              </Box>
              <CardMetadataStats card={card} />
              {saleReceipt && (
                <Box
                  twClassName="items-center py-3"
                  gap={1}
                  testID="collectibles-public-sale-receipt"
                >
                  <Text variant={TextVariant.HeadingSm}>
                    {strings('collectibles.batch.sold')}
                  </Text>
                  {saleReceipt.amountUsd !== null && (
                    <>
                      <Text variant={TextVariant.BodySm}>
                        {strings('collectibles_discovery.sale_proceeds')}
                      </Text>
                      <Text variant={TextVariant.HeadingMd}>
                        {formatUsd(saleReceipt.amountUsd)}
                      </Text>
                    </>
                  )}
                </Box>
              )}
            </Box>
            {openingContext && (
              <Text
                variant={TextVariant.BodyXs}
                color={TextColor.TextAlternative}
                twClassName="text-center px-4 pb-4"
                testID="collectibles-public-card-context"
              >
                {openingContext}
              </Text>
            )}
            <Box twClassName="px-4 pt-6 border-t border-muted">
              <CardInformation card={card} inline />
            </Box>
          </ScrollView>
          <SafeAreaView
            edges={{ bottom: 'maximum' }}
            style={tw.style('gap-2 border-t border-muted px-4 pt-2 pb-4')}
          >
            {!saleReceipt && (
              <CtaButton
                label={strings('collectibles_discovery.buy_pack')}
                onPress={() => onBuyPack?.()}
                isDisabled={!onBuyPack}
                testID="collectibles-public-card-buy-pack"
              />
            )}
            {showMore && (
              <Button
                variant={ButtonVariant.Tertiary}
                endIconName={IconName.ArrowDown}
                onPress={() => {
                  setShowMore(false);
                  scroll.current?.scrollTo({
                    y: heroHeight,
                    animated: animate,
                  });
                }}
              >
                {strings('collectibles_discovery.see_more')}
              </Button>
            )}
          </SafeAreaView>
        </SafeAreaView>
      </ModalSafeAreaProvider>
    </Modal>
  );
}
