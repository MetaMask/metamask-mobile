import { PERPS_VENUE_IDS } from '../../constants/venueIds';
import React, { useCallback, useRef, useState } from 'react';
import {
  BottomSheet,
  BottomSheetFooter,
  type BottomSheetRef,
  Box,
  ButtonSize,
  ListItemMultiSelect,
} from '@metamask/design-system-react-native';
import { useSelector } from 'react-redux';
import type { PerpsProviderType } from '@metamask/perps-controller';
import { strings } from '../../../../../../locales/i18n';
import BottomSheetHeaderGlass from '../../../../../component-library/components-temp/BottomSheetHeaderGlass';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';
import { PROVIDER_DISPLAY_INFO } from '../PerpsProviderSelector/PerpsProviderSelector.constants';
import PerpsProviderLogos from '../PerpsProviderLogos';

export const PerpsExchangeFilterSheetSelectorsIDs = {
  CONTAINER: 'perps-exchange-filter-sheet',
  CLOSE_BUTTON: 'perps-exchange-filter-sheet-close',
  OPTION: 'perps-exchange-filter-sheet-option',
  SAVE_BUTTON: 'perps-exchange-filter-sheet-save',
} as const;

export interface PerpsExchangeFilterSheetProps {
  selectedProviderIds: PerpsProviderType[];
  onSave: (providerIds: PerpsProviderType[]) => void;
  /** Fires on X, swipe, overlay, and after Save; unmount the sheet here. */
  onClose: () => void;
  testID?: string;
}

const TAGLINE_STRING_KEY: Record<PerpsProviderType, string> = {
  lighter: 'perps.exchange_filter.tagline_lighter',
  hyperliquid: 'perps.exchange_filter.tagline_hyperliquid',
};

const PerpsExchangeFilterSheet: React.FC<PerpsExchangeFilterSheetProps> = ({
  selectedProviderIds,
  onSave,
  onClose,
  testID = PerpsExchangeFilterSheetSelectorsIDs.CONTAINER,
}) => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const sheetRef = useRef<BottomSheetRef>(null);
  const [draftProviderIds, setDraftProviderIds] = useState<PerpsProviderType[]>(
    () => selectedProviderIds,
  );

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const toggleProvider = useCallback((providerId: PerpsProviderType) => {
    setDraftProviderIds((previous) =>
      previous.includes(providerId)
        ? previous.filter((id) => id !== providerId)
        : [...previous, providerId],
    );
  }, []);

  const handleSave = useCallback(() => {
    if (draftProviderIds.length === 0) {
      return;
    }
    onSave(
      PERPS_VENUE_IDS.filter((providerId) =>
        draftProviderIds.includes(providerId),
      ),
    );
    sheetRef.current?.onCloseBottomSheet();
  }, [draftProviderIds, onSave]);

  return (
    <BottomSheet ref={sheetRef} onClose={onClose} testID={testID}>
      <BottomSheetHeaderGlass
        isGlass={isGlassHeader}
        onClose={handleClose}
        closeButtonProps={{
          accessibilityLabel: strings('navigation.close'),
          testID: PerpsExchangeFilterSheetSelectorsIDs.CLOSE_BUTTON,
        }}
      >
        {strings('perps.exchange_filter.title')}
      </BottomSheetHeaderGlass>
      <Box accessible={false} twClassName="px-4 pb-3" gap={2}>
        {PERPS_VENUE_IDS.map((providerId) => {
          const name = PROVIDER_DISPLAY_INFO[providerId].name;
          const isChecked = draftProviderIds.includes(providerId);
          const rowTestID = `${PerpsExchangeFilterSheetSelectorsIDs.OPTION}-${providerId}`;
          return (
            <ListItemMultiSelect
              key={providerId}
              isSelected={isChecked}
              onPress={() => toggleProvider(providerId)}
              title={name}
              description={strings(TAGLINE_STRING_KEY[providerId])}
              startAccessory={
                <PerpsProviderLogos
                  providerIds={[providerId]}
                  size={40}
                  isDecorative
                  testID={`${rowTestID}-logo`}
                />
              }
              accessoryGap={4}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isChecked }}
              accessibilityLabel={name}
              twClassName={
                isChecked
                  ? 'rounded-2xl border border-default bg-muted'
                  : 'rounded-2xl border border-transparent bg-muted'
              }
              testID={rowTestID}
            />
          );
        })}
      </Box>
      <BottomSheetFooter
        twClassName="pt-2"
        primaryButtonProps={{
          children: strings('perps.selection_sheet.save'),
          onPress: handleSave,
          size: ButtonSize.Lg,
          isDisabled: draftProviderIds.length === 0,
          testID: PerpsExchangeFilterSheetSelectorsIDs.SAVE_BUTTON,
        }}
      />
    </BottomSheet>
  );
};

PerpsExchangeFilterSheet.displayName = 'PerpsExchangeFilterSheet';

export default PerpsExchangeFilterSheet;
