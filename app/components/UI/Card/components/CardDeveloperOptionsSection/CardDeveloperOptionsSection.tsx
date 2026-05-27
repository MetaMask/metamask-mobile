import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import { resetOnboardingState } from '../../../../../core/redux/slices/card';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import { selectIsMoneyAccountDelegatedForCard } from '../../../../../selectors/cardController';
import { selectPrimaryMoneyAccount } from '../../../../../selectors/moneyAccountController';
import CardNavigatorDevPanel from './CardNavigatorDevPanel';

const CardDeveloperOptionsSection = () => {
  const dispatch = useDispatch();
  const tw = useTailwind();
  const isAlreadyDelegated = useSelector(selectIsMoneyAccountDelegatedForCard);
  const primaryMoneyAccount = useSelector(selectPrimaryMoneyAccount);
  const isUnlinkable =
    isAlreadyDelegated && Boolean(primaryMoneyAccount?.address);

  const handleResetOnboardingState = useCallback(() => {
    dispatch(resetOnboardingState());
  }, [dispatch]);

  const handleUnlinkMoneyAccount = useCallback(async () => {
    if (!primaryMoneyAccount?.address) {
      return;
    }
    try {
      await Engine.context.CardController.linkMoneyAccountCard({
        moneyAccountAddress: primaryMoneyAccount.address,
        delegationAmountHuman: '0',
      });
    } catch (error) {
      Logger.error(
        error instanceof Error ? error : new Error(String(error)),
        'CardDeveloperOptionsSection: unlink Money Account failed',
      );
    }
  }, [primaryMoneyAccount?.address]);

  return (
    <Box twClassName="mt-2 gap-2">
      <Text
        color={TextColor.Default}
        variant={TextVariant.HeadingLG}
        style={tw.style('mt-4')}
      >
        {strings('app_settings.developer_options.card.title')}
      </Text>
      <Text
        color={TextColor.Alternative}
        variant={TextVariant.BodyMD}
        style={tw.style('mt-2')}
      >
        {strings(
          'app_settings.developer_options.card.reset_onboarding_description',
        )}
      </Text>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={handleResetOnboardingState}
        isFullWidth
        style={tw.style('mt-4')}
      >
        {strings('app_settings.developer_options.card.reset_onboarding_button')}
      </Button>
      <Text
        color={TextColor.Alternative}
        variant={TextVariant.BodyMD}
        style={tw.style('mt-6')}
      >
        {strings(
          'app_settings.developer_options.card.unlink_money_account_description',
        )}
      </Text>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={handleUnlinkMoneyAccount}
        isFullWidth
        isDisabled={!isUnlinkable}
        style={tw.style('mt-4')}
        testID="card-dev-unlink-money-account-button"
      >
        {strings(
          'app_settings.developer_options.card.unlink_money_account_button',
        )}
      </Button>
      {!isUnlinkable && (
        <Text
          color={TextColor.Muted}
          variant={TextVariant.BodySM}
          style={tw.style('mt-2')}
          testID="card-dev-unlink-money-account-disabled-hint"
        >
          {strings(
            'app_settings.developer_options.card.unlink_money_account_disabled_hint',
          )}
        </Text>
      )}
      <CardNavigatorDevPanel />
    </Box>
  );
};

export default CardDeveloperOptionsSection;
