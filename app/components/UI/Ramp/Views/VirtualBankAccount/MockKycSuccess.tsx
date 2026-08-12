import React, { useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
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
import MockKycProgressBar from './MockKycProgressBar';
import { MockKycSuccessSelectorsIDs } from './MockKycSuccess.testIds';

/**
 * Demo-only KYC success placeholder. Finish is intentionally a no-op so a
 * teammate can hook post-KYC navigation here.
 */
const MockKycSuccess = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleFinish = useCallback(() => {
    // TODO(vba-demo): teammate adds post-KYC navigation here.
  }, []);

  return (
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
    >
      <HeaderStandard
        title={strings('virtual_bank_account.mock_kyc.success.navbar_title')}
        onBack={handleBack}
        backButtonProps={{ testID: MockKycSuccessSelectorsIDs.BACK_BUTTON }}
        includesTopInset
      />
      <MockKycProgressBar filledCount={2} />
      <Box
        flexDirection={BoxFlexDirection.Column}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="flex-1 px-4"
        testID={MockKycSuccessSelectorsIDs.CONTAINER}
      >
        <Box
          accessible={false}
          twClassName="relative mb-6 h-32 w-32 items-center justify-center"
        >
          <Box
            accessible={false}
            twClassName="h-24 w-20 gap-2 rounded-xl bg-muted p-3"
          >
            <Box
              accessible={false}
              twClassName="h-1 w-full rounded-full bg-icon-muted"
            />
            <Box
              accessible={false}
              twClassName="h-1 w-3/4 rounded-full bg-icon-muted"
            />
            <Box
              accessible={false}
              twClassName="h-1 w-full rounded-full bg-icon-muted"
            />
          </Box>
          <Box
            accessible={false}
            twClassName="absolute -bottom-1 -right-1 size-14 items-center justify-center rounded-full bg-primary-muted"
          >
            <Icon
              name={IconName.Search}
              size={IconSize.Lg}
              color={IconColor.PrimaryDefault}
            />
          </Box>
        </Box>
        <Text variant={TextVariant.HeadingLg} twClassName="text-center">
          {strings('virtual_bank_account.mock_kyc.success.title')}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="mt-2 text-center"
        >
          {strings('virtual_bank_account.mock_kyc.success.description')}
        </Text>
      </Box>
      <Box twClassName="p-4">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handleFinish}
          testID={MockKycSuccessSelectorsIDs.FINISH_BUTTON}
        >
          {strings('virtual_bank_account.mock_kyc.success.button')}
        </Button>
      </Box>
    </SafeAreaView>
  );
};

export default MockKycSuccess;
