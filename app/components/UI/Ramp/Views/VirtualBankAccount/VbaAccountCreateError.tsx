import React, { useCallback, useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  TitleStandard,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import VbaAccountCreateFailure from './assets/vba-account-create-failure.svg';
import type {
  AccountCreateErrorPrimaryAction,
  AccountCreateErrorVariant,
} from './accountCreateError';

export const VbaAccountCreateErrorSelectorsIDs = {
  CONTAINER: 'vba-account-create-error-container',
  BACK_BUTTON: 'vba-account-create-error-back-button',
  PRIMARY_BUTTON: 'vba-account-create-error-primary-button',
  SECONDARY_BUTTON: 'vba-account-create-error-secondary-button',
} as const;

interface VbaAccountCreateErrorProps {
  variant: AccountCreateErrorVariant;
  primaryActionType: AccountCreateErrorPrimaryAction;
  onPrimary: () => void | Promise<void>;
  onSecondary: () => void | Promise<void>;
  onBack?: () => void;
}

type PendingAction = 'primary' | 'secondary';

/**
 * Account-creation failure. The variant controls the title, while the action
 * controls whether the description directs the user to support or to retry.
 */
const VbaAccountCreateError = ({
  variant,
  primaryActionType,
  onPrimary,
  onSecondary,
  onBack,
}: VbaAccountCreateErrorProps) => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );

  const handleBack = useCallback(() => {
    if (pendingAction) {
      return;
    }
    if (onBack) {
      onBack();
      return;
    }
    navigation.goBack();
  }, [navigation, onBack, pendingAction]);

  const runAction = useCallback(
    async (pending: PendingAction, action: () => void | Promise<void>) => {
      if (pendingAction) {
        return;
      }
      setPendingAction(pending);
      try {
        await action();
      } finally {
        setPendingAction(null);
      }
    },
    [pendingAction],
  );

  const description = strings(
    primaryActionType === 'retry'
      ? 'virtual_bank_account.account_create_error.generic.description'
      : 'virtual_bank_account.account_create_error.details.description',
  );
  const primaryLabel = strings(
    primaryActionType === 'retry'
      ? 'virtual_bank_account.account_create_error.generic.primary'
      : 'virtual_bank_account.account_create_error.details.primary',
  );

  return (
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
    >
      <HeaderStandard
        onBack={handleBack}
        backButtonProps={{
          isDisabled: pendingAction !== null,
          testID: VbaAccountCreateErrorSelectorsIDs.BACK_BUTTON,
        }}
        includesTopInset
      />
      <ScrollView
        contentContainerStyle={tw.style('flex-grow justify-center px-4 pb-6')}
        testID={`${VbaAccountCreateErrorSelectorsIDs.CONTAINER}-${variant}`}
      >
        <TitleStandard
          title={strings(
            `virtual_bank_account.account_create_error.${variant}.title`,
          )}
          bottomLabel={description}
          titleProps={{ twClassName: 'text-center' }}
          titleWrapperProps={{ justifyContent: BoxJustifyContent.Center }}
          bottomLabelProps={{ twClassName: 'text-center' }}
          bottomLabelWrapperProps={{
            justifyContent: BoxJustifyContent.Center,
          }}
          topAccessory={
            <Box
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.End}
              twClassName="mb-5 w-full"
            >
              <VbaAccountCreateFailure name="vba-account-create-failure" />
            </Box>
          }
        />
      </ScrollView>
      <Box gap={2} paddingHorizontal={4} paddingTop={4} paddingBottom={2}>
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          isLoading={pendingAction === 'primary'}
          isDisabled={pendingAction !== null}
          onPress={() => runAction('primary', onPrimary)}
          testID={VbaAccountCreateErrorSelectorsIDs.PRIMARY_BUTTON}
        >
          {primaryLabel}
        </Button>
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          isFullWidth
          isLoading={pendingAction === 'secondary'}
          isDisabled={pendingAction !== null}
          onPress={() => runAction('secondary', onSecondary)}
          testID={VbaAccountCreateErrorSelectorsIDs.SECONDARY_BUTTON}
        >
          {strings(
            `virtual_bank_account.account_create_error.${variant}.secondary`,
          )}
        </Button>
      </Box>
    </SafeAreaView>
  );
};

export default VbaAccountCreateError;
