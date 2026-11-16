import React, { useCallback } from 'react';
import {
  CommonActions,
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { useSupportConsent } from '../../../../hooks/useSupportConsent';
import { METAMASK_SUPPORT_URL } from '../../../../../constants/urls';
import { getBetaSupportUrl } from '../../utils';
import { openContactSupportWebview } from '../../utils/openContactSupportWebview';
import { TAX_FORM_CONTACT_US_SHEET_TEST_IDS } from './TaxFormContactUsSheet.testIds';

export interface TaxFormContactUsSheetParams {
  title: string;
  description: string;
  contactLabel: string;
  /**
   * Set once support has opened. Backing out of support focuses this sheet
   * again, and the sheet closes. Absent until then, so dismissing the consent
   * sheet leaves this sheet up.
   */
  closeOnSupportReturn?: boolean;
}

const TaxFormContactUsSheet: React.FC = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute();
  const params = route.params as TaxFormContactUsSheetParams;
  const { openSupportWithConsent } = useSupportConsent();

  useFocusEffect(
    useCallback(() => {
      if (params.closeOnSupportReturn) {
        navigation.goBack();
      }
    }, [navigation, params.closeOnSupportReturn]),
  );

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleContactSupport = useCallback(() => {
    const betaSupportUrl = getBetaSupportUrl();
    const openWebview = (url: string) => {
      navigation.dispatch(
        CommonActions.setParams({ closeOnSupportReturn: true }),
      );
      openContactSupportWebview(navigation, url);
    };

    if (betaSupportUrl) {
      openWebview(betaSupportUrl);
      return;
    }

    openSupportWithConsent(openWebview, METAMASK_SUPPORT_URL);
  }, [navigation, openSupportWithConsent]);

  return (
    <BottomSheet
      goBack={navigation.goBack}
      testID={TAX_FORM_CONTACT_US_SHEET_TEST_IDS.CONTAINER}
    >
      <BottomSheetHeader
        onClose={handleClose}
        testID={TAX_FORM_CONTACT_US_SHEET_TEST_IDS.TITLE}
      >
        {params.title}
      </BottomSheetHeader>
      <Box twClassName="gap-4 px-4">
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          testID={TAX_FORM_CONTACT_US_SHEET_TEST_IDS.DESCRIPTION}
        >
          {params.description}
        </Text>
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handleContactSupport}
          testID={TAX_FORM_CONTACT_US_SHEET_TEST_IDS.CONTACT}
        >
          {params.contactLabel}
        </Button>
      </Box>
    </BottomSheet>
  );
};

export default TaxFormContactUsSheet;
