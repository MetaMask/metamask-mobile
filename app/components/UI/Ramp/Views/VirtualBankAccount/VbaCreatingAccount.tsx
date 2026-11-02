import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  HeaderStandard,
  Spinner,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { useScreenPerformance } from '../../../../../hooks/useScreenPerformance';
import {
  VBA_SCREEN_ID,
  VBA_SCREEN_PERFORMANCE_CONFIG,
} from './vbaScreenPerformance';

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
  useScreenPerformance({
    config: VBA_SCREEN_PERFORMANCE_CONFIG,
    screenId: VBA_SCREEN_ID.ACCOUNT_CREATION,
    contentReady: true,
  });
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
        gap={4}
        paddingHorizontal={4}
        twClassName="flex-1"
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={title}
      >
        <Spinner testID={VbaCreatingAccountSelectorsIDs.SPINNER} />
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
