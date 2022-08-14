/* eslint-disable react/prop-types */
import React from 'react';

// External dependencies.
import { CellAccountBaseItemType } from '../CellAccountBaseItem/CellAccountBaseItem.types';
import CellAccountDisplayItem from '../CellAccountDisplayItem';
import CellAccountMultiselectItem from '../CellAccountMultiselectItem';
import CellAccountSelectItem from '../CellAccountSelectItem';

// Internal dependencies.
import { CellAccountProps } from './CellAccount.types';
import {
  CELL_ACCOUNT_DISPLAY_TEST_ID,
  CELL_ACCOUNT_MULTI_SELECT_TEST_ID,
  CELL_ACCOUNT_SELECT_TEST_ID,
} from './CellAccount.constants';

const CellAccount = (cellAccountProps: CellAccountProps) => {
  switch (cellAccountProps.type) {
    case CellAccountBaseItemType.Display:
      return (
        <CellAccountDisplayItem
          testID={CELL_ACCOUNT_DISPLAY_TEST_ID}
          {...cellAccountProps}
        />
      );
    case CellAccountBaseItemType.Multiselect:
      return (
        <CellAccountMultiselectItem
          testID={CELL_ACCOUNT_MULTI_SELECT_TEST_ID}
          {...cellAccountProps}
        />
      );
    case CellAccountBaseItemType.Select:
      return (
        <CellAccountSelectItem
          testID={CELL_ACCOUNT_SELECT_TEST_ID}
          {...cellAccountProps}
        />
      );
  }
};

export default CellAccount;
