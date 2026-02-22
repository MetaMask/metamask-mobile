import { useCallback, useRef, useState } from 'react';
import type { BottomSheetRef } from '../../../../component-library/components/BottomSheets/BottomSheet';
import type { Position } from '../controllers/types';

/**
 * Options for position management hook
 */
export interface UsePositionManagementOptions {
  position?: Position;
  onNavigateToTPSL?: (position: Position) => void;
  onNavigateToAdjustMargin?: (
    position: Position,
    mode: 'add' | 'remove',
  ) => void;
  onNavigateToClosePosition?: (position: Position) => void;
}

/**
 * Return type for position management hook
 */
export interface UsePositionManagementReturn {
  // Bottom sheet state
  showModifyActionSheet: boolean;
  showAdjustMarginActionSheet: boolean;
  showReversePositionSheet: boolean;

  // Bottom sheet refs
  modifyActionSheetRef: React.RefObject<BottomSheetRef>;
  adjustMarginActionSheetRef: React.RefObject<BottomSheetRef>;
  reversePositionSheetRef: React.RefObject<BottomSheetRef>;

  // Action handlers
  openModifySheet: () => void;
  closeModifySheet: () => void;
  openAdjustMarginSheet: () => void;
  closeAdjustMarginSheet: () => void;
  openReversePositionSheet: () => void;
  closeReversePositionSheet: () => void;
  handleReversePosition: (position: Position) => void;
}

/**
 * usePositionManagement Hook
 *
 * Centralizes position management UI state and handlers for bottom sheets.
 * Extracted from PerpsMarketDetailsView to reduce component complexity.
 *
 * This hook manages the state and refs for three bottom sheets:
 * 1. Modify Action Sheet - Shows position modification options (increase, reduce, flip, TP/SL, margin)
 * 2. Adjust Margin Action Sheet - Specific sheet for margin adjustment mode selection
 * 3. Reverse Position Sheet - Confirmation sheet for flipping position direction
 *
 * @param options - Configuration for callbacks (currently unused but available for future extension)
 * @returns State, refs, and handlers for position management bottom sheets
 *
 * @example
 * ```tsx
 * const {
 *   showModifyActionSheet,
 *   modifyActionSheetRef,
 *   openModifySheet,
 *   closeModifySheet,
 *   // ... other returns
 * } = usePositionManagement();
 *
 * // Use in JSX
 * <Button onPress={openModifySheet} />
 * <PerpsSelectModifyActionView
 *   ref={modifyActionSheetRef}
 *   visible={showModifyActionSheet}
 *   onClose={closeModifySheet}
 * />
 * ```
 */
export const usePositionManagement = (
  _options: UsePositionManagementOptions = {},
): UsePositionManagementReturn => {
  // Bottom sheet state
  const [showModifyActionSheet, setShowModifyActionSheet] = useState(false);
  const [showAdjustMarginActionSheet, setShowAdjustMarginActionSheet] =
    useState(false);
  const [showReversePositionSheet, setShowReversePositionSheet] =
    useState(false);

  // Bottom sheet refs
  const modifyActionSheetRef = useRef<BottomSheetRef>(null);
  const adjustMarginActionSheetRef = useRef<BottomSheetRef>(null);
  const reversePositionSheetRef = useRef<BottomSheetRef>(null);

  // Modify action sheet handlers
  const openModifySheet = useCallback(() => {
    setShowModifyActionSheet(true);
  }, []);

  const closeModifySheet = useCallback(() => {
    setShowModifyActionSheet(false);
  }, []);

  // Adjust margin action sheet handlers
  const openAdjustMarginSheet = useCallback(() => {
    setShowAdjustMarginActionSheet(true);
  }, []);

  const closeAdjustMarginSheet = useCallback(() => {
    setShowAdjustMarginActionSheet(false);
  }, []);

  // Reverse position sheet handlers
  const openReversePositionSheet = useCallback(() => {
    setShowReversePositionSheet(true);
  }, []);

  const closeReversePositionSheet = useCallback(() => {
    setShowReversePositionSheet(false);
  }, []);

  const handleReversePosition = useCallback((_position: Position) => {
    setShowReversePositionSheet(true);
  }, []);

  return {
    // State
    showModifyActionSheet,
    showAdjustMarginActionSheet,
    showReversePositionSheet,

    // Refs
    modifyActionSheetRef,
    adjustMarginActionSheetRef,
    reversePositionSheetRef,

    // Handlers
    openModifySheet,
    closeModifySheet,
    openAdjustMarginSheet,
    closeAdjustMarginSheet,
    openReversePositionSheet,
    closeReversePositionSheet,
    handleReversePosition,
  };
};
