import React, { useCallback } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  BoxAlignItems,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { useTrackKycResultViewed } from '../../hooks/useTrackKycResultViewed';
import KycIllustration, {
  KycIllustrationSource,
} from '../../components/Illustration';
import { fireImpact, ImpactMoment } from '../../../../../util/haptics';

export const KycPendingSelectorsIDs = {
  CONTAINER: 'kyc-pending-container',
  ILLUSTRATION: 'kyc-pending-illustration',
  COME_BACK_LATER_BUTTON: 'kyc-pending-come-back-later-button',
} as const;

interface KycPendingProps {
  /** Leaves the pending screen. The caller chooses the destination. */
  onLeave: () => void;
  /**
   * Replaces the default copy for a caller whose flow words the wait
   * differently. Omitted keeps the shared UKYC copy.
   */
  title?: string;
  description?: string;
  /** Replaces the default button label. Omitted keeps the shared UKYC one. */
  buttonLabel?: string;
}

const KycPending = ({
  onLeave,
  title,
  description,
  buttonLabel,
}: KycPendingProps) => {
  useTrackKycResultViewed('pending');
  const tw = useTailwind();

  const handleComeBackLater = useCallback(() => {
    fireImpact(ImpactMoment.PrimaryCTA);
    onLeave();
  }, [onLeave]);

  return (
    <SafeAreaView
      edges={['top', 'right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
    >
      <ScrollView
        contentContainerStyle={tw.style('flex-grow justify-center px-4 py-4')}
        testID={KycPendingSelectorsIDs.CONTAINER}
      >
        <Box alignItems={BoxAlignItems.Center}>
          <Box
            twClassName="mb-[24px]"
            testID={KycPendingSelectorsIDs.ILLUSTRATION}
          >
            <KycIllustration
              source={KycIllustrationSource.scanner}
              twClassName="h-[104px] w-[149px]"
            />
          </Box>
          <Text variant={TextVariant.HeadingLg} twClassName="text-center">
            {title ?? strings('kyc.kyc_taking_longer.title')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="mt-[4px] text-center"
          >
            {description ??
              strings('kyc.kyc_taking_longer.description_few_minutes')}
          </Text>
        </Box>
      </ScrollView>
      <Box twClassName="p-4">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handleComeBackLater}
          testID={KycPendingSelectorsIDs.COME_BACK_LATER_BUTTON}
        >
          {buttonLabel ?? strings('kyc.kyc_taking_longer.done_button')}
        </Button>
      </Box>
    </SafeAreaView>
  );
};

export default KycPending;
