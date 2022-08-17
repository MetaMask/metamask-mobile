// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import { AvatarAccountType } from '../../../../Avatars/AvatarAccount';
import { TEST_ACCOUNT_ADDRESS, TEST_CELL_TITLE } from '../../Cell.constants';
import { CellVariants } from '../../Cell.types';
import { AvatarProps, AvatarVariants } from '../../../../Avatars/Avatar.types';

// Internal dependencies.
import CellDisplay from './CellDisplay';
import { CELL_DISPLAY_TEST_ID } from './CellDisplay.constants';

const accountAvatarProps: AvatarProps = {
  variant: AvatarVariants.Account,
  accountAddress: TEST_ACCOUNT_ADDRESS,
  type: AvatarAccountType.JazzIcon,
};

describe('CellDisplay - Snapshot', () => {
  it('should render default settings correctly', () => {
    const wrapper = shallow(
      <CellDisplay
        variant={CellVariants.Display}
        avatarProps={accountAvatarProps}
        title={TEST_CELL_TITLE}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('CellDisplay', () => {
  it('should render CellDisplay', () => {
    const wrapper = shallow(
      <CellDisplay
        variant={CellVariants.Display}
        avatarProps={accountAvatarProps}
        title={TEST_CELL_TITLE}
      />,
    );
    const singleSelectComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_DISPLAY_TEST_ID,
    );
    expect(singleSelectComponent.exists()).toBe(true);
  });
});
