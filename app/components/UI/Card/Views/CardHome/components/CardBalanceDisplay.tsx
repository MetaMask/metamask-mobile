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
import { strings } from '../../../../../../../locales/i18n';
import type { MoneyBalanceDisplayState } from '../../../../Money/types';

interface CardBalanceDisplayProps {
  isLoading: boolean;
  balanceAmount: string | undefined;
  privacyMode: boolean;
  onTogglePrivacy: (value: boolean) => void;
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
    return (
      <Box twClassName="px-4 pt-1" testID={CardHomeSelectors.BALANCE_HEADER}>
        <Skeleton
          twClassName="h-14 w-40 rounded-xl"
          testID={CardHomeSelectors.BALANCE_SKELETON}
        />
      </Box>
    );
  }

  const displayState: MoneyBalanceDisplayState = isUnavailable
    ? { kind: 'unavailable' }
    : { kind: 'balance', value: balanceAmount ?? '0' };

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
