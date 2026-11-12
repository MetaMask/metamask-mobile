import React, { useState } from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxFlexWrap,
  ButtonBase,
  ButtonIcon,
  FontWeight,
  IconName,
  KeyValueColumn,
  Tag,
  TagSeverity,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  CollectiblesCardDisplayTestIds,
  CollectiblesBuybackOfferTestIds,
} from '../../Collectibles.testIds';
import type { CollectiblesCard } from '../../types';
import { getCardValue } from '../../providers/pack-partner/utils/cards';
import {
  formatUsd,
  formatUsdcAmount,
} from '../../providers/pack-partner/utils/format';
import CardImage from '../CardImage';
import RarityTag from '../RarityTag';
import { UsdcIcon } from '../UsdcAmount';
import { getCardTitle, getGradeLabel, getRarityLabel } from './cardLabels';

interface CardDetailRow {
  label: string;
  value?: string;
  testID: string;
}

/** Only display information returned by the provider or the selected wallet. */
const DetailSection = ({
  title,
  rows,
  testID,
  initiallyOpen = false,
  inline = false,
  children,
}: {
  title: string;
  rows: CardDetailRow[];
  testID: string;
  initiallyOpen?: boolean;
  inline?: boolean;
  children?: React.ReactNode;
}) => {
  const [isOpen, setIsOpen] = useState(initiallyOpen);
  const visibleRows = rows.filter(({ value }) => value);
  if (!visibleRows.length) return null;

  return (
    <Box
      twClassName={inline ? 'gap-3' : 'border-b border-muted'}
      testID={testID}
    >
      {inline ? (
        <Text variant={TextVariant.HeadingSm}>{title}</Text>
      ) : (
        <ButtonBase
          isFullWidth
          onPress={() => setIsOpen(!isOpen)}
          accessibilityState={{ expanded: isOpen }}
          twClassName="h-auto min-h-12 rounded-none bg-transparent px-4 py-3"
          textProps={{
            variant: TextVariant.BodySm,
            fontWeight: FontWeight.Medium,
            twClassName: 'text-left',
          }}
          contentWrapperProps={{ twClassName: 'flex-1 justify-between' }}
          endIconName={isOpen ? IconName.ArrowUp : IconName.ArrowDown}
          testID={CollectiblesCardDisplayTestIds.SECTION_TOGGLE(testID)}
        >
          {title}
        </ButtonBase>
      )}
      {(isOpen || inline) && (
        <Box
          paddingHorizontal={4}
          paddingBottom={4}
          paddingTop={inline ? 4 : 0}
          twClassName={inline ? 'rounded-lg border border-muted' : undefined}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            flexWrap={BoxFlexWrap.Wrap}
            twClassName="-mx-2 gap-y-3"
          >
            {visibleRows.map(({ label, value, testID: rowTestID }) => (
              <KeyValueColumn
                key={rowTestID}
                keyLabel={label}
                value={value}
                twClassName={
                  visibleRows.length === 1 || (value?.length ?? 0) > 35
                    ? 'w-full gap-1 px-2'
                    : 'w-1/2 gap-1 px-2'
                }
                keyTextProps={{
                  variant: TextVariant.BodyXs,
                  fontWeight: FontWeight.Regular,
                  numberOfLines: 0,
                }}
                valueTextProps={{
                  variant: TextVariant.BodySm,
                  numberOfLines: 0,
                  selectable: true,
                  testID: inline ? `${rowTestID}-information` : rowTestID,
                }}
              />
            ))}
          </Box>
          {children}
        </Box>
      )}
    </Box>
  );
};

