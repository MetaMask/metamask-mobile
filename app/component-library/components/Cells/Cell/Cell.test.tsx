// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import { AvatarAccountType } from '../../Avatars/AvatarAccount';
import { AvatarProps, AvatarVariants } from '../../Avatars/Avatar.types';

// Internal dependencies.
import Cell from './Cell';
import {
  TEST_ACCOUNT_ADDRESS,
  TEST_CELL_TITLE,
  CELL_DISPLAY_TEST_ID,
  CELL_MULTI_SELECT_TEST_ID,
  CELL_SELECT_TEST_ID,
} from './Cell.constants';
import { CellVariants } from './Cell.types';

const accountAvatarProps: AvatarProps = {
  variant: AvatarVariants.Account,
  accountAddress: TEST_ACCOUNT_ADDRESS,
  type: AvatarAccountType.JazzIcon,
};

describe('Cell - Snapshot', () => {
  it('should render CellDisplay given the type Display', () => {
    const wrapper = shallow(
      <Cell
        variant={CellVariants.Display}
        avatarProps={accountAvatarProps}
        title={TEST_CELL_TITLE}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render CellMultiselect given the type Multiselect', () => {
    const wrapper = shallow(
      <Cell
        variant={CellVariants.Multiselect}
        avatarProps={accountAvatarProps}
        title={TEST_CELL_TITLE}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render CellSelect given the type Select', () => {
    const wrapper = shallow(
      <Cell
        variant={CellVariants.Select}
        avatarProps={accountAvatarProps}
        title={TEST_CELL_TITLE}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('Cell', () => {
  it('should render CellDisplay given the type Display', () => {
    const wrapper = shallow(
      <Cell
        variant={CellVariants.Display}
        avatarProps={accountAvatarProps}
        title={TEST_CELL_TITLE}
      />,
    );
    const cellDisplayComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_DISPLAY_TEST_ID,
    );
    expect(cellDisplayComponent.exists()).toBe(true);

    const cellMultiselectComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_MULTI_SELECT_TEST_ID,
    );
    expect(cellMultiselectComponent.exists()).toBe(false);

    const cellSelectComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_SELECT_TEST_ID,
    );
    expect(cellSelectComponent.exists()).toBe(false);
  });
  it('should render CellMultiselect given the type Multiselect', () => {
    const wrapper = shallow(
      <Cell
        variant={CellVariants.Multiselect}
        avatarProps={accountAvatarProps}
        title={TEST_CELL_TITLE}
      />,
    );
    const cellDisplayComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_DISPLAY_TEST_ID,
    );
    expect(cellDisplayComponent.exists()).toBe(false);

    const cellMultiselectComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_MULTI_SELECT_TEST_ID,
    );
    expect(cellMultiselectComponent.exists()).toBe(true);

    const cellSelectComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_SELECT_TEST_ID,
    );
    expect(cellSelectComponent.exists()).toBe(false);
  });
  it('should render CellSelect given the type Select', () => {
    const wrapper = shallow(
      <Cell
        variant={CellVariants.Select}
        avatarProps={accountAvatarProps}
        title={TEST_CELL_TITLE}
      />,
    );
    const cellDisplayComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_DISPLAY_TEST_ID,
    );
    expect(cellDisplayComponent.exists()).toBe(false);

    const cellMultiselectComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_MULTI_SELECT_TEST_ID,
    );
    expect(cellMultiselectComponent.exists()).toBe(false);

    const cellSelectComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_SELECT_TEST_ID,
    );
    expect(cellSelectComponent.exists()).toBe(true);
  });
});
