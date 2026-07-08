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
import { AssetType } from '../../../../Views/confirmations/types/token';
import { isPositiveNumber } from '../../utils/number';
import PotentialEarningsTokenRow from './PotentialEarningsTokenRow';
import { useProjectedEarnings } from '../../hooks/useProjectedEarnings';

const VISIBLE_TOKENS_COUNT = 5;

interface MoneyPotentialEarningsProps {
  tokens: AssetType[];
  /**
   * APY expressed as a decimal (e.g. 0.03 for 3%) used together with the
   * shared projection horizon to compute the projected earnings displayed
   * alongside each token and in the description.
   */
  apyDecimal: number | undefined;
  /**
   * Returns true when the given token qualifies for a subsidised (no-fee)
   * deposit into the Money account. Used to render the "No fee" badge on
   * each token row.
   */
  isNoFeeToken?: (token: AssetType) => boolean;
  onTokenCardPress?: (
    token: AssetType,
    index: number,
    tokensCount: number,
  ) => void;
  onTokenButtonPress?: (
    token: AssetType,
    index: number,
    tokensCount: number,
  ) => void;
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
  apyDecimal = 0,
  isNoFeeToken = () => false,
  onTokenCardPress,
  onTokenButtonPress,
  onViewAllPress,
  onHeaderPress,
  onInfoPress,
}: MoneyPotentialEarningsProps) => {
  const currentCurrency = useSelector(selectCurrentCurrency);

  // Sum across every eligible token (not just the five we render). The "View
  // all" affordance tells users there are more rows than shown, so the
  // headline is intentionally the full projection — clipping the headline to
  // the visible five would contradict that affordance.
  const { eligibleTokens, totalAssetsFiat, projectedAmount } =
    useProjectedEarnings(tokens, apyDecimal);
  const visibleTokens = useMemo(
    () => eligibleTokens.slice(0, VISIBLE_TOKENS_COUNT),
    [eligibleTokens],
  );
  const hasMoreTokens = eligibleTokens.length > VISIBLE_TOKENS_COUNT;

  const handleTokenCardPress = useCallback(
    (token: AssetType, index: number) => () => {
      onTokenCardPress?.(token, index, eligibleTokens.length);
    },
    [onTokenCardPress, eligibleTokens.length],
  );

  const handleTokenButtonPress = useCallback(
    (token: AssetType, index: number) => () => {
      onTokenButtonPress?.(token, index, eligibleTokens.length);
    },
    [onTokenButtonPress, eligibleTokens.length],
  );

  if (!visibleTokens.length) {
    return null;
  }

  const infoIcon = onInfoPress ? (
    <>
      {' '}
      <Text twClassName="align-middle">
        <Icon
          testID={MoneyPotentialEarningsTestIds.INFO_BUTTON}
          name={IconName.Info}
          size={IconSize.Sm}
          color={IconColor.IconAlternative}
          onPress={onInfoPress}
        />
      </Text>
    </>
  ) : null;

  return (
    <Box testID={MoneyPotentialEarningsTestIds.CONTAINER}>
      <Box twClassName="px-4 py-3 gap-3">
        <MoneySectionHeader
          title={strings('money.potential_earnings.title')}
          onPress={hasMoreTokens ? onHeaderPress : undefined}
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
            {infoIcon}
          </Text>
        ) : (
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Regular}
            color={TextColor.TextAlternative}
          >
            {strings('money.potential_earnings.description')}
            {infoIcon}
          </Text>
        )}
      </Box>

      <>
        {visibleTokens.map((token, index) => (
          <PotentialEarningsTokenRow
            key={`${token.address}-${token.chainId}`}
            token={token}
            hasSubsidizedFee={isNoFeeToken(token)}
            apyDecimal={apyDecimal}
            onCardPress={handleTokenCardPress(token, index)}
            onButtonPress={handleTokenButtonPress(token, index)}
          />
        ))}

        {hasMoreTokens && (
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
