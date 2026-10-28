import React from 'react';
import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';
import {
  AvatarBase,
  AvatarBaseShape,
  AvatarBaseSize,
  Box,
  FontWeight,
  SectionDivider,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  ActivityDetailRow,
  ActivityDetailSection,
  ActivityDetailsStatus,
} from '../../components';
import { ActivityDetailsSelectorsIDs } from '../../ActivityDetails.testIds';
import {
  formatPredictDate,
  type PredictActivityListItem,
} from './PredictDetails.types';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): reuse Predict token icon until shared asset icon is available.
import UsdcIcon from '../../../../UI/Predict/components/PredictActivityDetail/usdc.svg';

const imageStyle = StyleSheet.create({
  fill: { height: '100%', width: '100%' },
});

export function PredictHero({
  amount,
  icon,
  isPositive,
  showTokenIcon = false,
}: {
  amount: string | undefined;
  icon?: string;
  isPositive: boolean;
  showTokenIcon?: boolean;
}) {
  if (!amount) {
    return null;
  }

  return (
    <Box
      twClassName="flex-row items-center gap-3"
      testID={ActivityDetailsSelectorsIDs.AMOUNT_HEADER}
    >
      {showTokenIcon ? (
        <Box twClassName="h-8 w-8 items-center justify-center">
          <UsdcIcon
            name="Usdc"
            width={32}
            height={32}
            accessibilityLabel="USDC"
          />
        </Box>
      ) : (
        <AvatarBase
          size={AvatarBaseSize.Xl}
          shape={AvatarBaseShape.Circle}
          fallbackText="US"
        >
          {icon ? (
            <Image
              source={{ uri: icon }}
              style={imageStyle.fill}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : null}
        </AvatarBase>
      )}
      <Text
        variant={TextVariant.DisplayMd}
        color={isPositive ? TextColor.SuccessDefault : TextColor.TextDefault}
      >
        {amount}
      </Text>
    </Box>
  );
}

export function PredictMarketContext({
  icon,
  outcome,
  title,
}: {
  icon?: string;
  outcome?: string;
  title?: string;
}) {
  return (
    <Box twClassName="gap-2">
      <Box twClassName="flex-row items-center justify-between gap-2 pb-2">
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('predict.transactions.you_predicted')}
        </Text>
        {outcome ? (
          <Box twClassName="rounded bg-success-muted px-2 py-1">
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              color={TextColor.SuccessDefault}
            >
              {outcome}
            </Text>
          </Box>
        ) : null}
      </Box>
      <Box twClassName="flex-row items-center gap-3">
        <Box twClassName="h-10 w-10 overflow-hidden rounded bg-muted">
          {icon ? (
            <Image
              source={{ uri: icon }}
              style={imageStyle.fill}
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : null}
        </Box>
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          twClassName="flex-1"
        >
          {title}
        </Text>
      </Box>
      <SectionDivider marginVertical={1} />
    </Box>
  );
}

export function ClaimWinningsBreakdown({
  totalAmount,
  marketAmount,
  title,
}: {
  totalAmount: string | undefined;
  marketAmount?: string;
  title?: string;
}) {
  if (!totalAmount) {
    return null;
  }

  return (
    <ActivityDetailSection>
      <ActivityDetailRow
        label={strings('predict.transactions.total_net_pnl')}
        value={
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.SuccessDefault}
          >
            {totalAmount}
          </Text>
        }
      />
      {title ? (
        <Box twClassName="flex-row items-start justify-between gap-4 pl-3">
          <Box twClassName="flex-1 flex-row items-start gap-2">
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {'\u2022'}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              twClassName="flex-1"
            >
              {title}
            </Text>
          </Box>
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
          >
            {marketAmount ?? totalAmount}
          </Text>
        </Box>
      ) : null}
    </ActivityDetailSection>
  );
}

export function StatusAndDateRows({ item }: { item: PredictActivityListItem }) {
  return (
    <>
      <ActivityDetailRow
        label={strings('activity_details.status')}
        value={<ActivityDetailsStatus status={item.status} />}
        testID={ActivityDetailsSelectorsIDs.STATUS_ROW}
      />
      <ActivityDetailRow
        label={strings('activity_details.date')}
        value={formatPredictDate(item.timestamp)}
        testID={ActivityDetailsSelectorsIDs.DATE_ROW}
      />
    </>
  );
}
