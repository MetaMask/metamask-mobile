import React, { useCallback, useMemo } from 'react';
import { BigNumber } from 'bignumber.js';
import { useSelector } from 'react-redux';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
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
import { useProjectedEarnings } from '../../hooks/useProjectedEarnings';

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
   * APY expressed as a percentage (e.g. 3 for 3%) used together with the
   * shared projection horizon to compute the projected earnings displayed
   * alongside each token and in the description.
   */
  apy: number | undefined;
  onTokenPress?: (token: AssetType) => void;
  onViewAllPress?: () => void;
  onHeaderPress?: () => void;
  /**
   * Called when the inline info button next to the section title is pressed.
   * Typically navigates to the Earn-on-your-crypto info bottom sheet.
   */
  onInfoPress?: () => void;
}

const MoneyPotentialEarnings = ({
  tokens,
  apy,
  onTokenPress,
  onViewAllPress,
  onHeaderPress,
  onInfoPress,
}: MoneyPotentialEarningsProps) => {
  const currentCurrency = useSelector(selectCurrentCurrency);
  const apyPercent = apy ?? 0;

  // Tokens arrive pre-sorted (stablecoins first, then fiat desc) from
  // useMusdConversionTokens; the hook strips zero-balance entries
  // defensively, since the feature flag threshold may be set to 0 in some
  // environments.
  //
  // Sum across every eligible token (not just the five we render). The "View
  // all" affordance tells users there are more rows than shown, so the
  // headline is intentionally the full projection — clipping the headline to
  // the visible five would contradict that affordance.
  const { eligibleTokens, totalAssetsFiat, projectedAmount } =
    useProjectedEarnings(tokens, apyPercent);
  const visibleTokens = useMemo(
    () => eligibleTokens.slice(0, MAX_TOKENS),
    [eligibleTokens],
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

        {isPositiveNumber(projectedAmount) &&
        isPositiveNumber(totalAssetsFiat) ? (
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Regular}
            color={TextColor.TextAlternative}
            testID={MoneyPotentialEarningsTestIds.TEXT}
          >
            {`${strings(
              'money.potential_earnings.description_with_amounts_prefix',
              {
                total: moneyFormatFiat(
                  new BigNumber(totalAssetsFiat),
                  currentCurrency,
                ),
              },
            )} `}
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={TextColor.SuccessDefault}
            >
              {`+${moneyFormatFiat(new BigNumber(projectedAmount), currentCurrency)}`}
            </Text>
            {` ${strings(
              'money.potential_earnings.description_with_amounts_suffix',
            )}`}
            {onInfoPress && (
              <>
                {' '}
                <Icon
                  testID={MoneyPotentialEarningsTestIds.INFO_BUTTON}
                  name={IconName.Info}
                  size={IconSize.Sm}
                  color={IconColor.IconAlternative}
                  style={{ transform: [{ translateY: 3 }] }}
                  onPress={onInfoPress}
                />
              </>
            )}
          </Text>
        ) : (
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Regular}
            color={TextColor.TextAlternative}
          >
            {strings('money.potential_earnings.description')}
            {onInfoPress && (
              <>
                {' '}
                <Icon
                  testID={MoneyPotentialEarningsTestIds.INFO_BUTTON}
                  onPress={onInfoPress}
                  name={IconName.Info}
                  size={IconSize.Sm}
                  color={IconColor.IconAlternative}
                  style={{ transform: [{ translateY: 3 }] }}
                />
              </>
            )}
          </Text>
        )}
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

        {eligibleTokens.length > MAX_TOKENS && (
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
        )}
      </>
    </Box>
  );
};

export default MoneyPotentialEarnings;
