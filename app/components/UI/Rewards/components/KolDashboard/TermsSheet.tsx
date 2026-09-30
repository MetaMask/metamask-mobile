import React, { useCallback } from 'react';
import { Linking } from 'react-native';
import {
  Box,
  BottomSheetHeader,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import Logger from '../../../../../util/Logger';
import ArrowSquareOutIcon from '../../../../../images/rewards/arrow-square-out.svg';
import { KOL_DASHBOARD_SELECTORS } from './KolDashboard.testIds';
import { KOL_TERMS_URL } from './rewardsUiFixtures';
import KolDashboardSheet from './KolDashboardSheet';

interface TermsSheetProps {
  isVisible: boolean;
  onClose: () => void;
}

const TermsSheet: React.FC<TermsSheetProps> = ({ isVisible, onClose }) => {
  const tw = useTailwind();

  const handleLearnMore = useCallback(() => {
    Linking.openURL(KOL_TERMS_URL).catch((error) => {
      Logger.log('Error while opening rewards terms URL', error);
    });
  }, []);

  return (
    <KolDashboardSheet
      isVisible={isVisible}
      onClose={onClose}
      testID={KOL_DASHBOARD_SELECTORS.TERMS_SHEET}
    >
      <BottomSheetHeader
        onClose={onClose}
        testID={KOL_DASHBOARD_SELECTORS.TERMS_TITLE}
      >
        {strings('rewards.kol.terms_title')}
      </BottomSheetHeader>
      <Box twClassName="px-4">
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          testID={KOL_DASHBOARD_SELECTORS.TERMS_DESCRIPTION}
        >
          {strings('rewards.kol.terms_description')}
        </Text>
      </Box>
      <Box twClassName="px-4 pt-6">
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handleLearnMore}
          endAccessory={
            <ArrowSquareOutIcon
              fill="currentColor"
              style={tw.style('h-5 w-5 text-primary-inverse')}
            />
          }
          testID={KOL_DASHBOARD_SELECTORS.TERMS_LEARN_MORE}
        >
          {strings('rewards.kol.terms_learn_more')}
        </Button>
      </Box>
    </KolDashboardSheet>
  );
};

export default TermsSheet;
