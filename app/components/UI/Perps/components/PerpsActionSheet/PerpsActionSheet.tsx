import React, { useRef, useEffect, useCallback } from 'react';
import {
  BottomSheet,
  BottomSheetHeader,
  BottomSheetRef,
  Icon,
  IconColor,
  IconSize,
  ListItem,
} from '@metamask/design-system-react-native';
import { useElevatedSurface } from '../../../../../util/theme/themeUtils';
import type { PerpsActionSheetProps } from './PerpsActionSheet.types';

function PerpsActionSheet<T extends string>({
  isVisible = true,
  onClose,
  title,
  options,
  onSelectAction,
  sheetRef: externalSheetRef,
  testID,
}: PerpsActionSheetProps<T>) {
  const surfaceClass = useElevatedSurface();
  const internalSheetRef = useRef<BottomSheetRef>(null);
  const sheetRef = externalSheetRef || internalSheetRef;

  useEffect(() => {
    if (isVisible && !externalSheetRef) {
      sheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible, externalSheetRef, sheetRef]);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(onClose);
  }, [onClose, sheetRef]);

  const handleActionPress = useCallback(
    (action: T) => {
      onSelectAction(action);
    },
    [onSelectAction],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={!externalSheetRef ? onClose : undefined}
      onClose={externalSheetRef ? onClose : undefined}
      twClassName={surfaceClass}
      testID={testID}
    >
      <BottomSheetHeader onClose={handleClose}>{title}</BottomSheetHeader>
      {options.map((option) => (
        <ListItem
          key={option.action}
          isInteractive
          avatar={
            <Icon
              name={option.iconName}
              size={IconSize.Md}
              color={IconColor.IconDefault}
            />
          }
          title={option.label}
          description={option.description}
          onPress={() => handleActionPress(option.action)}
          testID={option.testID}
        />
      ))}
    </BottomSheet>
  );
}

PerpsActionSheet.displayName = 'PerpsActionSheet';

export default PerpsActionSheet;
