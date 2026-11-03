import React from 'react';
import { Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  FontWeight,
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
import vbaCreatingAccount from './assets/vba-creating-account.png';

export const VbaCreatingAccountSelectorsIDs = {
  CONTAINER: 'vba-creating-account-container',
  ILLUSTRATION: 'vba-creating-account-illustration',
  TITLE: 'vba-creating-account-title',
  DESCRIPTION: 'vba-creating-account-description',
} as const;

interface VbaCreatingAccountProps {
  /** KYC is approved, but the MoonPay customer is not Active yet. */
  awaitingProviderApproval?: boolean;
}

/** Shown while the autoramp is being created and until it is Approved. */
const VbaCreatingAccount = ({
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
      style={tw.style('flex-1 bg-default')}
      testID={VbaCreatingAccountSelectorsIDs.CONTAINER}
    >
      <Box
        gap={6}
        twClassName="flex-1 px-8"
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={title}
      >
        <Image
          source={vbaCreatingAccount}
          resizeMode="contain"
          accessible={false}
          accessibilityIgnoresInvertColors
          style={tw.style('h-[88px] w-[94px]')}
          testID={VbaCreatingAccountSelectorsIDs.ILLUSTRATION}
        />
        <Box gap={1} alignItems={BoxAlignItems.Center} twClassName="w-full">
          <Text
            variant={TextVariant.HeadingLg}
            twClassName="text-center"
            testID={VbaCreatingAccountSelectorsIDs.TITLE}
          >
            {title}
          </Text>
          {!awaitingProviderApproval ? (
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextAlternative}
              twClassName="text-center"
              testID={VbaCreatingAccountSelectorsIDs.DESCRIPTION}
            >
              {strings('virtual_bank_account.creating_account.description')}
            </Text>
          ) : null}
        </Box>
      </Box>
    </SafeAreaView>
  );
};

export default VbaCreatingAccount;
