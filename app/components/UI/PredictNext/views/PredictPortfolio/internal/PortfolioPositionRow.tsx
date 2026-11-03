import React from 'react';
import { Image } from 'expo-image';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  BoxAlignItems,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Icon,
  IconName,
  SensitiveText,
  SensitiveTextLength,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../locales/i18n';
import type { PredictPosition } from '../../../types';
import { PredictPortfolioScreenTestIds } from '../PredictPortfolioScreen.testIds';
import { getEntryTitle, getOutcomeName } from '../../../utils/entryCopy';
import {
  formatSignedPercent,
  formatSignedUsdAmount,
  formatSharesAmount,
  formatUsdAmount,
  pnlToneClassName,
} from './portfolioFormatting';

interface PortfolioPositionRowProps {
  position: PredictPosition;
  isPrivacyMode: boolean;
  onPress?: (position: PredictPosition) => void;
  /** Shows the Cash Out affordance for selling an open Position back. */
  onCashOut?: (position: PredictPosition) => void;
}

interface PortfolioPositionMetricsProps {
  position: PredictPosition;
  isPrivacyMode: boolean;
}

/** The signed unrealized PnL, with its percent when the backend sent one. */
const formatPositionPnl = (
  unrealizedPnl: string,
  unrealizedPnlPercent?: string,
): string => {
  const amount = formatSignedUsdAmount(unrealizedPnl);
  return unrealizedPnlPercent === undefined
    ? amount
    : strings('predict_next.portfolio.pnl_with_percent', {
        amount,
        percent: formatSignedPercent(unrealizedPnlPercent),
      });
};

/**
 * Trailing current value and unrealized PnL. A Position without a current
 * value has no authoritative price: it says so instead of showing a value,
 * and never renders as $0.00. PnL renders only when the backend sent it.
 */
const PortfolioPositionMetrics = ({
  position,
  isPrivacyMode,
}: PortfolioPositionMetricsProps) => {
  const { currentValue, unrealizedPnl, unrealizedPnlPercent } = position;

  return (
    <Box alignItems={BoxAlignItems.End}>
      {currentValue === undefined ? (
        <Text
          variant={TextVariant.BodySm}
          twClassName="text-alternative"
          testID={PredictPortfolioScreenTestIds.POSITION_ROW_VALUE_UNAVAILABLE}
        >
          {strings('predict_next.portfolio.value_unavailable')}
        </Text>
      ) : (
        <SensitiveText
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          isHidden={isPrivacyMode}
          length={SensitiveTextLength.Short}
          testID={PredictPortfolioScreenTestIds.POSITION_ROW_VALUE}
        >
          {formatUsdAmount(currentValue)}
        </SensitiveText>
      )}
      {unrealizedPnl === undefined ? null : (
        <SensitiveText
          variant={TextVariant.BodySm}
          twClassName={pnlToneClassName(unrealizedPnl)}
          isHidden={isPrivacyMode}
          length={SensitiveTextLength.Short}
          testID={PredictPortfolioScreenTestIds.POSITION_ROW_PNL}
        >
          {formatPositionPnl(unrealizedPnl, unrealizedPnlPercent)}
        </SensitiveText>
      )}
    </Box>
  );
};

/** Renders one Position as an optionally pressable row. Resolved Positions
 * carry a status tag; only open ones offer Cash Out. */
export const PortfolioPositionRow = ({
  position,
  isPrivacyMode,
  onPress,
  onCashOut,
}: PortfolioPositionRowProps) => {
  const tw = useTailwind();
  const { context, status } = position;
  const title = getEntryTitle(context);
  const metaLine = strings('predict_next.portfolio.outcome_shares', {
    outcome: getOutcomeName(position.side, context),
    shares: formatSharesAmount(position.shares),
  });

  return (
    <TouchableOpacity
      onPress={onPress ? () => onPress(position) : undefined}
      disabled={!onPress}
      style={tw.style('flex-row items-center py-2')}
      testID={PredictPortfolioScreenTestIds.POSITION_ROW}
    >
      <Box twClassName="mr-3 h-10 w-10 overflow-hidden rounded-lg bg-muted">
        {context?.imageUrl ? (
          <Image
            source={{ uri: context.imageUrl }}
            style={tw.style('h-full w-full')}
            accessibilityLabel={title}
          />
        ) : (
          <Box
            twClassName="h-full w-full items-center justify-center"
            testID={PredictPortfolioScreenTestIds.POSITION_ROW_FALLBACK_ICON}
          >
            <Icon name={IconName.Tag} />
          </Box>
        )}
      </Box>
      <Box twClassName="flex-1 pr-3">
        <Text variant={TextVariant.BodyMd} numberOfLines={1}>
          {title}
        </Text>
        {context?.marketQuestion ? (
          <Text
            variant={TextVariant.BodySm}
            twClassName="text-alternative"
            numberOfLines={1}
          >
            {context.marketQuestion}
          </Text>
        ) : null}
        <SensitiveText
          variant={TextVariant.BodySm}
          twClassName="text-alternative"
          isHidden={isPrivacyMode}
          length={SensitiveTextLength.Short}
        >
          {metaLine}
        </SensitiveText>
      </Box>
      <Box twClassName="flex-1 items-end gap-1 pr-1">
        <PortfolioPositionMetrics
          position={position}
          isPrivacyMode={isPrivacyMode}
        />
        {status === 'open' ? null : (
          <Text
            variant={TextVariant.BodyXs}
            twClassName="text-alternative"
            testID={PredictPortfolioScreenTestIds.POSITION_ROW_STATUS}
          >
            {strings(`predict_next.portfolio.position_status.${status}`)}
          </Text>
        )}
        {onCashOut && status === 'open' ? (
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Sm}
            onPress={() => onCashOut(position)}
            testID={PredictPortfolioScreenTestIds.POSITION_ROW_CASH_OUT}
          >
            <Text variant={TextVariant.BodySm} fontWeight={FontWeight.Medium}>
              {strings('predict_next.portfolio.cash_out')}
            </Text>
          </Button>
        ) : null}
      </Box>
    </TouchableOpacity>
  );
};
