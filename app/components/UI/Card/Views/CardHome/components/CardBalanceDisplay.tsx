import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  IconColor,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { Skeleton } from '../../../../../../component-library/components-temp/Skeleton';
import MoneyBalanceSummary from '../../../../Money/components/MoneyBalanceSummary';
import { CardHomeSelectors } from '../CardHome.testIds';
import {
  TOKEN_BALANCE_LOADING,
  TOKEN_BALANCE_LOADING_UPPERCASE,
} from '../../../../Tokens/constants';
import I18n, { strings } from '../../../../../../../locales/i18n';
import { formatWithThreshold } from '../../../../../../util/assets';
import type { MoneyBalanceDisplayState } from '../../../../Money/types';

/**
 * True when the amount would render as a bare "0": missing, empty, or a
 * plain zero figure. Token-unit strings like "0.000000 USDC" are left alone
 * so their unit stays visible.
 */
export const isBareZeroBalanceAmount = (
  amount: string | undefined,
): boolean => {
  if (amount === undefined) {
    return true;
  }
  const trimmed = amount.trim();
  if (trimmed === '') {
    return true;
  }
  return /^0(?:\.0+)?$/.test(trimmed);
};

/**
 * A zero balance rendered as currency ("$0.00") instead of a bare "0".
 * Falls back to USD when no currency is available.
 */
export const formatCardHomeZeroBalance = (currentCurrency?: string): string => {
  const currency =
    typeof currentCurrency === 'string' && currentCurrency.trim() !== ''
      ? currentCurrency.trim().toUpperCase()
      : 'USD';
  return formatWithThreshold(0, 0.01, I18n.locale ?? 'en-US', {
    style: 'currency',
    currency,
  });
};

interface CardBalanceDisplayProps {
  isLoading: boolean;
  balanceAmount: string | undefined;
  privacyMode: boolean;
  onTogglePrivacy: (value: boolean) => void;
  /** Currency for the zero-balance figure; uppercased, falls back to USD. */
  currentCurrency?: string;
  showInfoBadge?: boolean;
  onInfoPress?: () => void;
  infoBadgeTestID?: string;
  /** Balance could not be read. Renders a dash instead of zero. */
  isUnavailable?: boolean;
}

/**
 * Card home balance header. Reuses the Money home balance header
 * (`MoneyBalanceSummary`) as-is so both screens show the balance at the same
 * size and position; tapping the amount toggles privacy, as on Money home.
 * The "Available balance" line sits where Money home shows its APY line.
 */
const CardBalanceDisplay = ({
  isLoading,
  balanceAmount,
  privacyMode,
  onTogglePrivacy,
  currentCurrency,
  showInfoBadge = false,
  onInfoPress,
  infoBadgeTestID,
  isUnavailable = false,
}: CardBalanceDisplayProps) => {
  const isBalanceLoading =
    isLoading ||
    balanceAmount === TOKEN_BALANCE_LOADING ||
    balanceAmount === TOKEN_BALANCE_LOADING_UPPERCASE;

  if (isBalanceLoading) {
    // Same padding as MoneyBalanceSummary; h-14 matches the AmountDisplayLg line height.
    // The subtitle row keeps its height so the card art does not shift when
    // "Available balance" arrives (same block as CardHomeLoadingSkeleton).
    return (
      <>
        <Box twClassName="px-4 pt-1" testID={CardHomeSelectors.BALANCE_HEADER}>
          <Skeleton
            twClassName="h-14 w-40 rounded-xl"
            testID={CardHomeSelectors.BALANCE_SKELETON}
          />
        </Box>
        <Box twClassName="px-4 mt-1 h-6 justify-center">
          <Skeleton
            twClassName="h-5 w-36 rounded-md"
            testID={CardHomeSelectors.BALANCE_SUBTITLE_SKELETON}
          />
        </Box>
      </>
    );
  }

  const displayState: MoneyBalanceDisplayState = isUnavailable
    ? { kind: 'unavailable' }
    : {
        kind: 'balance',
        value: isBareZeroBalanceAmount(balanceAmount)
          ? formatCardHomeZeroBalance(currentCurrency)
          : (balanceAmount as string),
      };

  return (
    <Box testID={CardHomeSelectors.BALANCE_HEADER}>
      <MoneyBalanceSummary
        apy={undefined}
        displayState={displayState}
        privacyMode={privacyMode}
        onBalancePress={() => onTogglePrivacy(!privacyMode)}
      />
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="px-4 mt-1 gap-1"
      >
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
        >
          {strings('card.card_home.available_balance')}
        </Text>
        {showInfoBadge ? (
          <ButtonIcon
            iconName={IconName.Info}
            size={ButtonIconSize.Sm}
            iconProps={{ color: IconColor.IconAlternative }}
            onPress={onInfoPress}
            accessibilityLabel={strings('card.card_home.available_balance')}
            testID={infoBadgeTestID}
          />
        ) : null}
      </Box>
    </Box>
  );
};

export default CardBalanceDisplay;
