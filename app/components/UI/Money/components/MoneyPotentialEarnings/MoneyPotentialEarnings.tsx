import React, { useCallback, useMemo } from 'react';
import { BigNumber } from 'bignumber.js';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxFlexWrap,
  FontWeight,
  SensitiveText,
  SensitiveTextLength,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import MoneySectionHeader from '../MoneySectionHeader';
import { MoneyPotentialEarningsTestIds } from './MoneyPotentialEarnings.testIds';
import { moneyFormatFiat } from '../../utils/moneyFormatFiat';
import { isPositiveNumber } from '../../utils/number';
import PotentialEarningsTokenRow from './PotentialEarningsTokenRow';
import { useProjectedEarnings } from '../../hooks/useProjectedEarnings';
import type { MoneyDepositAsset } from '../../selectors/depositTokens';
import { useTheme } from '../../../../../util/theme';
import DottedUnderline from '../../../../../component-library/components-temp/DottedUnderline';
import InlineTextFlow from '../../../../../component-library/components-temp/InlineTextFlow';
import { Pressable } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

const VISIBLE_TOKENS_COUNT = 5;

interface MoneyPotentialEarningsProps {
  tokens: MoneyDepositAsset[];
  /**
   * APY expressed as a decimal (e.g. 0.03 for 3%) used together with the
   * shared projection horizon to compute the projected earnings displayed
   * alongside each token and in the description.
   */
  apyDecimal: number | undefined;
  onProjectedAmountPress: () => void;
  /**
   * Returns true when the given token qualifies for a subsidised (no-fee)
   * deposit into the Money account. Used to render the "No fee" badge on
   * each token row.
   */
  isNoFeeToken?: (token: MoneyDepositAsset) => boolean;
  onTokenCardPress?: (
    token: MoneyDepositAsset,
    index: number,
    tokensCount: number,
  ) => void;
  onTokenButtonPress?: (
    token: MoneyDepositAsset,
    index: number,
    tokensCount: number,
  ) => void;
  onHeaderPress?: () => void;
  /** Whether each token's balance/projected values should be masked. */
  privacyMode?: boolean;
}

const MoneyPotentialEarnings = ({
  tokens,
  apyDecimal = 0,
  onProjectedAmountPress,
  isNoFeeToken = () => false,
  onTokenCardPress,
  onTokenButtonPress,
  onHeaderPress,
  privacyMode = false,
}: MoneyPotentialEarningsProps) => {
  const { colors } = useTheme();
  const tw = useTailwind();
  // Sum across every eligible token (not just the five we render). The "View
  // all" affordance tells users there are more rows than shown, so the
  // headline is intentionally the full projection — clipping the headline to
  // the visible five would contradict that affordance.
  const { eligibleTokens, totalAssetsFiat, projectedAmount, currency } =
    useProjectedEarnings(tokens, apyDecimal);
  const visibleTokens = useMemo(
    () => eligibleTokens.slice(0, VISIBLE_TOKENS_COUNT),
    [eligibleTokens],
  );
  const hasMoreTokens = eligibleTokens.length > VISIBLE_TOKENS_COUNT;

  const handleTokenCardPress = useCallback(
    (token: MoneyDepositAsset, index: number) => () => {
      onTokenCardPress?.(token, index, eligibleTokens.length);
    },
    [onTokenCardPress, eligibleTokens.length],
  );

  const handleTokenButtonPress = useCallback(
    (token: MoneyDepositAsset, index: number) => () => {
      onTokenButtonPress?.(token, index, eligibleTokens.length);
    },
    [onTokenButtonPress, eligibleTokens.length],
  );

  if (!visibleTokens.length) {
    return null;
  }

  return (
    <Box testID={MoneyPotentialEarningsTestIds.CONTAINER}>
      <Box twClassName="px-4 py-3 gap-3">
        <MoneySectionHeader
          title={strings('money.potential_earnings.title')}
          onPress={hasMoreTokens && onHeaderPress ? onHeaderPress : undefined}
        />

        {isPositiveNumber(projectedAmount) &&
        isPositiveNumber(totalAssetsFiat) ? (
          <Box
            flexDirection={BoxFlexDirection.Row}
            flexWrap={BoxFlexWrap.Wrap}
            alignItems={BoxAlignItems.Center}
            testID={MoneyPotentialEarningsTestIds.TEXT}
          >
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Regular}
              color={TextColor.TextAlternative}
              twClassName="shrink-0"
            >
              {`${strings(
                'money.potential_earnings.description_with_amounts_prefix',
              )} `}
            </Text>
            <SensitiveText
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Regular}
              color={TextColor.TextAlternative}
              isHidden={privacyMode}
              length={SensitiveTextLength.Medium}
              testID={MoneyPotentialEarningsTestIds.TOTAL}
            >
              {moneyFormatFiat(new BigNumber(totalAssetsFiat), currency)}
            </SensitiveText>
            <InlineTextFlow
              text={strings(
                'money.potential_earnings.description_with_amounts_middle',
              )}
              keyPrefix="potential-earnings-middle"
              color={TextColor.TextAlternative}
              fontWeight={FontWeight.Regular}
              variant={TextVariant.BodyMd}
              leadingSpace
            />
            <Pressable
              style={({ pressed }) => tw.style(pressed && 'opacity-50')}
              onPress={onProjectedAmountPress}
            >
              <DottedUnderline
                color={colors.success.default}
                twClassName="shrink-0"
              >
                <SensitiveText
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.SuccessDefault}
                  isHidden={privacyMode}
                  length={SensitiveTextLength.Short}
                  testID={MoneyPotentialEarningsTestIds.PROJECTED}
                >
                  {`+${moneyFormatFiat(new BigNumber(projectedAmount), currency)}`}
                </SensitiveText>
              </DottedUnderline>
            </Pressable>
            <InlineTextFlow
              text={strings(
                'money.potential_earnings.description_with_amounts_suffix',
              )}
              keyPrefix="potential-earnings-suffix"
              color={TextColor.TextAlternative}
              fontWeight={FontWeight.Regular}
              variant={TextVariant.BodyMd}
              leadingSpace
            />
          </Box>
        ) : (
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Regular}
            color={TextColor.TextAlternative}
          >
            {strings('money.potential_earnings.description')}
          </Text>
        )}
      </Box>
      {visibleTokens.map((token, index) => (
        <PotentialEarningsTokenRow
          key={`${token.address}-${token.chainId}`}
          token={token}
          hasSubsidizedFee={isNoFeeToken(token)}
          apyDecimal={apyDecimal}
          onCardPress={handleTokenCardPress(token, index)}
          onButtonPress={handleTokenButtonPress(token, index)}
          privacyMode={privacyMode}
        />
      ))}
    </Box>
  );
};

export default MoneyPotentialEarnings;
