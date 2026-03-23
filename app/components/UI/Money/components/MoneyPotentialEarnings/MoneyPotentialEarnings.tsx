import React, { useCallback } from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
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

interface TokenData {
  name: string;
  balance: string;
  hasFeeTag: boolean;
}

const HARDCODED_TOKENS: TokenData[] = [
  { name: 'USD Coin', balance: '$5,000.00', hasFeeTag: true },
  { name: 'Tether', balance: '$4,000.00', hasFeeTag: true },
  { name: 'Dai', balance: '$1,000.00', hasFeeTag: true },
  { name: 'Ethereum', balance: '$15,000.00', hasFeeTag: false },
  { name: 'Solana', balance: '$1,600.00', hasFeeTag: false },
];

interface MoneyPotentialEarningsProps {
  onTokenAddPress?: (tokenName: string) => void;
  onSeeEarningsPress?: () => void;
  onHeaderPress?: () => void;
}

const TokenRow = ({
  token,
  onAddPress,
}: {
  token: TokenData;
  onAddPress: () => void;
}) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    twClassName="px-4 py-3 gap-4"
  >
    <Box
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      twClassName="h-10 w-10 rounded-full bg-muted"
    >
      <Text variant={TextVariant.BodySm} fontWeight={FontWeight.Medium}>
        {token.name.charAt(0)}
      </Text>
    </Box>

    <Box twClassName="flex-1">
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-1"
      >
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {token.name}
        </Text>
        {token.hasFeeTag && (
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
        {token.balance}
      </Text>
    </Box>

    <Button
      variant={ButtonVariant.Secondary}
      size={ButtonSize.Md}
      onPress={onAddPress}
    >
      {strings('money.potential_earnings.add')}
    </Button>
  </Box>
);

const MoneyPotentialEarnings = ({
  onTokenAddPress = () => undefined,
  onSeeEarningsPress = () => undefined,
  onHeaderPress,
}: MoneyPotentialEarningsProps) => {
  const handleTokenAdd = useCallback(
    (tokenName: string) => () => onTokenAddPress(tokenName),
    [onTokenAddPress],
  );

  return (
    <Box testID={MoneyPotentialEarningsTestIds.CONTAINER}>
      <Box twClassName="px-4 py-3">
        <MoneySectionHeader
          title={strings('money.potential_earnings.title')}
          onPress={onHeaderPress}
        />

        <Text
          variant={TextVariant.HeadingMd}
          fontWeight={FontWeight.Bold}
          color={TextColor.SuccessDefault}
          twClassName="mt-3"
          testID={MoneyPotentialEarningsTestIds.AMOUNT}
        >
          {strings('money.potential_earnings.amount')}
        </Text>

        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          twClassName="mt-2"
        >
          {strings('money.potential_earnings.description')}
        </Text>
      </Box>

      {HARDCODED_TOKENS.map((token) => (
        <TokenRow
          key={token.name}
          token={token}
          onAddPress={handleTokenAdd(token.name)}
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
