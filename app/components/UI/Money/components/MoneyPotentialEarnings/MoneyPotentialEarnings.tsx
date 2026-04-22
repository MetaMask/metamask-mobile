import React, { useCallback, useMemo } from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
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
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import AssetLogo from '../../../Assets/components/AssetLogo/AssetLogo';
import { NetworkBadgeSource } from '../../../AssetOverview/Balance/Balance';
import { Hex } from '@metamask/utils';
import { AssetType } from '../../../../Views/confirmations/types/token';

interface MoneyPotentialEarningsProps {
  tokens: AssetType[];
  onTokenAddPress?: (tokenName: string) => void;
  onSeeEarningsPress?: () => void;
  onHeaderPress?: () => void;
}

const TokenRow = ({
  token,
  hasSubsidizedFee,
  onAddPress,
}: {
  token: AssetType;
  // Temp prop: We will track if tokens have subsidized fees in useMusdConversionTokens hook. This is here purely for display purposes.
  hasSubsidizedFee: boolean;
  onAddPress: () => void;
}) => {
  const networkBadgeSource = useMemo(
    () => (token.chainId ? NetworkBadgeSource(token.chainId as Hex) : null),
    [token.chainId],
  );
  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="px-4 py-3 gap-4"
    >
      <BadgeWrapper
        badgePosition={BadgePosition.BottomRight}
        badgeElement={
          networkBadgeSource && (
            <Badge
              variant={BadgeVariant.Network}
              imageSource={networkBadgeSource}
            />
          )
        }
      >
        <AssetLogo asset={token} />
      </BadgeWrapper>

      <Box twClassName="flex-1">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-1"
        >
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {token.name}
          </Text>
          {hasSubsidizedFee && (
            <Box twClassName="rounded bg-muted px-1.5">
              <Text
                variant={TextVariant.BodyXs}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
              >
                {strings('money.potential_earnings.no_fee')}
              </Text>
            </Box>
          )}
        </Box>
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
        >
          {token.balanceInSelectedCurrency}
        </Text>
      </Box>

      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Md}
        onPress={onAddPress}
      >
        {strings('money.potential_earnings.convert')}
      </Button>
    </Box>
  );
};

// Should only render if the user has at least one eligible conversion token.
const MoneyPotentialEarnings = ({
  tokens,
  onTokenAddPress = () => undefined,
  onSeeEarningsPress = () => undefined,
  onHeaderPress,
}: MoneyPotentialEarningsProps) => {
  const handleTokenAdd = useCallback(
    (tokenName: string) => () => onTokenAddPress(tokenName),
    [onTokenAddPress],
  );

  if (!tokens || tokens.length === 0) {
    return null;
  }

  return (
    <Box testID={MoneyPotentialEarningsTestIds.CONTAINER}>
      <Box twClassName="px-4 py-3">
        <MoneySectionHeader
          title={strings('money.potential_earnings.title')}
          onPress={onHeaderPress}
        />

        <Text
          variant={TextVariant.SectionHeading}
          color={TextColor.SuccessDefault}
          twClassName="mt-3"
          testID={MoneyPotentialEarningsTestIds.AMOUNT}
        >
          {strings('money.potential_earnings.amount')}
        </Text>

        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Regular}
          color={TextColor.TextAlternative}
          twClassName="mt-2"
        >
          {strings('money.potential_earnings.description')}
        </Text>
      </Box>

      {/* Show max of 5 tokens */}
      {tokens.slice(0, 5).map((token) => (
        <TokenRow
          key={`${token.address}-${token.chainId}`}
          token={token}
          onAddPress={handleTokenAdd(token.name)}
          // Temp: hardcoding true to show the "No fee" tag.
          hasSubsidizedFee
        />
      ))}

      <Box twClassName="px-4 py-3">
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={onSeeEarningsPress}
          testID={MoneyPotentialEarningsTestIds.SEE_EARNINGS_BUTTON}
        >
          {strings('money.potential_earnings.see_earnings')}
        </Button>
      </Box>
    </Box>
  );
};

export default MoneyPotentialEarnings;
