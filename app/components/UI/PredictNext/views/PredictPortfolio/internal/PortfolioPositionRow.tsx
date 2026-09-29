import React from 'react';
import { Image } from 'expo-image';
import { TouchableOpacity } from 'react-native';
import {
  Box,
  BoxAlignItems,
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
import {
  formatSignedUsdAmount,
  formatSharesAmount,
  formatUsdAmount,
  isNonZeroAmount,
} from './portfolioFormatting';

interface PortfolioPositionRowProps {
  position: PredictPosition;
  isPrivacyMode: boolean;
  onPress?: (position: PredictPosition) => void;
}

interface PortfolioPositionMetricsProps {
  position: PredictPosition;
  isPrivacyMode: boolean;
}

/** Trailing exposure and signed realized PnL; renders nothing when both are absent. */
const PortfolioPositionMetrics = ({
  position,
  isPrivacyMode,
}: PortfolioPositionMetricsProps) => {
  const { marketExposure, realizedPnl } = position;
  const realizedPnlText =
    realizedPnl && isNonZeroAmount(realizedPnl)
      ? formatSignedUsdAmount(realizedPnl)
      : undefined;

  if (!marketExposure && !realizedPnlText) {
    return null;
  }

  return (
    <Box alignItems={BoxAlignItems.End}>
      {marketExposure ? (
        <SensitiveText
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          isHidden={isPrivacyMode}
          length={SensitiveTextLength.Short}
        >
          {formatUsdAmount(marketExposure)}
        </SensitiveText>
      ) : null}
      {realizedPnlText ? (
        <SensitiveText
          variant={TextVariant.BodySm}
          twClassName={
            realizedPnlText.startsWith('-')
              ? 'text-error-default'
              : 'text-success-default'
          }
          isHidden={isPrivacyMode}
          length={SensitiveTextLength.Short}
        >
          {realizedPnlText}
        </SensitiveText>
      ) : null}
    </Box>
  );
};

/** Renders one open Position as an optionally pressable row. */
export const PortfolioPositionRow = ({
  position,
  isPrivacyMode,
  onPress,
}: PortfolioPositionRowProps) => {
  const tw = useTailwind();
  const { context } = position;
  const title = context?.eventTitle ?? position.marketId;
  const outcomeLabel = context?.outcomeLabel ?? position.side;
  const metaLine = strings('predict_next.portfolio.outcome_shares', {
    outcome: outcomeLabel,
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
        {context?.eventImageUrl ? (
          <Image
            source={{ uri: context.eventImageUrl }}
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
      <PortfolioPositionMetrics
        position={position}
        isPrivacyMode={isPrivacyMode}
      />
    </TouchableOpacity>
  );
};
