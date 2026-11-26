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
import {
  MoneyPostOnboardingRedirectType,
  type MoneyCardReturnScreen,
} from '../../../Money/types/navigation';

export const MoneyAccountIdentity = ({
  testID = 'money-account-identity',
}: {
  testID?: string;
}) => (
  <Box className="flex-row items-center gap-2 shrink min-w-0" testID={testID}>
    <MoneyBalanceIcon
      width={24}
      height={24}
      name="money-balance"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    />
    <Text
      variant={TextVariant.BodyMd}
      className="text-text-default font-medium self-center shrink"
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
  <Box className="flex-row items-center p-4" testID={testID}>
    <Text
      variant={TextVariant.BodyMd}
      className="flex-1 text-text-alternative"
    >
      {strings('card.card_spending_limit.account_label')}
    </Text>
    <MoneyAccountIdentity />
  </Box>
);

/**
 * Shown when a Money account channel needs a Money account that does not exist yet.
 * The CTA opens the Money splash and returns to Card afterwards.
 */
export const MoneyAccountRequired = ({
  returnTo,
  testID = 'money-account-required',
}: {
  returnTo: MoneyCardReturnScreen;
  testID?: string;
}) => {
  const navigation = useNavigation<AppNavigationProp>();
  const onPress = useCallback(() => {
    navigation.navigate(Routes.MONEY.SPLASH, {
      postOnboardingRedirect: {
        type: MoneyPostOnboardingRedirectType.CARD,
        cardScreen: returnTo,
      },
    });
  }, [navigation, returnTo]);

  return (
    <Box className="gap-3" testID={testID}>
      <Text variant={TextVariant.BodyMd} className="text-text-default">
        {strings('card.card_authentication.money_account_required.title')}
      </Text>
      <Text variant={TextVariant.BodySm} className="text-text-alternative">
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
