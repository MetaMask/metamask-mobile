import React, { useMemo } from 'react';
import { IconName } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type {
  PerpsAdjustMarginActionSheetProps,
  AdjustMarginAction,
} from './PerpsAdjustMarginActionSheet.types';
import { PerpsAdjustMarginActionSheetSelectorsIDs } from '../../Perps.testIds';
import PerpsActionSheet, {
  type PerpsActionSheetOption,
} from '../PerpsActionSheet';

const PerpsAdjustMarginActionSheet: React.FC<
  PerpsAdjustMarginActionSheetProps
> = ({ isVisible = true, onClose, onSelectAction, sheetRef, testID }) => {
  const actionOptions: PerpsActionSheetOption<AdjustMarginAction>[] = useMemo(
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

  return (
    <PerpsActionSheet
      isVisible={isVisible}
      onClose={onClose}
      title={strings('perps.adjust_margin.title')}
      options={actionOptions}
      onSelectAction={onSelectAction}
      sheetRef={sheetRef}
      testID={testID}
    />
  );
};

PerpsAdjustMarginActionSheet.displayName = 'PerpsAdjustMarginActionSheet';

export default PerpsAdjustMarginActionSheet;
