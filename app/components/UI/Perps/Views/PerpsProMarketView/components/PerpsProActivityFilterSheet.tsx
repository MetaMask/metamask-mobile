import {
  BottomSheet,
  BottomSheetHeader,
  ListItemSelect,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import React, { useCallback, useEffect, useRef } from 'react';
import { strings } from '../../../../../../../locales/i18n';
import { useHaptics } from '../../../../../../util/haptics';
import { getPerpsProActivityViewSelector } from '../../../Perps.testIds';
import PerpsProModalPortal from './PerpsProModalPortal';
import type { ProTwapView } from '../utils/proTwapViews';

export interface PerpsProActivityFilterSheetProps {
  isVisible: boolean;
  /** The views this tab offers. Chase has no fill history, so it passes two. */
  options: readonly ProTwapView[];
  activityView: ProTwapView;
  onApply: (next: ProTwapView) => void;
  onClose: () => void;
  testID?: string;
}

const ACTIVITY_VIEW_LABEL_KEYS: Record<ProTwapView, string> = {
  active: 'perps.pro_positions_panel.twap_views.active',
  history: 'perps.pro_positions_panel.twap_views.history',
  fill_history: 'perps.pro_positions_panel.twap_views.fill_history',
};

/**
 * Bottom sheet for choosing which activity view the Chase or TWAP tab shows.
 * Applies immediately on selection — no separate Apply button, matching the
 * side-filter sheet beside it in the same filter row.
 *
 * A sheet rather than a cycling toggle so every view is reachable in one step:
 * fill history must not sit behind selecting history first.
 */
const PerpsProActivityFilterSheet = ({
  isVisible,
  options,
  activityView,
  onApply,
  onClose,
  testID = 'perps-pro-activity-filter-sheet',
}: PerpsProActivityFilterSheetProps) => {
  const { playSelection } = useHaptics();
  const sheetRef = useRef<BottomSheetRef>(null);

  useEffect(() => {
    if (isVisible) {
      sheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible]);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(onClose);
  }, [onClose]);

  const handleSelect = useCallback(
    (option: ProTwapView) => {
      if (option !== activityView) {
        playSelection().catch(() => undefined);
        onApply(option);
      }
      handleClose();
    },
    [activityView, handleClose, onApply, playSelection],
  );

  if (!isVisible) {
    return null;
  }

  return (
    <PerpsProModalPortal onRequestClose={handleClose}>
      <BottomSheet ref={sheetRef} onClose={onClose} testID={testID}>
        <BottomSheetHeader
          onClose={handleClose}
          closeButtonProps={{ testID: `${testID}-close` }}
        >
          {strings('perps.market_type.filter_by')}
        </BottomSheetHeader>
        {options.map((option) => {
          const isSelected = activityView === option;

          return (
            <ListItemSelect
              key={option}
              title={strings(ACTIVITY_VIEW_LABEL_KEYS[option])}
              isSelected={isSelected}
              showSelectedIcon={false}
              onPress={() => handleSelect(option)}
              testID={`${testID}-option-${getPerpsProActivityViewSelector(
                option,
              )}`}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
            />
          );
        })}
      </BottomSheet>
    </PerpsProModalPortal>
  );
};

export default PerpsProActivityFilterSheet;
