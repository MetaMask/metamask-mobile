// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import { AvatarAccountType } from '../../../../Avatars/AvatarAccount';
import { TEST_ACCOUNT_ADDRESS, TEST_CELL_TITLE } from '../../Cell.constants';
import { CellVariants } from '../../Cell.types';
import { AvatarProps, AvatarVariants } from '../../../../Avatars/Avatar.types';

// Internal dependencies.
import CellSelect from './CellSelect';
import { CELL_SELECT_TEST_ID } from './CellSelect.constants';

const accountAvatarProps: AvatarProps = {
  variant: AvatarVariants.Account,
  accountAddress: TEST_ACCOUNT_ADDRESS,
  type: AvatarAccountType.JazzIcon,
};

describe('CellSelect - Snapshot', () => {
  it('should render default settings correctly', () => {
    const wrapper = shallow(
      <CellSelect
        variant={CellVariants.Select}
        avatarProps={accountAvatarProps}
        title={TEST_CELL_TITLE}
        onPress={jest.fn}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render the proper selected state', () => {
    const wrapper = shallow(
      <CellSelect
        variant={CellVariants.Select}
        avatarProps={accountAvatarProps}
        title={TEST_CELL_TITLE}
        isSelected
        onPress={jest.fn}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('CellSelect', () => {
  it('should render singleSelect', () => {
    const wrapper = shallow(
      <CellSelect
        variant={CellVariants.Select}
        avatarProps={accountAvatarProps}
        title={TEST_CELL_TITLE}
        onPress={jest.fn}
      />,
    );
    const singleSelectComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_SELECT_TEST_ID,
    );
    expect(singleSelectComponent.exists()).toBe(true);
  });
});
