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
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../locales/i18n';
import type { PredictPosition } from '../../../types';
import { PredictPortfolioScreenTestIds } from '../PredictPortfolioScreen.testIds';
import { getEntryTitle, getOutcomeName } from '../../../utils/entryCopy';
import { formatPositionPnl } from '../../../utils/positionValue';
import {
  formatSharesAmount,
  formatUsdAmount,
  pnlToneClassName,
} from '../../../utils/portfolioFormatting';

interface PortfolioPositionRowProps {
  position: PredictPosition;
  isPrivacyMode: boolean;
  onPress?: (position: PredictPosition) => void;
}

interface PortfolioPositionMetricsProps {
  position: PredictPosition;
  isPrivacyMode: boolean;
}

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
    <>
      {currentValue === undefined ? (
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
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
          fontWeight={FontWeight.Medium}
          className={pnlToneClassName(unrealizedPnl)}
          isHidden={isPrivacyMode}
          length={SensitiveTextLength.Short}
          testID={PredictPortfolioScreenTestIds.POSITION_ROW_PNL}
        >
          {formatPositionPnl(unrealizedPnl, unrealizedPnlPercent)}
        </SensitiveText>
      )}
    </>
  );
};

/** Renders one Position as an optionally pressable row. Resolved Positions
 * carry a status tag. */
export const PortfolioPositionRow = ({
  position,
  isPrivacyMode,
  onPress,
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
      style={tw.style('flex-row items-start gap-4 py-2')}
      testID={PredictPortfolioScreenTestIds.POSITION_ROW}
    >
      <Box className="pt-1">
        <Box className="size-10 overflow-hidden rounded-full bg-muted">
          {context?.imageUrl ? (
            <Image
              source={{ uri: context.imageUrl }}
              style={tw.style('h-full w-full')}
              accessibilityLabel={title}
            />
          ) : (
            <Box
              className="size-full items-center justify-center"
              testID={PredictPortfolioScreenTestIds.POSITION_ROW_FALLBACK_ICON}
            >
              <Icon name={IconName.Tag} />
            </Box>
          )}
        </Box>
      </Box>
      <Box className="flex-1">
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {title}
        </Text>
        {context?.marketQuestion ? (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            numberOfLines={1}
          >
            {context.marketQuestion}
          </Text>
        ) : null}
        <SensitiveText
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
          isHidden={isPrivacyMode}
          length={SensitiveTextLength.Short}
        >
          {metaLine}
        </SensitiveText>
      </Box>
      <Box alignItems={BoxAlignItems.End}>
        <PortfolioPositionMetrics
          position={position}
          isPrivacyMode={isPrivacyMode}
        />
        {status === 'open' ? null : (
          <Text
            variant={TextVariant.BodyXs}
            color={TextColor.TextAlternative}
            className="mt-1"
            testID={PredictPortfolioScreenTestIds.POSITION_ROW_STATUS}
          >
            {strings(`predict_next.portfolio.position_status.${status}`)}
          </Text>
        )}
      </Box>
    </TouchableOpacity>
  );
};
