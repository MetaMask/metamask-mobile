import React, { useRef, useCallback } from 'react';
import { Linking, Image } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import AppConstants from '../../../../../../core/AppConstants';
import musdIcon from '../../../../../../images/musd-icon-no-background-2x.png';

export interface ClaimOnLineaBottomSheetParams {
  onContinue: () => Promise<void>;
}

type ClaimOnLineaRouteProp = RouteProp<
  { ClaimOnLineaModal: ClaimOnLineaBottomSheetParams },
  'ClaimOnLineaModal'
>;

const ClaimOnLineaBottomSheet: React.FC = () => {
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const route = useRoute<ClaimOnLineaRouteProp>();
  const { onContinue } = route.params;
  const tw = useTailwind();

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleTermsPress = useCallback(() => {
    Linking.openURL(AppConstants.URLS.MUSD_CONVERSION_BONUS_TERMS_OF_USE);
  }, []);

  const handleContinue = useCallback(() => {
    // Fire-and-forget: start claim in background and close sheet immediately
    // The Claim button shows loading state while transaction processes
    onContinue();
    bottomSheetRef.current?.onCloseBottomSheet();
  }, [onContinue]);

  return (
    <BottomSheet ref={bottomSheetRef}>
      <BottomSheetHeader onClose={handleClose} />
      <Box
        alignItems={BoxAlignItems.Center}
        twClassName="px-4 pb-6"
        testID="claim-on-linea-bottom-sheet"
      >
        <Box twClassName="mb-4">
          <Image
            source={musdIcon}
            style={tw.style('w-[120px] h-[120px]')}
            resizeMode="contain"
            testID="claim-on-linea-musd-image"
          />
        </Box>

        <Text
          variant={TextVariant.HeadingLg}
          twClassName="text-center mb-2"
          testID="claim-on-linea-title"
        >
          {strings('asset_overview.merkl_rewards.claim_on_linea_title')}
        </Text>

        <Text
          variant={TextVariant.BodyMd}
          twClassName="text-center mb-6"
          testID="claim-on-linea-description"
        >
          {strings('asset_overview.merkl_rewards.claim_on_linea_description')}{' '}
          <Text
            variant={TextVariant.BodyMd}
            onPress={handleTermsPress}
            twClassName="underline"
            testID="claim-on-linea-terms-link"
          >
            {strings('asset_overview.merkl_rewards.terms_apply')}
          </Text>
        </Text>

        <Box twClassName="w-full">
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            twClassName="w-full"
            onPress={handleContinue}
            testID="claim-on-linea-continue-button"
          >
            {strings('asset_overview.merkl_rewards.continue')}
          </Button>
        </Box>
      </Box>
    </BottomSheet>
  );
};

export default ClaimOnLineaBottomSheet;