const CardInformation = ({
  card,
  owner,
  inline = false,
}: {
  card: Pick<CollectiblesCard, 'mint' | 'name'> & Partial<CollectiblesCard>;
  owner?: string;
  inline?: boolean;
}) => {
  const value = getCardValue(card);
  const gradeLabel = getGradeLabel(card);
  const buybackAmount =
    card.buyback?.status === 'available' && !card.sale
      ? card.buyback.amount
      : undefined;
  const [isCopied, setIsCopied] = useState(false);
  const valueSource =
    card.listedPriceUsd !== undefined &&
    (card.insuredValue === undefined || card.listedPriceUsd > card.insuredValue)
      ? 'collectibles.card.asking_price'
      : 'collectibles.card.insured_value';

  return (
    <Box
      gap={5}
      twClassName="w-full"
      testID={
        inline
          ? 'collectibles-card-information-inline'
          : CollectiblesCardDisplayTestIds.CONTAINER
      }
    >
      {!inline && (
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={3}
        >
          <Box twClassName="w-16 overflow-hidden rounded-lg bg-muted">
            <CardImage
              uri={card.mediumImage ?? card.image}
              accessibilityLabel={getCardTitle(card)}
            />
          </Box>
          <Box twClassName="flex-1" gap={2}>
            <Text
              variant={TextVariant.BodyLg}
              fontWeight={FontWeight.Medium}
              testID={CollectiblesCardDisplayTestIds.NAME}
            >
              {getCardTitle(card)}
            </Text>
            <Box
              flexDirection={BoxFlexDirection.Row}
              flexWrap={BoxFlexWrap.Wrap}
              gap={1}
            >
              {gradeLabel && (
                <Tag severity={TagSeverity.Neutral}>{gradeLabel}</Tag>
              )}
              {card.rarity && <RarityTag rarity={card.rarity} />}
            </Box>
          </Box>
        </Box>
      )}
      {(value !== undefined || buybackAmount) && (
        <Box flexDirection={BoxFlexDirection.Row} gap={2}>
          {value !== undefined && (
            <Box
              gap={2}
              padding={3}
              twClassName="min-w-0 flex-1 rounded-xl border border-muted bg-section"
            >
              <Text
                variant={TextVariant.BodyXs}
                color={TextColor.TextAlternative}
              >
                {strings(valueSource)}
              </Text>
              <Text
                variant={TextVariant.HeadingMd}
                testID={
                  inline
                    ? `${CollectiblesCardDisplayTestIds.VALUE}-information`
                    : CollectiblesCardDisplayTestIds.VALUE
                }
              >
                {formatUsd(value)}
              </Text>
            </Box>
          )}
          {buybackAmount && (
            <Box
              gap={2}
              padding={3}
              twClassName="min-w-0 flex-1 rounded-xl border border-success-muted bg-success-muted"
            >
              <Text
                variant={TextVariant.BodyXs}
                color={TextColor.TextAlternative}
              >
                {strings('collectibles.reveal.buyback_offer')}
              </Text>
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                gap={1}
              >
                <UsdcIcon />
                <Text
                  variant={TextVariant.HeadingMd}
                  color={TextColor.SuccessDefault}
                  twClassName="shrink"
                  testID={CollectiblesBuybackOfferTestIds.AVAILABLE}
                  accessibilityLabel={strings('collectibles.usdc_amount', {
                    amount: formatUsdcAmount(buybackAmount),
                  })}
                >
                  {formatUsdcAmount(buybackAmount)}
                </Text>
              </Box>
            </Box>
          )}
        </Box>
      )}
      <Box
        twClassName={
          inline
            ? 'gap-6'
            : 'overflow-hidden rounded-xl border border-muted bg-section'
        }
      >
        <DetailSection
          inline={inline}
          title={strings('collectibles.card.grade')}
          testID={CollectiblesCardDisplayTestIds.GRADING}
          initiallyOpen
          rows={[
            {
              label: strings('collectibles.card.grading_company'),
              value: card.gradingCompany,
              testID: CollectiblesCardDisplayTestIds.GRADING_COMPANY,
            },
            {
              label: strings('collectibles.card.grading_id'),
              value: card.gradingId,
              testID: CollectiblesCardDisplayTestIds.GRADING_ID,
            },
            {
              label: strings('collectibles.card.grade'),
              value: card.grade,
              testID: CollectiblesCardDisplayTestIds.GRADE,
            },
          ]}
        />
        <DetailSection
          inline={inline}
          title={strings('collectibles.card.details')}
          testID={CollectiblesCardDisplayTestIds.DETAILS}
          rows={[
            {
              label: strings('collectibles.card.owner'),
              value: owner,
              testID: CollectiblesCardDisplayTestIds.OWNER,
            },
            {
              label: strings('collectibles.card.year'),
              value: card.year,
              testID: CollectiblesCardDisplayTestIds.YEAR,
            },
          ]}
        />
        <DetailSection
          inline={inline}
          title={strings('collectibles.card.metadata')}
          testID={CollectiblesCardDisplayTestIds.METADATA}
          rows={[
            {
              label: strings('collectibles.card.collection'),
              value: card.category,
              testID: CollectiblesCardDisplayTestIds.COLLECTION,
            },
            {
              label: strings('collectibles.card.set'),
              value: card.set,
              testID: CollectiblesCardDisplayTestIds.SET,
            },
            {
              label: strings('collectibles.card.rarity'),
              value: card.rarity ? getRarityLabel(card.rarity) : undefined,
              testID: CollectiblesCardDisplayTestIds.RARITY,
            },
          ]}
        />
        <DetailSection
          inline={inline}
          title={strings('collectibles.card.smart_contract')}
          testID={CollectiblesCardDisplayTestIds.CONTRACT}
          rows={[
            {
              label: strings('collectibles.card.token_id'),
              value: card.mint,
              testID: CollectiblesCardDisplayTestIds.TOKEN_ID,
            },
            {
              label: strings('collectibles.card.blockchain'),
              value: 'Solana',
              testID: CollectiblesCardDisplayTestIds.BLOCKCHAIN,
            },
          ]}
        >
          <ButtonIcon
            iconName={isCopied ? IconName.CopySuccess : IconName.Copy}
            accessibilityLabel={strings('collectibles.card.copy_token_id')}
            onPress={() => {
              Clipboard.setString(card.mint);
              setIsCopied(true);
            }}
            testID={CollectiblesCardDisplayTestIds.COPY_TOKEN_ID}
          />
        </DetailSection>
      </Box>
    </Box>
  );
};

export default CardInformation;
