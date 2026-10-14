import React, { useCallback, useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { strings } from '../../../../../../locales/i18n';

export const VbaKycRejectedSelectorsIDs = {
  CONTAINER: 'vba-kyc-rejected-container',
  BACK_BUTTON: 'vba-kyc-rejected-back-button',
  RETRY_BUTTON: 'vba-kyc-rejected-retry-button',
} as const;

interface VbaKycRejectedProps {
  onRetry: () => void | Promise<void>;
}

/**
 * Shown when VBA KYC is rejected. Retry re-enters identity verification
 * instead of refreshing this screen while the session is still rejected.
 */
const VbaKycRejected = ({ onRetry }: VbaKycRejectedProps) => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const [isRetrying, setIsRetrying] = useState(false);

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleRetry = useCallback(async () => {
    if (isRetrying) {
      return;
    }
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  }, [isRetrying, onRetry]);

  return (
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
    >
      <HeaderStandard
        onBack={handleBack}
        backButtonProps={{
          testID: VbaKycRejectedSelectorsIDs.BACK_BUTTON,
        }}
        includesTopInset
      />
      <ScrollView
        contentContainerStyle={tw.style('flex-grow px-4 pb-4')}
        testID={VbaKycRejectedSelectorsIDs.CONTAINER}
      >
        <Icon
          name={IconName.Danger}
          size={IconSize.Xl}
          color={IconColor.ErrorDefault}
          twClassName="mt-6"
        />
        <Text variant={TextVariant.HeadingLg} twClassName="mt-4">
          {strings('virtual_bank_account.kyc_rejected.title')}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="mt-2"
        >
          {strings('virtual_bank_account.kyc_rejected.description')}
        </Text>
      </ScrollView>
      <Box twClassName="p-4">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          isLoading={isRetrying}
          isDisabled={isRetrying}
          onPress={handleRetry}
          testID={VbaKycRejectedSelectorsIDs.RETRY_BUTTON}
        >
          {strings('virtual_bank_account.kyc_rejected.button')}
        </Button>
      </Box>
    </SafeAreaView>
  );
};

export default VbaKycRejected;
