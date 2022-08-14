// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import { AvatarAccountType } from '../../Avatars/AvatarAccount';
import { CellAccountBaseItemType } from '../CellAccountBaseItem/CellAccountBaseItem.types';

// Internal dependencies.
import CellAccount from './CellAccount';
import {
  TEST_ACCOUNT_ADDRESS,
  TEST_CELL_ACCOUNT_TITLE,
  CELL_ACCOUNT_DISPLAY_TEST_ID,
  CELL_ACCOUNT_MULTI_SELECT_TEST_ID,
  CELL_ACCOUNT_SELECT_TEST_ID,
} from './CellAccount.constants';

describe('CellAccount - Snapshot', () => {
  it('should render CellAccountDisplayItem given the type Display', () => {
    const wrapper = shallow(
      <CellAccount
        type={CellAccountBaseItemType.Display}
        avatarAccountAddress={TEST_ACCOUNT_ADDRESS}
        avatarAccountType={AvatarAccountType.JazzIcon}
        title={TEST_CELL_ACCOUNT_TITLE}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render CellAccountMultiselectItem given the type Multiselect', () => {
    const wrapper = shallow(
      <CellAccount
        type={CellAccountBaseItemType.Multiselect}
        avatarAccountAddress={TEST_ACCOUNT_ADDRESS}
        avatarAccountType={AvatarAccountType.JazzIcon}
        title={TEST_CELL_ACCOUNT_TITLE}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render CellAccountSelectItem given the type Select', () => {
    const wrapper = shallow(
      <CellAccount
        type={CellAccountBaseItemType.Select}
        avatarAccountAddress={TEST_ACCOUNT_ADDRESS}
        avatarAccountType={AvatarAccountType.JazzIcon}
        title={TEST_CELL_ACCOUNT_TITLE}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('CellAccount', () => {
  it('should render CellAccountDisplayItem given the type Display', () => {
    const wrapper = shallow(
      <CellAccount
        type={CellAccountBaseItemType.Display}
        avatarAccountAddress={TEST_ACCOUNT_ADDRESS}
        avatarAccountType={AvatarAccountType.JazzIcon}
        title={TEST_CELL_ACCOUNT_TITLE}
      />,
    );
    const cellAccountDisplayItemComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_ACCOUNT_DISPLAY_TEST_ID,
    );
    expect(cellAccountDisplayItemComponent.exists()).toBe(true);

    const cellAccountMultiselectItemComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_ACCOUNT_MULTI_SELECT_TEST_ID,
    );
    expect(cellAccountMultiselectItemComponent.exists()).toBe(false);

    const cellAccountSelectItemComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_ACCOUNT_SELECT_TEST_ID,
    );
    expect(cellAccountSelectItemComponent.exists()).toBe(false);
  });
  it('should render CellAccountMultiselectItem given the type Multiselect', () => {
    const wrapper = shallow(
      <CellAccount
        type={CellAccountBaseItemType.Multiselect}
        avatarAccountAddress={TEST_ACCOUNT_ADDRESS}
        avatarAccountType={AvatarAccountType.JazzIcon}
        title={TEST_CELL_ACCOUNT_TITLE}
      />,
    );
    const cellAccountDisplayItemComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_ACCOUNT_DISPLAY_TEST_ID,
    );
    expect(cellAccountDisplayItemComponent.exists()).toBe(false);

    const cellAccountMultiselectItemComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_ACCOUNT_MULTI_SELECT_TEST_ID,
    );
    expect(cellAccountMultiselectItemComponent.exists()).toBe(true);

    const cellAccountSelectItemComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_ACCOUNT_SELECT_TEST_ID,
    );
    expect(cellAccountSelectItemComponent.exists()).toBe(false);
  });
  it('should render CellAccountSelectItem given the type Select', () => {
    const wrapper = shallow(
      <CellAccount
        type={CellAccountBaseItemType.Select}
        avatarAccountAddress={TEST_ACCOUNT_ADDRESS}
        avatarAccountType={AvatarAccountType.JazzIcon}
        title={TEST_CELL_ACCOUNT_TITLE}
      />,
    );
    const cellAccountDisplayItemComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_ACCOUNT_DISPLAY_TEST_ID,
    );
    expect(cellAccountDisplayItemComponent.exists()).toBe(false);

    const cellAccountMultiselectItemComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_ACCOUNT_MULTI_SELECT_TEST_ID,
    );
    expect(cellAccountMultiselectItemComponent.exists()).toBe(false);

    const cellAccountSelectItemComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_ACCOUNT_SELECT_TEST_ID,
    );
    expect(cellAccountSelectItemComponent.exists()).toBe(true);
  });
});
