import React, { useMemo } from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useIsFocused } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../../../component-library/components/Texts/SensitiveText';
import {
  TextColor as ComponentTextColor,
  TextVariant as ComponentTextVariant,
} from '../../../../../component-library/components/Texts/Text/Text.types';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import { usePredictCashOut } from '../../hooks/usePredictCashOut';
import { usePredictClaim } from '../../hooks/usePredictClaim';
import { usePredictOrderPreview } from '../../hooks/usePredictOrderPreview';
import {
  getPredictCryptoUpDownPositionSelector,
  PredictCryptoUpDownPositionsSelectorsIDs,
} from '../../Predict.testIds';
import {
  PredictMarketStatus,
  Side,
  type PredictMarket,
  type PredictPosition,
} from '../../types';
import { formatCents, formatPrice } from '../../utils/format';

const AUTO_REFRESH_TIMEOUT = 5000;

export interface PredictCryptoUpDownPositionProps {
  position: PredictPosition;
  market: PredictMarket;
  marketStatus: PredictMarketStatus;
}

const PredictCryptoUpDownPosition: React.FC<
  PredictCryptoUpDownPositionProps
> = ({ position, market, marketStatus }) => {
  const tw = useTailwind();
  const privacyMode = useSelector(selectPrivacyMode);
  const isFocused = useIsFocused();

  const { onCashOut } = usePredictCashOut({
    market,
    callerName: 'PredictCryptoUpDownPosition',
  });
  const { claim } = usePredictClaim();

  const isOpen = marketStatus === PredictMarketStatus.OPEN;
  const autoRefreshTimeout =
    isFocused && isOpen ? AUTO_REFRESH_TIMEOUT : undefined;

  const { preview, isLoading: isPreviewLoading } = usePredictOrderPreview({
    marketId: position.marketId,
    outcomeId: position.outcomeId,
    outcomeTokenId: position.outcomeTokenId,
    side: Side.SELL,
    size: position.size,
    autoRefreshTimeout,
  });

  const outcomeToken = useMemo(
    () =>
      market.outcomes
        .find((o) => o.id === position.outcomeId)
        ?.tokens.find((t) => t.id === position.outcomeTokenId),
    [market.outcomes, position.outcomeId, position.outcomeTokenId],
  );

  const outcomeLabel = outcomeToken?.title ?? position.outcome;

  const isUpSide = useMemo(() => {
    const outcome = market.outcomes.find((o) => o.id === position.outcomeId);
    const tokenIndex =
      outcome?.tokens.findIndex((t) => t.id === position.outcomeTokenId) ?? -1;
    return tokenIndex === 0;
  }, [market.outcomes, position.outcomeId, position.outcomeTokenId]);

  const outcomeColor = isUpSide
    ? TextColor.SuccessDefault
    : TextColor.ErrorDefault;

  const entryLabel = `${strings('predict.market_details.entry')} ${formatCents(
    position.avgPrice,
  )}`;

  const currentValue = preview
    ? preview.minAmountReceived
    : position.currentValue;
  const cashPnl = useMemo(
    () => currentValue - position.initialValue,
    [currentValue, position.initialValue],
  );

  const isPnlPositive = cashPnl >= 0;
  const isClaimable = !isOpen && position.claimable && cashPnl > 0;
  const showSkeleton = isOpen && (position.optimistic || isPreviewLoading);

  const formattedAmount = formatPrice(Math.abs(cashPnl));
  const signedAmount = isPnlPositive ? formattedAmount : `-${formattedAmount}`;

  const renderValueText = () => {
    if (showSkeleton) {
      return <Skeleton width={70} height={18} />;
    }

    if (isOpen) {
      return (
        <SensitiveText
          variant={ComponentTextVariant.BodySMMedium}
          color={
            isPnlPositive
              ? ComponentTextColor.Success
              : ComponentTextColor.Error
          }
          isHidden={privacyMode}
          length={SensitiveTextLength.Short}
        >
          {signedAmount}
        </SensitiveText>
      );
    }

    if (cashPnl > 0) {
      return (
        <SensitiveText
          variant={ComponentTextVariant.BodySMMedium}
          color={ComponentTextColor.Success}
          isHidden={privacyMode}
          length={SensitiveTextLength.Medium}
        >
          {strings('predict.market_details.won')} {formatPrice(currentValue)}
        </SensitiveText>
      );
    }

    return (
      <SensitiveText
        variant={ComponentTextVariant.BodySMMedium}
        color={ComponentTextColor.Error}
        isHidden={privacyMode}
        length={SensitiveTextLength.Medium}
      >
        {strings('predict.market_details.lost')}{' '}
        {formatPrice(position.initialValue)}
      </SensitiveText>
    );
  };

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="w-full py-3 gap-3"
      testID={getPredictCryptoUpDownPositionSelector.row(position.id)}
    >
      <Box twClassName="flex-1 gap-1">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-1"
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={outcomeColor}
          >
            {outcomeLabel}
          </Text>
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {' · '}
            {entryLabel}
          </Text>
        </Box>
        {renderValueText()}
      </Box>
      {isOpen && (
        <Button
          testID={getPredictCryptoUpDownPositionSelector.cashOutButton(
            position.id,
          )}
          variant={ButtonVariants.Secondary}
          size={ButtonSize.Md}
          label={strings('predict.cash_out')}
          onPress={() => onCashOut(position)}
          isDisabled={position.optimistic}
          style={tw.style('shrink-0')}
        />
      )}
      {isClaimable && (
        <Button
          testID={getPredictCryptoUpDownPositionSelector.claimButton(
            position.id,
          )}
          variant={ButtonVariants.Secondary}
          size={ButtonSize.Md}
          label={strings('predict.market_details.claim')}
          onPress={() => {
            claim();
          }}
          style={tw.style('shrink-0')}
        />
      )}
    </Box>
  );
};

PredictCryptoUpDownPosition.displayName = 'PredictCryptoUpDownPosition';

export { PredictCryptoUpDownPositionsSelectorsIDs };
export default PredictCryptoUpDownPosition;
