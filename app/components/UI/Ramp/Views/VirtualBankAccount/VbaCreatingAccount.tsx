import React from 'react';
import { ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  HeaderStandard,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';

export const VbaCreatingAccountSelectorsIDs = {
  CONTAINER: 'vba-creating-account-container',
  BACK_BUTTON: 'vba-creating-account-back-button',
  SPINNER: 'vba-creating-account-spinner',
} as const;

interface VbaCreatingAccountProps {
  onBack: () => void;
  /** KYC is approved, but the MoonPay customer is not Active yet. */
  awaitingProviderApproval?: boolean;
}

/** Shown while the autoramp is being created and until it is Approved. */
const VbaCreatingAccount = ({
  onBack,
  awaitingProviderApproval = false,
}: VbaCreatingAccountProps) => {
  const tw = useTailwind();
  const title = strings(
    awaitingProviderApproval
      ? 'virtual_bank_account.creating_account.awaiting_provider'
      : 'virtual_bank_account.creating_account.title',
  );

  return (
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
      testID={VbaCreatingAccountSelectorsIDs.CONTAINER}
    >
      <HeaderStandard
        onBack={onBack}
        backButtonProps={{ testID: VbaCreatingAccountSelectorsIDs.BACK_BUTTON }}
        includesTopInset
      />
      <Box
        twClassName="flex-1 gap-4 px-4"
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={title}
      >
        <ActivityIndicator testID={VbaCreatingAccountSelectorsIDs.SPINNER} />
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="text-center"
        >
          {title}
        </Text>
      </Box>
    </SafeAreaView>
  );
};

export default VbaCreatingAccount;
