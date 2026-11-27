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
import { useSelector } from 'react-redux';
import HeaderStandardGlass from '../../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';
import { fireImpact, ImpactMoment } from '../../../../../util/haptics';

export const VbaAccountCreateErrorSelectorsIDs = {
  CONTAINER: 'vba-account-create-error-container',
  BACK_BUTTON: 'vba-account-create-error-back-button',
  ILLUSTRATION: 'vba-account-create-error-illustration',
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

/** Copy used for the description and primary button of each action. */
const COPY_BY_PRIMARY_ACTION = {
  contactSupport: 'details',
  retry: 'generic',
  done: 'unavailable',
} as const satisfies Record<
  AccountCreateErrorPrimaryAction,
  AccountCreateErrorVariant
>;

/**
 * Account-creation failure. The variant controls the title, while the action
 * controls whether the description directs the user to support, to retry, or
 * to leave. The unavailable variant is not a failure, so it has no
 * illustration.
 */
const VbaAccountCreateError = ({
  variant,
  primaryActionType,
  onPrimary,
  onSecondary,
  onBack,
}: VbaAccountCreateErrorProps) => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
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
      fireImpact(
        pending === 'primary'
          ? ImpactMoment.PrimaryCTA
          : ImpactMoment.SecondaryCTA,
      );
      setPendingAction(pending);
      try {
        await action();
      } finally {
        setPendingAction(null);
      }
    },
    [pendingAction],
  );

  const actionCopy = COPY_BY_PRIMARY_ACTION[primaryActionType];
  const description = strings(
    `virtual_bank_account.account_create_error.${actionCopy}.description`,
  );
  const primaryLabel = strings(
    `virtual_bank_account.account_create_error.${actionCopy}.primary`,
  );

  return (
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
    >
      <HeaderStandardGlass
        isGlass={isGlassHeader}
        isFloating={false}
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
            variant === 'unavailable' ? undefined : (
              <Box
                alignItems={BoxAlignItems.Center}
                justifyContent={BoxJustifyContent.End}
                twClassName="mb-5 w-full"
                testID={VbaAccountCreateErrorSelectorsIDs.ILLUSTRATION}
              >
                <VbaAccountCreateFailure name="vba-account-create-failure" />
              </Box>
            )
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
