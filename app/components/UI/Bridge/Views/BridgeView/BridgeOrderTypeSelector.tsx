import React, { useCallback, useEffect, useRef } from 'react';
import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  ListItemSelect,
  SelectButton,
  SelectButtonVariant,
  Tag,
  TagSeverity,
  IconName,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useFloatingTabBarInset } from '../../../../../component-library/components/Navigation/TabBarFloating';
import { BridgeViewSelectorsIDs } from './BridgeView.testIds';
import { BridgeTabKey } from './BridgeView.constants';

interface OrderTypeOption {
  key: BridgeTabKey;
  label: string;
  testID: string;
  /** Shown beside the label both on the trigger and in the sheet. */
  showNewBadge?: boolean;
}

interface BridgeOrderTypeSelectorProps {
  /** Visible order types, in display order. */
  options: OrderTypeOption[];
  /** Currently committed order type. */
  selectedKey: BridgeTabKey;
  /** Opens the order-type sheet (rendered separately at the screen root). */
  onOpenSheet: () => void;
}

const OPTION_CLOSE_DELAY_MS = 150;

const NewBadge = ({ testID }: { testID: string }) => (
  <Tag
    severity={TagSeverity.Info}
    startIconName={IconName.Sparkle}
    twClassName="top-0.5"
    testID={testID}
  >
    {strings('bridge.tabs.new_badge')}
  </Tag>
);

/**
 * Order-type (Market / Limit / Recurring) picker trigger styled like the
 * Collect "Popular networks" control: a `SelectButton` dropdown affordance.
 *
 * The sheet itself is `BridgeOrderTypeSheet`, which must be rendered at the
 * screen root (outside any ScrollView) so the design-system `BottomSheet`
 * (`absolute inset-0 justify-end`) anchors to the bottom edge of the screen
 * instead of to its mount position inside the scroll content.
 */
const BridgeOrderTypeSelector = ({
  options,
  selectedKey,
  onOpenSheet,
}: BridgeOrderTypeSelectorProps) => {
  const selected = options.find((option) => option.key === selectedKey);

  return (
    <Box twClassName="px-4">
      <SelectButton
        testID={BridgeViewSelectorsIDs.ORDER_TYPE_SELECTOR}
        variant={SelectButtonVariant.Primary}
        placeholder={strings('bridge.tabs.market')}
        value={selected?.label ?? strings('bridge.tabs.market')}
        onPress={onOpenSheet}
        endAccessory={
          selected?.showNewBadge ? (
            <NewBadge testID={BridgeViewSelectorsIDs.LIMIT_TAB_NEW_BADGE} />
          ) : undefined
        }
      />
    </Box>
  );
};

interface BridgeOrderTypeSheetProps {
  /** Visible order types, in display order. */
  options: OrderTypeOption[];
  /** Currently committed order type. */
  selectedKey: BridgeTabKey;
  /** Fired when the sheet finishes closing (backdrop tap, close button, or selection). */
  onClose: () => void;
  /** Fired when the user picks an order type from the sheet. */
  onSelect: (key: BridgeTabKey) => void;
}

/**
 * Bottom sheet listing the order types. Render this at the screen root — the
 * design-system `BottomSheet` is absolutely positioned over its nearest
 * ancestor, so mounting it outside the ScrollView anchors it to the bottom
 * edge of the screen with its backdrop, like every other sheet in the app.
 *
 * Mount this component only while the sheet should be visible; the parent
 * keys it per open session so a trigger press during the close animation
 * remounts a fresh sheet instead of being swallowed.
 */
export const BridgeOrderTypeSheet = ({
  options,
  selectedKey,
  onClose,
  onSelect,
}: BridgeOrderTypeSheetProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const footerInset = useFloatingTabBarInset();

  // Clear a pending post-selection close when the sheet unmounts (the parent
  // keys the sheet per open session, so a trigger press mid-close remounts).
  useEffect(
    () => () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
    },
    [],
  );

  const closeSheet = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleSheetClosed = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    onClose();
  }, [onClose]);

  const handleSelect = useCallback(
    (key: BridgeTabKey) => {
      onSelect(key);
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
      // Brief delay so the user sees the new selection before the sheet closes.
      closeTimeoutRef.current = setTimeout(closeSheet, OPTION_CLOSE_DELAY_MS);
    },
    [closeSheet, onSelect],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      testID={BridgeViewSelectorsIDs.ORDER_TYPE_SHEET}
      onClose={handleSheetClosed}
      // Lift the sheet above the floating footer so it isn't covered by it.
      // Padding (not `bottom`) keeps the absolute backdrop covering the footer.
      style={footerInset > 0 ? { paddingBottom: footerInset } : undefined}
    >
      <BottomSheetHeader
        onClose={closeSheet}
        closeButtonProps={{
          testID: BridgeViewSelectorsIDs.ORDER_TYPE_SHEET_CLOSE,
        }}
      >
        {strings('bridge.tabs.order_type')}
      </BottomSheetHeader>
      <Box paddingBottom={2}>
        {options.map((option) => (
          <ListItemSelect
            key={option.key}
            title={option.label}
            isSelected={option.key === selectedKey}
            showSelectedIcon
            onPress={() => handleSelect(option.key)}
            testID={option.testID}
            endAccessory={
              option.showNewBadge ? (
                <NewBadge testID={`${option.testID}-new-badge`} />
              ) : undefined
            }
          />
        ))}
      </Box>
    </BottomSheet>
  );
};

export default BridgeOrderTypeSelector;
