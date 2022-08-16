// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import { AvatarAccountType } from '../../../../Avatars/AvatarAccount';
import {
  TEST_ACCOUNT_ADDRESS,
  TEST_CELL_ACCOUNT_TITLE,
} from '../../CellAccount.constants';
import { CellAccountItemType } from '../../foundation/CellAccountBaseItem/CellAccountBaseItem.types';

// Internal dependencies.
import CellAccountMultiselectItem from './CellAccountMultiselectItem';
import { CELL_ACCOUNT_MULTI_SELECT_ITEM_TEST_ID } from './CellAccountMultiselectItem.constants';

describe('CellAccountMultiselectItem - Snapshot', () => {
  it('should render default settings correctly', () => {
    const wrapper = shallow(
      <CellAccountMultiselectItem
        type={CellAccountItemType.Multiselect}
        avatarAccountAddress={TEST_ACCOUNT_ADDRESS}
        avatarAccountType={AvatarAccountType.JazzIcon}
        title={TEST_CELL_ACCOUNT_TITLE}
        onPress={jest.fn}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render the proper selected state', () => {
    const wrapper = shallow(
      <CellAccountMultiselectItem
        type={CellAccountItemType.Multiselect}
        avatarAccountAddress={TEST_ACCOUNT_ADDRESS}
        avatarAccountType={AvatarAccountType.JazzIcon}
        title={TEST_CELL_ACCOUNT_TITLE}
        isSelected
        onPress={jest.fn}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('CellAccountMultiselectItem', () => {
  it('should render singleSelect', () => {
    const wrapper = shallow(
      <CellAccountMultiselectItem
        type={CellAccountItemType.Multiselect}
        avatarAccountAddress={TEST_ACCOUNT_ADDRESS}
        avatarAccountType={AvatarAccountType.JazzIcon}
        title={TEST_CELL_ACCOUNT_TITLE}
        onPress={jest.fn}
      />,
    );
    const singleSelectComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_ACCOUNT_MULTI_SELECT_ITEM_TEST_ID,
    );
    expect(singleSelectComponent.exists()).toBe(true);
  });
});
