import React, { useCallback } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { strings } from '../../../../../../locales/i18n';

export const VbaKycNeedInfoSelectorsIDs = {
  CONTAINER: 'vba-kyc-need-info-container',
  BACK_BUTTON: 'vba-kyc-need-info-back-button',
  CONTINUE_BUTTON: 'vba-kyc-need-info-continue-button',
} as const;

interface VbaKycNeedInfoProps {
  onContinue: () => void;
}

/**
 * Shown when a returning user abandoned SumSub and more information is
 * required, before the provider SDK is launched again.
 */
const VbaKycNeedInfo = ({ onContinue }: VbaKycNeedInfoProps) => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  return (
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
    >
      <HeaderStandard
        onBack={handleBack}
        backButtonProps={{
          testID: VbaKycNeedInfoSelectorsIDs.BACK_BUTTON,
        }}
        includesTopInset
      />
      <ScrollView
        contentContainerStyle={tw.style('flex-grow px-4 pb-4')}
        testID={VbaKycNeedInfoSelectorsIDs.CONTAINER}
      >
        <Text variant={TextVariant.HeadingLg} twClassName="mt-2">
          {strings('virtual_bank_account.kyc_need_info.title')}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="mt-2"
        >
          {strings('virtual_bank_account.kyc_need_info.description')}
        </Text>
      </ScrollView>
      <Box twClassName="p-4">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={onContinue}
          testID={VbaKycNeedInfoSelectorsIDs.CONTINUE_BUTTON}
        >
          {strings('virtual_bank_account.kyc_need_info.button')}
        </Button>
      </Box>
    </SafeAreaView>
  );
};

export default VbaKycNeedInfo;
