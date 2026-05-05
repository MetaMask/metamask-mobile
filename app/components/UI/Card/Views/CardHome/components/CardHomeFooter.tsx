import React from 'react';
import { Linking, TouchableOpacity } from 'react-native';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../locales/i18n';
import { CardHomeSelectors } from '../CardHome.testIds';
import { CARD_SUPPORT_EMAIL } from '../../../constants';

interface CardHomeFooterProps {
  isAuthenticated: boolean;
  isLoading: boolean;
  hasAlerts: boolean;
  hasSetupActions: boolean;
  onNavigateToCardTos: () => void;
  onLogout: () => void;
}

const CardHomeFooter = ({
  isAuthenticated,
  isLoading,
  hasAlerts,
  hasSetupActions,
  onNavigateToCardTos,
  onLogout,
}: CardHomeFooterProps) => {
  const tw = useTailwind();

  if (isLoading) return null;

  return (
    <>
      <Box
        twClassName={`h-px mx-4 bg-border-muted ${hasAlerts || hasSetupActions ? 'hidden' : ''}`}
      />
      <Box twClassName="gap-6 mt-4">
        <TouchableOpacity
          onPress={onNavigateToCardTos}
          testID={CardHomeSelectors.CARD_TOS_ITEM}
          style={tw.style('px-4')}
        >
          <Text
            variant={TextVariant.BodyMd}
            twClassName="text-text-alternative"
          >
            {strings('card.card_home.manage_card_options.card_tos_title')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => Linking.openURL(`mailto:${CARD_SUPPORT_EMAIL}`)}
          testID={CardHomeSelectors.CONTACT_SUPPORT_ITEM}
          style={tw.style('px-4')}
        >
          <Text
            variant={TextVariant.BodyMd}
            twClassName="text-text-alternative"
          >
            {strings('card.card_home.contact_support')}
          </Text>
        </TouchableOpacity>
        {isAuthenticated && (
          <TouchableOpacity
            onPress={onLogout}
            testID={CardHomeSelectors.LOGOUT_ITEM}
            style={tw.style('px-4 mb-6')}
          >
            <Text
              variant={TextVariant.BodyMd}
              twClassName="text-text-alternative"
            >
              {strings('card.card_home.logout')}
            </Text>
          </TouchableOpacity>
        )}
      </Box>
    </>
  );
};

export default CardHomeFooter;
