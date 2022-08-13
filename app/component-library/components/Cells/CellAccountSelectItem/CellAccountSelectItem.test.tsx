// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import { AvatarAccountType } from '../../Avatars/AvatarAccount';
import {
  TEST_ACCOUNT_ADDRESS,
  TEST_CELL_ACCOUNT_TITLE,
} from '../CellAccountContent/CellAccountContent.constants';

// Internal dependencies.
import CellAccountSelectItem from './CellAccountSelectItem';
import { CELL_ACCOUNT_SINGLE_SELECT_TEST_ID } from './CellAccountSelectItem.constants';

describe('CellAccountSelectItem - Snapshot', () => {
  it('should render default settings correctly', () => {
    const wrapper = shallow(
      <CellAccountSelectItem
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
      <CellAccountSelectItem
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

describe('CellAccountSelectItem', () => {
  it('should render singleSelect', () => {
    const wrapper = shallow(
      <CellAccountSelectItem
        avatarAccountAddress={TEST_ACCOUNT_ADDRESS}
        avatarAccountType={AvatarAccountType.JazzIcon}
        title={TEST_CELL_ACCOUNT_TITLE}
        onPress={jest.fn}
      />,
    );
    const singleSelectComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_ACCOUNT_SINGLE_SELECT_TEST_ID,
    );
    expect(singleSelectComponent.exists()).toBe(true);
  });
});
