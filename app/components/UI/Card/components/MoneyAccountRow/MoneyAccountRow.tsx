import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import MoneyBalanceIcon from '../../../../../images/money-balance.svg';
import { MoneyPostOnboardingRedirectType } from '../../../Money/types/navigation';

export const MoneyAccountIdentity = ({
  testID = 'money-account-identity',
}: {
  testID?: string;
}) => (
  <Box twClassName="flex-row items-center gap-2 shrink min-w-0" testID={testID}>
    <MoneyBalanceIcon width={24} height={24} name="money-balance" />
    <Text
      variant={TextVariant.BodyMd}
      twClassName="text-text-default font-medium self-center shrink"
      numberOfLines={1}
    >
      {strings('card.card_spending_limit.money_account_label')}
    </Text>
  </Box>
);

/** Read-only account row locked to the primary Money account. */
export const MoneyAccountRow = ({
  testID = 'money-account-row',
}: {
  testID?: string;
}) => (
  <Box twClassName="flex-row items-center p-4" testID={testID}>
    <Text
      variant={TextVariant.BodyMd}
      twClassName="flex-1 text-text-alternative"
    >
      {strings('card.card_spending_limit.account_label')}
    </Text>
    <MoneyAccountIdentity />
  </Box>
);

/**
 * Shown when NZ Immersve needs a Money account that does not exist yet.
 * The CTA opens Money onboarding and returns to Card afterwards.
 */
export const MoneyAccountRequired = ({
  testID = 'money-account-required',
}: {
  testID?: string;
}) => {
  const navigation = useNavigation<AppNavigationProp>();
  const onPress = useCallback(() => {
    navigation.navigate(Routes.MONEY.ONBOARDING, {
      postOnboardingRedirect: { type: MoneyPostOnboardingRedirectType.CARD },
    });
  }, [navigation]);

  return (
    <Box twClassName="gap-3" testID={testID}>
      <Text variant={TextVariant.BodyMd} twClassName="text-text-default">
        {strings('card.card_authentication.money_account_required.title')}
      </Text>
      <Text variant={TextVariant.BodySm} twClassName="text-text-alternative">
        {strings('card.card_authentication.money_account_required.description')}
      </Text>
      <Button
        variant={ButtonVariant.Primary}
        size={ButtonSize.Lg}
        isFullWidth
        onPress={onPress}
        testID={`${testID}-cta`}
      >
        {strings(
          'card.card_authentication.money_account_required.confirm_button_label',
        )}
      </Button>
    </Box>
  );
};
