import React, { useCallback, useMemo } from 'react';
import { BigNumber } from 'bignumber.js';
import { useSelector } from 'react-redux';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import MoneySectionHeader from '../MoneySectionHeader';
import { MoneyPotentialEarningsTestIds } from './MoneyPotentialEarnings.testIds';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import { moneyFormatFiat } from '../../utils/moneyFormatFiat';
import {
  STABLECOIN_SYMBOLS,
  tokenFiatValue,
} from '../../../Earn/hooks/useMusdConversionTokens';
import { AssetType } from '../../../../Views/confirmations/types/token';
import { isPositiveNumber } from '../../utils/number';
import PotentialEarningsTokenRow from './PotentialEarningsTokenRow';
import {
  calculateProjectedEarnings,
  PROJECTION_YEARS,
} from '../../utils/projections';

/** Number of years the projected earnings are simulated over. */
const MAX_TOKENS = 5;

/**
 * True when the token list contains at least one token with a positive fiat
 * balance — the same criterion MoneyPotentialEarnings uses before rendering.
 * Exported so parents can gate surrounding chrome (e.g. Dividers) without
 * drifting from the component's internal filter.
 */
export const hasConvertibleTokensWithBalance = (tokens: AssetType[]) =>
  tokens.some((token) => tokenFiatValue(token) > 0);

interface MoneyPotentialEarningsProps {
  tokens: AssetType[];
  /**
   * APY expressed as a percentage (e.g. 3 for 3%) used together with
   * {@link PROJECTION_YEARS} to compute the projected earnings displayed
   * alongside each token and in the headline.
   */
  apy: number | undefined;
  onTokenPress?: (token: AssetType) => void;
  onViewAllPress?: () => void;
  onHeaderPress?: () => void;
}

const MoneyPotentialEarnings = ({
  tokens,
  apy,
  onTokenPress,
  onViewAllPress,
  onHeaderPress,
}: MoneyPotentialEarningsProps) => {
  const currentCurrency = useSelector(selectCurrentCurrency);
  const apyPercent = apy ?? 0;

  // Tokens arrive pre-sorted (stablecoins first, then fiat desc) from
  // useMusdConversionTokens; strip zero-balance entries defensively — the
  // feature flag threshold may be set to 0 in some environments.
  const eligibleTokens = useMemo(
    () => tokens.filter((token) => tokenFiatValue(token) > 0),
    [tokens],
  );
  const visibleTokens = useMemo(
    () => eligibleTokens.slice(0, MAX_TOKENS),
    [eligibleTokens],
  );

  // Sum across every eligible token (not just the five we render). The "View
  // all" affordance tells users there are more rows than shown, so the
  // headline is intentionally the full projection — clipping the headline to
  // the visible five would contradict that affordance.
  const projectedAmount = useMemo(
    () =>
      eligibleTokens.reduce(
        (sum, token) =>
          sum +
          calculateProjectedEarnings(
            tokenFiatValue(token),
            apyPercent,
            PROJECTION_YEARS,
          ),
        0,
      ),
    [eligibleTokens, apyPercent],
  );

  const handleTokenPress = useCallback(
    (token: AssetType) => () => onTokenPress?.(token),
    [onTokenPress],
  );

  if (!visibleTokens.length) {
    return null;
  }

  return (
    <Box testID={MoneyPotentialEarningsTestIds.CONTAINER}>
      <Box twClassName="px-4 py-3 gap-3">
        <MoneySectionHeader
          title={strings('money.potential_earnings.title')}
          onPress={onHeaderPress}
        />

        {isPositiveNumber(projectedAmount) && (
          <Text
            variant={TextVariant.HeadingMd}
            fontWeight={FontWeight.Bold}
            color={TextColor.SuccessDefault}
            testID={MoneyPotentialEarningsTestIds.TEXT}
          >
            {`+${moneyFormatFiat(new BigNumber(projectedAmount), currentCurrency)}`}
          </Text>
        )}

        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Regular}
          color={TextColor.TextAlternative}
        >
          {strings('money.potential_earnings.description')}
        </Text>
      </Box>

      <>
        {visibleTokens.map((token) => (
          <PotentialEarningsTokenRow
            key={`${token.address}-${token.chainId}`}
            token={token}
            hasSubsidizedFee={STABLECOIN_SYMBOLS.has(token.symbol)}
            apyPercent={apyPercent}
            onPress={handleTokenPress(token)}
          />
        ))}

        <Box twClassName="px-4 py-3">
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Lg}
            isFullWidth
            onPress={onViewAllPress}
            testID={MoneyPotentialEarningsTestIds.VIEW_ALL_BUTTON}
          >
            {strings('money.potential_earnings.view_all')}
          </Button>
        </Box>
      </>
    </Box>
  );
};

export default MoneyPotentialEarnings;
