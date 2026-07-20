import React, { useMemo } from 'react';
import { IconName } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type {
  PerpsModifyActionSheetProps,
  ModifyAction,
} from './PerpsModifyActionSheet.types';
import { PerpsModifyActionSheetSelectorsIDs } from '../../Perps.testIds';
import PerpsActionSheet, {
  type PerpsActionSheetOption,
} from '../PerpsActionSheet';

const PerpsModifyActionSheet: React.FC<PerpsModifyActionSheetProps> = ({
  isVisible = true,
  onClose,
  position,
  onActionSelect,
  sheetRef,
  testID = PerpsModifyActionSheetSelectorsIDs.SHEET,
}) => {
  const isLong = position?.size ? parseFloat(position.size) > 0 : true;
  const direction = isLong
    ? strings('perps.order.long_label')
    : strings('perps.order.short_label');
  const fromDirection = direction.toLowerCase();
  const toDirection = isLong
    ? strings('perps.order.short_label').toLowerCase()
    : strings('perps.order.long_label').toLowerCase();

  const actionOptions: PerpsActionSheetOption<ModifyAction>[] = useMemo(
    () => [
      {
        action: 'add_to_position',
        label: strings('perps.modify.add_to_position'),
        description: strings('perps.modify.add_to_position_description', {
          direction: fromDirection,
        }),
        iconName: IconName.Add,
        testID: `${testID}-add_to_position`,
      },
      {
        action: 'reduce_position',
        label: strings('perps.modify.reduce_position'),
        description: strings('perps.modify.reduce_position_description', {
          direction: fromDirection,
        }),
        iconName: IconName.Minus,
        testID: `${testID}-reduce_position`,
      },
      {
        action: 'flip_position',
        label: strings('perps.modify.flip_position'),
        description: strings('perps.modify.flip_position_description', {
          fromDirection,
          toDirection,
        }),
        iconName: IconName.SwapHorizontal,
        testID: `${testID}-flip_position`,
      },
    ],
    [fromDirection, testID, toDirection],
  );

  return (
    <PerpsActionSheet
      isVisible={isVisible}
      onClose={onClose}
      title={strings('perps.modify.title')}
      options={actionOptions}
      onSelectAction={onActionSelect}
      sheetRef={sheetRef}
      testID={testID}
    />
  );
};

export default PerpsModifyActionSheet;
