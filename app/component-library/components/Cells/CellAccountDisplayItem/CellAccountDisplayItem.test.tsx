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
import CellAccountDisplayItem from './CellAccountDisplayItem';
import { CELL_ACCOUNT_DISPLAY_TEST_ID } from './CellAccountDisplayItem.constants';

describe('CellAccountDisplayItem - Snapshot', () => {
  it('should render default settings correctly', () => {
    const wrapper = shallow(
      <CellAccountDisplayItem
        avatarAccountAddress={TEST_ACCOUNT_ADDRESS}
        avatarAccountType={AvatarAccountType.JazzIcon}
        title={TEST_CELL_ACCOUNT_TITLE}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('CellAccountDisplayItem', () => {
  it('should render CellAccountDisplayItem', () => {
    const wrapper = shallow(
      <CellAccountDisplayItem
        avatarAccountAddress={TEST_ACCOUNT_ADDRESS}
        avatarAccountType={AvatarAccountType.JazzIcon}
        title={TEST_CELL_ACCOUNT_TITLE}
      />,
    );
    const singleSelectComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_ACCOUNT_DISPLAY_TEST_ID,
    );
    expect(singleSelectComponent.exists()).toBe(true);
  });
});
