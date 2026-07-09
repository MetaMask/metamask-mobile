import React, { useRef, useEffect, useCallback } from 'react';
import {
  BottomSheet,
  BottomSheetHeader,
  BottomSheetRef,
  Icon,
  IconColor,
  IconName,
  IconSize,
  ListItem,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type { ModifyAction } from './PerpsModifyActionSheet.types';
import { type Position } from '@metamask/perps-controller';
import { PerpsModifyActionSheetSelectorsIDs } from '../../Perps.testIds';
import { useElevatedSurface } from '../../../../../util/theme/themeUtils';

interface ActionOption {
  action: ModifyAction;
  label: string;
  description: string;
  iconName: IconName;
}

interface PerpsModifyActionSheetProps {
  isVisible?: boolean;
  onClose: () => void;
  position: Position | null;
  onActionSelect: (action: ModifyAction) => void;
  sheetRef?: React.RefObject<BottomSheetRef | null>;
  testID?: string;
}

const PerpsModifyActionSheet: React.FC<PerpsModifyActionSheetProps> = ({
  isVisible = true,
  onClose,
  position,
  onActionSelect,
  sheetRef: externalSheetRef,
  testID = PerpsModifyActionSheetSelectorsIDs.SHEET,
}) => {
  const surfaceClass = useElevatedSurface();
  const internalSheetRef = useRef<BottomSheetRef>(null);
  const sheetRef = externalSheetRef || internalSheetRef;

  const isLong = position?.size ? parseFloat(position.size) > 0 : true;
  const direction = isLong
    ? strings('perps.order.long_label')
    : strings('perps.order.short_label');
  const fromDirection = direction.toLowerCase();
  const toDirection = isLong
    ? strings('perps.order.short_label').toLowerCase()
    : strings('perps.order.long_label').toLowerCase();

  useEffect(() => {
    if (isVisible && !externalSheetRef) {
      sheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible, externalSheetRef, sheetRef]);

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(onClose);
  }, [onClose, sheetRef]);

  const actionOptions: ActionOption[] = [
    {
      action: 'add_to_position',
      label: strings('perps.modify.add_to_position'),
      description: strings('perps.modify.add_to_position_description', {
        direction: fromDirection,
      }),
      iconName: IconName.Add,
    },
    {
      action: 'reduce_position',
      label: strings('perps.modify.reduce_position'),
      description: strings('perps.modify.reduce_position_description', {
        direction: fromDirection,
      }),
      iconName: IconName.Minus,
    },
    {
      action: 'flip_position',
      label: strings('perps.modify.flip_position'),
      description: strings('perps.modify.flip_position_description', {
        fromDirection,
        toDirection,
      }),
      iconName: IconName.SwapHorizontal,
    },
  ];

  const handleActionPress = useCallback(
    (action: ModifyAction) => {
      onActionSelect(action);
    },
    [onActionSelect],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={!externalSheetRef ? onClose : undefined}
      onClose={externalSheetRef ? onClose : undefined}
      twClassName={surfaceClass}
      testID={testID}
    >
      <BottomSheetHeader onClose={handleClose}>
        {strings('perps.modify.title')}
      </BottomSheetHeader>
      {actionOptions.map((option) => (
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
          testID={`${testID}-${option.action}`}
        />
      ))}
    </BottomSheet>
  );
};

export default PerpsModifyActionSheet;
