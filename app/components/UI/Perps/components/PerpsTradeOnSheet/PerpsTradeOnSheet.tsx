import React, { useCallback, useRef, useState } from 'react';
import { Pressable } from 'react-native';
import {
  BottomSheet,
  BottomSheetFooter,
  type BottomSheetRef,
  Box,
  ButtonSize,
  FontWeight,
  RadioButton,
  Tag,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useSelector } from 'react-redux';
import type {
  PerpsMarketData,
  PerpsProviderType,
} from '@metamask/perps-controller';

import { strings } from '../../../../../../locales/i18n';
import BottomSheetHeaderGlass from '../../../../../component-library/components-temp/BottomSheetHeaderGlass';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';
import PerpsProviderLogos from '../PerpsProviderLogos';
import { PROVIDER_DISPLAY_INFO } from '../PerpsProviderSelector/PerpsProviderSelector.constants';
import { PROVIDER_CONFIG } from '../../constants/perpsConfig';
import { PerpsTradeOnSelectorsIDs } from '../../Perps.testIds';

interface PerpsTradeOnSheetProps {
  /** Venue this order currently goes to. */
  selectedProviderId: PerpsProviderType;
  /** The saved default provider, tagged on its row. */
  defaultProviderId: PerpsProviderType;
  /** One market row per venue that lists the market, in display order. */
  venues: readonly PerpsMarketData[];
  /**
   * Applies the chosen venue to this order and closes the sheet. The
   * global default is never touched here.
   */
  onSelect: (providerId: PerpsProviderType) => void;
  /** Fires on X, swipe, and overlay; unmount the sheet here. */
  onClose: () => void;
  testID?: string;
}

/** Venue-mark size on each row, matching the exchange filter sheet. */
const TRADE_ON_SHEET_LOGO_SIZE = 40;

const VENUE_TAGLINE_KEY: Record<PerpsProviderType, string> = {
  lighter: 'perps.exchange_filter.tagline_lighter',
  hyperliquid: 'perps.exchange_filter.tagline_hyperliquid',
};

/**
 * "Trade on" sheet (TAT-4418): pick which exchange this order goes to.
 * One row per venue listing the market — venue mark, name with a
 * max-leverage tag (and a Default tag on the saved default), its
 * tagline, and a radio — plus a Save button. Saving applies to this
 * order only; the default provider is changed in settings, not here.
 */
const PerpsTradeOnSheet: React.FC<PerpsTradeOnSheetProps> = ({
  selectedProviderId,
  defaultProviderId,
  venues,
  onSelect,
  onClose,
  testID,
}) => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) ?? false;
  const sheetRef = useRef<BottomSheetRef>(null);
  const tw = useTailwind();

  // Radio selection is a draft until Save applies it.
  const [draftProviderId, setDraftProviderId] =
    useState<PerpsProviderType>(selectedProviderId);
  const isUnchanged = draftProviderId === selectedProviderId;

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleSave = useCallback(() => {
    if (isUnchanged) {
      sheetRef.current?.onCloseBottomSheet();
      return;
    }
    onSelect(draftProviderId);
    sheetRef.current?.onCloseBottomSheet();
  }, [draftProviderId, isUnchanged, onSelect]);

  return (
    <BottomSheet ref={sheetRef} onClose={onClose} testID={testID}>
      <BottomSheetHeaderGlass
        isGlass={isGlassHeader}
        onClose={handleClose}
        closeButtonProps={{
          accessibilityLabel: strings('navigation.close'),
        }}
      >
        {strings('perps.trade_on.title')}
      </BottomSheetHeaderGlass>
      <Box accessible={false} twClassName="px-4 pb-3">
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="text-center"
        >
          {strings('perps.trade_on.subtitle')}
        </Text>
        <Box twClassName="mt-4 gap-2">
          {venues.map((venue) => {
            const providerId =
              venue.providerId ?? PROVIDER_CONFIG.DefaultProvider;
            const isSelected = providerId === draftProviderId;
            const rowTestID = `${PerpsTradeOnSelectorsIDs.SHEET_OPTION}-${providerId}`;
            return (
              <Pressable
                key={providerId}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={PROVIDER_DISPLAY_INFO[providerId].name}
                testID={rowTestID}
                onPress={() => setDraftProviderId(providerId)}
                style={({ pressed }) =>
                  tw.style(
                    'flex-row items-center gap-4 rounded-2xl bg-muted p-4',
                    isSelected && 'border border-default',
                    pressed && 'opacity-70',
                  )
                }
              >
                <PerpsProviderLogos
                  providerIds={[providerId]}
                  size={TRADE_ON_SHEET_LOGO_SIZE}
                  isDecorative
                  testID={`${rowTestID}-logo`}
                />
                <Box twClassName="flex-1">
                  <Box twClassName="flex-row items-center gap-2">
                    <Text
                      variant={TextVariant.BodyMd}
                      fontWeight={FontWeight.Medium}
                      numberOfLines={1}
                    >
                      {PROVIDER_DISPLAY_INFO[providerId].name}
                    </Text>
                    {venue.maxLeverage ? (
                      <Tag testID={`${rowTestID}-leverage-tag`}>
                        {`${venue.maxLeverage} ${strings(
                          'perps.trade_on.max_leverage',
                        )}`}
                      </Tag>
                    ) : null}
                    {providerId === defaultProviderId ? (
                      <Tag testID={`${rowTestID}-default-tag`}>
                        {strings('perps.trade_on.default_tag')}
                      </Tag>
                    ) : null}
                  </Box>
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.TextAlternative}
                    numberOfLines={1}
                  >
                    {strings(VENUE_TAGLINE_KEY[providerId])}
                  </Text>
                </Box>
                <RadioButton
                  isChecked={isSelected}
                  onPress={() => setDraftProviderId(providerId)}
                  testID={`${rowTestID}-radio`}
                />
              </Pressable>
            );
          })}
        </Box>
      </Box>
      <BottomSheetFooter
        twClassName="pt-2"
        primaryButtonProps={{
          children: strings('perps.selection_sheet.save'),
          onPress: handleSave,
          size: ButtonSize.Lg,
          isDisabled: isUnchanged,
          testID: `${PerpsTradeOnSelectorsIDs.SHEET}-save`,
        }}
      />
    </BottomSheet>
  );
};

export default PerpsTradeOnSheet;
