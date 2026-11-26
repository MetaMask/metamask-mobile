import React, { useCallback, useRef } from 'react';
import { Linking, TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import {
  BottomSheet,
  Box,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Switch,
  Text,
  TextButton,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import {
  ImpactFeedbackStyle,
  fireSwitchHaptic,
  playSelection,
} from '../../../../../../util/haptics';
import { useStyles } from '../../../../../../component-library/hooks';
import moneySheetOptionsStyleSheet from '../../../../Money/components/MoneySheetOptionsList/MoneySheetOptionsList.styles';
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
  /**
   * PROTOTYPE: local-only cashback auto payout toggle. Omitted: no row.
   * `targetLabel` is the payout increment, e.g. "$5".
   */
  cashbackAutoPayout?: {
    isOn: boolean;
    onToggle: (value: boolean) => void;
    targetLabel: string;
  };
}

/**
 * Card home "More" sheet, opened from the header's vertical-ellipsis button.
 * Mirrors Money home's `MoneyMoreSheet` (MMDS BottomSheet, HeadingSm title,
 * icon + label rows) and reuses Money's `MoneySheetOptionsList` for the rows.
 * Holds the legal links and Contact support that used to sit at the bottom
 * of Card home, wired to the same actions. Card log out stays in
 * Settings > Experimental.
 */
const CardHomeMoreSheet = ({
  onClose,
  supportEmail,
  onContactSupport,
  legalDocuments,
  hideLegalDocuments = false,
  showLegalDocumentsError = false,
  onRetryLegalDocuments,
  onNavigateToCardTos,
  cashbackAutoPayout,
}: CardHomeMoreSheetProps) => {
  const { styles: optionStyles } = useStyles(moneySheetOptionsStyleSheet, {});
  const sheetRef = useRef<BottomSheetRef>(null);
  const isGlassHeader = useSelector(selectGlassHeadersEnabled);

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
      {cashbackAutoPayout ? (
        // Same row layout as MoneySheetOptionsList (icon, label, no
        // background), plus a description and a switch.
        <TouchableOpacity
          onPress={() => {
            playSelection().catch(() => undefined);
            cashbackAutoPayout.onToggle(!cashbackAutoPayout.isOn);
          }}
          style={optionStyles.row}
          accessibilityRole="switch"
          accessibilityState={{ checked: cashbackAutoPayout.isOn }}
          testID={CardHomeSelectors.CASHBACK_AUTO_PAYOUT_ITEM}
        >
          <Icon
            name={IconName.Refresh}
            size={IconSize.Lg}
            color={IconColor.IconDefault}
          />
          <View style={optionStyles.rowLabelContainer}>
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              {strings('card.card_home.cashback_panel.auto_payout_title')}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {strings(
                'card.card_home.cashback_panel.auto_payout_description',
                { target: cashbackAutoPayout.targetLabel },
              )}
            </Text>
          </View>
          <Switch
            isOn={cashbackAutoPayout.isOn}
            onValueChange={(value) => {
              // iOS UISwitch already ticks; this adds the tick on Android.
              fireSwitchHaptic(ImpactFeedbackStyle.Light);
              cashbackAutoPayout.onToggle(value);
            }}
            testID={CardHomeSelectors.CASHBACK_AUTO_PAYOUT_TOGGLE}
          />
        </TouchableOpacity>
      ) : null}
      <Box twClassName="pb-4">
        <MoneySheetOptionsList options={options} />
      </Box>
    </BottomSheet>
  );
};

export default CardHomeMoreSheet;
