import React, { useCallback, useRef } from 'react';
import { Alert, Linking } from 'react-native';
import { useSelector } from 'react-redux';
import {
  BottomSheet,
  Box,
  IconName,
  Text,
  TextButton,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import Engine from '../../../../../../core/Engine';
import MoneySheetOptionsList, {
  type MoneySheetOption,
} from '../../../../Money/components/MoneySheetOptionsList';
import BottomSheetHeaderGlass from '../../../../../../component-library/components-temp/BottomSheetHeaderGlass';
import { selectGlassHeadersEnabled } from '../../../../../../selectors/featureFlagController/glassHeaders';
import { CardHomeSelectors } from '../CardHome.testIds';

export interface CardHomeLegalDocumentLink {
  id: string;
  title: string;
  url: string;
}

interface CardHomeMoreSheetProps {
  /** Called once the sheet has finished closing. */
  onClose: () => void;
  /** When true, show Log out after Contact support. */
  isAuthenticated?: boolean;
  supportEmail: string;
  onContactSupport?: () => void;
  /** When set (Immersve), render one row per region legal document. */
  legalDocuments?: CardHomeLegalDocumentLink[];
  /**
   * When true (Immersve docs still loading), omit legal links entirely —
   * do not fall back to the single hardcoded TOS row mid-fetch.
   */
  hideLegalDocuments?: boolean;
  /**
   * When true (Immersve docs failed or empty after settle), show error + retry
   * instead of the legacy single TOS fallback.
   */
  showLegalDocumentsError?: boolean;
  onRetryLegalDocuments?: () => void;
  onNavigateToCardTos: () => void;
}

/**
 * Card home "More" sheet, opened from the header's vertical-ellipsis button.
 * Mirrors Money home's `MoneyMoreSheet` (MMDS BottomSheet, HeadingSm title,
 * icon + label rows) and reuses Money's `MoneySheetOptionsList` for the rows.
 * Holds the legal links, Contact support, and (when signed in) Log out
 * that used to sit at the bottom of Card home, wired to the same actions.
 */
const CardHomeMoreSheet = ({
  onClose,
  isAuthenticated = false,
  supportEmail,
  onContactSupport,
  legalDocuments,
  hideLegalDocuments = false,
  showLegalDocumentsError = false,
  onRetryLegalDocuments,
  onNavigateToCardTos,
}: CardHomeMoreSheetProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;

  // Close the sheet first, then run the action (same as MoneyMoreSheet).
  const closeThen = useCallback((action: () => void) => {
    if (sheetRef.current) {
      sheetRef.current.onCloseBottomSheet(action);
      return;
    }
    action();
  }, []);

  const handleContactSupport = useCallback(() => {
    if (onContactSupport) {
      onContactSupport();
      return;
    }
    Linking.openURL(`mailto:${supportEmail}`).catch(() => undefined);
  }, [onContactSupport, supportEmail]);

  // Same confirmation and CardController.logout() path as Experimental
  // settings (PR #39351). Close the sheet first, then show the alert.
  const handleLogout = useCallback(() => {
    Alert.alert(
      strings('card.card_home.logout_confirmation_title'),
      strings('card.card_home.logout_confirmation_message'),
      [
        {
          text: strings('card.card_home.logout_confirmation_cancel'),
          style: 'cancel',
        },
        {
          text: strings('card.card_home.logout_confirmation_confirm'),
          style: 'destructive',
          onPress: () => {
            Engine.context.CardController.logout().catch(() => {
              // CardController logs provider logout failures itself.
            });
          },
        },
      ],
    );
  }, []);

  const legalOptions: MoneySheetOption[] = (() => {
    if (hideLegalDocuments || showLegalDocumentsError) {
      return [];
    }
    if (legalDocuments && legalDocuments.length > 0) {
      return legalDocuments.map((legalDocument) => ({
        label: legalDocument.title,
        icon: IconName.File,
        testID: `${CardHomeSelectors.CARD_TOS_ITEM}-${legalDocument.id}`,
        onPress: () =>
          closeThen(() => {
            Linking.openURL(legalDocument.url).catch(() => {
              // Swallow — user can retry via the link.
            });
          }),
      }));
    }
    return [
      {
        label: strings('card.card_home.manage_card_options.card_tos_title'),
        icon: IconName.File,
        testID: CardHomeSelectors.CARD_TOS_ITEM,
        onPress: () => closeThen(onNavigateToCardTos),
      },
    ];
  })();

  const options: MoneySheetOption[] = [
    ...legalOptions,
    {
      label: strings('card.card_home.contact_support'),
      icon: IconName.Sms,
      testID: CardHomeSelectors.CONTACT_SUPPORT_ITEM,
      onPress: () => closeThen(handleContactSupport),
    },
    ...(isAuthenticated
      ? [
          {
            label: strings('card.card_home.logout'),
            icon: IconName.Logout,
            testID: CardHomeSelectors.LOGOUT_ITEM,
            onPress: () => closeThen(handleLogout),
          },
        ]
      : []),
  ];

  return (
    <BottomSheet
      ref={sheetRef}
      onClose={onClose}
      testID={CardHomeSelectors.MORE_SHEET}
      keyboardAvoidingViewEnabled={false}
    >
      <BottomSheetHeaderGlass
        isGlass={isGlassHeader}
        onClose={() => sheetRef.current?.onCloseBottomSheet()}
      >
        <Text variant={TextVariant.HeadingSm}>
          {strings('card.card_home.more_sheet.title')}
        </Text>
      </BottomSheetHeaderGlass>
      {showLegalDocumentsError ? (
        <Box
          twClassName="px-4 pb-2 gap-1"
          testID={`${CardHomeSelectors.CARD_TOS_ITEM}-error`}
        >
          <Text variant={TextVariant.BodyMd} color={TextColor.ErrorDefault}>
            {strings('card.card_home.manage_card_options.legal_docs_error')}
          </Text>
          {onRetryLegalDocuments ? (
            <TextButton
              onPress={onRetryLegalDocuments}
              testID={`${CardHomeSelectors.CARD_TOS_ITEM}-retry`}
            >
              {strings('card.card_home.try_again')}
            </TextButton>
          ) : null}
        </Box>
      ) : null}
      <Box twClassName="pb-4">
        <MoneySheetOptionsList options={options} />
      </Box>
    </BottomSheet>
  );
};

export default CardHomeMoreSheet;
