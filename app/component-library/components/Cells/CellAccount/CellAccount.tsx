/* eslint-disable react/prop-types */
import React from 'react';

// External dependencies.
import { CellAccountItemType } from './foundation/CellAccountBaseItem/CellAccountBaseItem.types';
import CellAccountDisplayItem from './variants/CellAccountDisplayItem';
import CellAccountMultiselectItem from './variants/CellAccountMultiselectItem';
import CellAccountSelectItem from './variants/CellAccountSelectItem';

// Internal dependencies.
import { CellAccountProps } from './CellAccount.types';
import {
  CELL_ACCOUNT_DISPLAY_TEST_ID,
  CELL_ACCOUNT_MULTI_SELECT_TEST_ID,
  CELL_ACCOUNT_SELECT_TEST_ID,
} from './CellAccount.constants';

const CellAccount = (cellAccountProps: CellAccountProps) => {
  switch (cellAccountProps.type) {
    case CellAccountItemType.Display:
      return (
        <CellAccountDisplayItem
          testID={CELL_ACCOUNT_DISPLAY_TEST_ID}
          {...cellAccountProps}
        />
      );
    case CellAccountItemType.Multiselect:
      return (
        <CellAccountMultiselectItem
          testID={CELL_ACCOUNT_MULTI_SELECT_TEST_ID}
          {...cellAccountProps}
        />
      );
    case CellAccountItemType.Select:
      return (
        <CellAccountSelectItem
          testID={CELL_ACCOUNT_SELECT_TEST_ID}
          {...cellAccountProps}
        />
      );
  }
};

export default CellAccount;
