import React from 'react';
import { Linking, TouchableOpacity } from 'react-native';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../locales/i18n';
import { CardHomeSelectors } from '../CardHome.testIds';

export interface CardHomeLegalDocumentLink {
  id: string;
  title: string;
  url: string;
}

interface CardHomeFooterProps {
  isAuthenticated: boolean;
  isLoading: boolean;
  hasAlerts: boolean;
  hasSetupActions: boolean;
  supportEmail: string;
  /** When set (Immersve), render one row per region legal document. */
  legalDocuments?: CardHomeLegalDocumentLink[];
  /**
   * When true (Immersve docs still loading), omit legal links entirely —
   * do not fall back to the single hardcoded TOS row mid-fetch.
   */
  hideLegalDocuments?: boolean;
  onNavigateToCardTos: () => void;
  onLogout: () => void;
}

const CardHomeFooter = ({
  isAuthenticated,
  isLoading,
  hasAlerts,
  hasSetupActions,
  supportEmail,
  legalDocuments,
  hideLegalDocuments = false,
  onNavigateToCardTos,
  onLogout,
}: CardHomeFooterProps) => {
  const tw = useTailwind();

  if (isLoading) return null;

  const hasLegalDocuments = Boolean(
    legalDocuments && legalDocuments.length > 0,
  );

  return (
    <>
      <Box
        twClassName={`h-px mx-4 bg-border-muted ${hasAlerts || hasSetupActions ? 'hidden' : ''}`}
      />
      <Box twClassName="gap-6 mt-4">
        {hideLegalDocuments ? null : hasLegalDocuments ? (
          legalDocuments?.map((legalDocument) => (
            <TouchableOpacity
              key={legalDocument.id}
              onPress={() => {
                Linking.openURL(legalDocument.url).catch(() => {
                  // Swallow — user can retry via the link.
                });
              }}
              testID={`${CardHomeSelectors.CARD_TOS_ITEM}-${legalDocument.id}`}
              style={tw.style('px-4')}
            >
              <Text
                variant={TextVariant.BodyMd}
                twClassName="text-text-alternative"
              >
                {legalDocument.title}
              </Text>
            </TouchableOpacity>
          ))
        ) : (
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
        )}
        <TouchableOpacity
          onPress={() => Linking.openURL(`mailto:${supportEmail}`)}
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
