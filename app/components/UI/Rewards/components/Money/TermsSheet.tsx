import React, { useCallback, useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  BottomSheet,
  BottomSheetHeader,
  type BottomSheetRef,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import type { RootState } from '../../../../../reducers';
import { selectReferralMeLocalizedText } from '../../../../../reducers/rewardsMoney/selectors';
import { selectSessionProfileId } from '../../../../../selectors/identity';
import Routes from '../../../../../constants/navigation/Routes';

export const TERMS_SHEET_TEST_IDS = {
  CONTAINER: 'rewards-money-terms-sheet',
  CLOSE: 'rewards-money-terms-sheet-close',
  TITLE: 'rewards-money-terms-sheet-title',
  DESCRIPTION: 'rewards-money-terms-sheet-description',
  LEARN_MORE: 'rewards-money-terms-sheet-learn-more',
} as const;

const TermsSheet: React.FC = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const sheetRef = useRef<BottomSheetRef>(null);
  const profileId = useSelector(selectSessionProfileId);
  const localizedText = useSelector((state: RootState) =>
    selectReferralMeLocalizedText(state, profileId),
  );
  const termsTitle = localizedText?.termsTitle?.trim() ?? '';
  const termsDescription = localizedText?.termsDescription?.trim() ?? '';
  const termsUrl = localizedText?.termsUrl?.trim() ?? '';
  const copyMissing = termsTitle.length === 0 && termsDescription.length === 0;

  useEffect(() => {
    if (copyMissing) {
      navigation.goBack();
    }
  }, [copyMissing, navigation]);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleLinkPress = useCallback(
    (url: string) => {
      if (url.length === 0) {
        return;
      }
      navigation.navigate(Routes.BROWSER.HOME, {
        screen: Routes.BROWSER.VIEW,
        params: {
          newTabUrl: url,
          timestamp: Date.now(),
        },
      });
    },
    [navigation],
  );

  if (copyMissing) {
    return null;
  }

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={navigation.goBack}
      testID={TERMS_SHEET_TEST_IDS.CONTAINER}
    >
      <BottomSheetHeader
        onClose={handleClose}
        closeButtonProps={{ testID: TERMS_SHEET_TEST_IDS.CLOSE }}
        testID={TERMS_SHEET_TEST_IDS.TITLE}
      >
        {termsTitle}
      </BottomSheetHeader>
      <Box twClassName="px-4">
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          testID={TERMS_SHEET_TEST_IDS.DESCRIPTION}
        >
          {termsDescription}
        </Text>
      </Box>
      <Box twClassName="px-4 pt-6">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          isDisabled={termsUrl.length === 0}
          onPress={() => handleLinkPress(termsUrl)}
          endIconName={IconName.ArrowSquareOut}
          testID={TERMS_SHEET_TEST_IDS.LEARN_MORE}
        >
          {localizedText?.termsLearnMore ?? ''}
        </Button>
      </Box>
    </BottomSheet>
  );
};

export default TermsSheet;
