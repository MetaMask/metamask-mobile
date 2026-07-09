import React, { useMemo, useCallback, useRef, useEffect } from 'react';
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
import type {
  PerpsAdjustMarginActionSheetProps,
  AdjustMarginAction,
} from './PerpsAdjustMarginActionSheet.types';
import { PerpsAdjustMarginActionSheetSelectorsIDs } from '../../Perps.testIds';
import { useElevatedSurface } from '../../../../../util/theme/themeUtils';

interface ActionOption {
  action: AdjustMarginAction;
  label: string;
  description: string;
  iconName: IconName;
  testID: string;
}

const PerpsAdjustMarginActionSheet: React.FC<
  PerpsAdjustMarginActionSheetProps
> = ({
  isVisible = true,
  onClose,
  onSelectAction,
  sheetRef: externalSheetRef,
  testID,
}) => {
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

  const actionOptions: ActionOption[] = useMemo(
    () => [
      {
        action: 'add_margin',
        label: strings('perps.adjust_margin.add_margin'),
        description: strings('perps.adjust_margin.add_margin_description'),
        iconName: IconName.Add,
        testID: PerpsAdjustMarginActionSheetSelectorsIDs.ADD_MARGIN_OPTION,
      },
      {
        action: 'reduce_margin',
        label: strings('perps.adjust_margin.reduce_margin'),
        description: strings('perps.adjust_margin.reduce_margin_description'),
        iconName: IconName.Minus,
        testID: PerpsAdjustMarginActionSheetSelectorsIDs.REDUCE_MARGIN_OPTION,
      },
    ],
    [],
  );

  const handleActionPress = useCallback(
    (action: AdjustMarginAction) => {
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
      <BottomSheetHeader onClose={handleClose}>
        {strings('perps.adjust_margin.title')}
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
          testID={option.testID}
        />
      ))}
    </BottomSheet>
  );
};

PerpsAdjustMarginActionSheet.displayName = 'PerpsAdjustMarginActionSheet';

export default PerpsAdjustMarginActionSheet;
