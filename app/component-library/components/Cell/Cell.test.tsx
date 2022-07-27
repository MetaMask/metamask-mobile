// 3rd party dependencies
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies
import { AccountAvatarType } from '../AccountAvatar';

// Internal dependencies
import Cell from './Cell';
import {
  TEST_ACCOUNT_ADDRESS,
  TEST_CELL_TITLE,
  TEST_CELL_SECONDARY_TEXT,
  TEST_CELL_TERTIARY_TEXT,
  TEST_LABEL_TEXT,
  CELL_AVATAR_TEST_ID,
  CELL_TITLE_TEST_ID,
  CELL_SECONDARY_TEXT_TEST_ID,
  CELL_TERTIARY_TEXT_TEST_ID,
  CELL_LABEL_TEST_ID
} from './Cell.constants';

describe('Cell', () => {
  it('should render multiselect if isMultiSelect is true', () => {
    const wrapper = shallow(
      <Cell
        accountAddress={TEST_ACCOUNT_ADDRESS}
        accountAvatarType={AccountAvatarType.JazzIcon}
        title={TEST_CELL_TITLE}
        isMultiSelect
        onPress={jest.fn}
      />
    );
    const multiSelectComponent = wrapper.find('CellContainerMultiSelectOption');
    const singleSelectComponent = wrapper.find('CellContainerSelectOption');

    expect(multiSelectComponent.exists()).toBe(true);
    expect(singleSelectComponent.exists()).toBe(false);
  });
  it('should render single select if isMultiSelect is false', () => {
    const wrapper = shallow(
      <Cell
        accountAddress={TEST_ACCOUNT_ADDRESS}
        accountAvatarType={AccountAvatarType.JazzIcon}
        title={TEST_CELL_TITLE}
        isMultiSelect={false}
        onPress={jest.fn}
      />
    );
    const multiSelectComponent = wrapper.find('CellContainerMultiSelectOption');
    const singleSelectComponent = wrapper.find('CellContainerSelectOption');

    expect(singleSelectComponent.exists()).toBe(true);
    expect(multiSelectComponent.exists()).toBe(false);
  });
  it('should render Avatar', () => {
    const wrapper = shallow(
      <Cell
        accountAddress={TEST_ACCOUNT_ADDRESS}
        accountAvatarType={AccountAvatarType.JazzIcon}
        title={TEST_CELL_TITLE}
        onPress={jest.fn}
      />
    );
    const avatarComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_AVATAR_TEST_ID,
    );
    expect(avatarComponent.exists()).toBe(true);
  });
  it('should render the given title', () => {
    const wrapper = shallow(
      <Cell
        accountAddress={TEST_ACCOUNT_ADDRESS}
        accountAvatarType={AccountAvatarType.JazzIcon}
        title={TEST_CELL_TITLE}
        onPress={jest.fn}
      />
    );
    const titleElement = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_TITLE_TEST_ID,
    );
    expect(titleElement.props().children).toBe(TEST_CELL_TITLE);
  });
  it('should render the given secondaryText', () => {
    const wrapper = shallow(
      <Cell
        accountAddress={TEST_ACCOUNT_ADDRESS}
        accountAvatarType={AccountAvatarType.JazzIcon}
        title={TEST_CELL_TITLE}
        secondaryText={TEST_CELL_SECONDARY_TEXT}
        onPress={jest.fn}
      />
    );
    const secondaryTextElement = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_SECONDARY_TEXT_TEST_ID,
    );
    expect(secondaryTextElement.props().children).toBe(TEST_CELL_SECONDARY_TEXT);
  });
  it('should not render secondaryText if not given', () => {
    const wrapper = shallow(
      <Cell
        accountAddress={TEST_ACCOUNT_ADDRESS}
        accountAvatarType={AccountAvatarType.JazzIcon}
        title={TEST_CELL_TITLE}
        onPress={jest.fn}
      />
    );
    const secondaryTextElement = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_SECONDARY_TEXT_TEST_ID,
    );
    expect(secondaryTextElement.exists()).toBe(false);
  });
  it('should render the given tertiaryText', () => {
    const wrapper = shallow(
      <Cell
        accountAddress={TEST_ACCOUNT_ADDRESS}
        accountAvatarType={AccountAvatarType.JazzIcon}
        title={TEST_CELL_TITLE}
        tertiaryText={TEST_CELL_TERTIARY_TEXT}
        onPress={jest.fn}
      />
    );
    const tertiaryTextElement = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_TERTIARY_TEXT_TEST_ID,
    );
    expect(tertiaryTextElement.props().children).toBe(TEST_CELL_TERTIARY_TEXT);
  });
  it('should not render tertiaryText if not given', () => {
    const wrapper = shallow(
      <Cell
        accountAddress={TEST_ACCOUNT_ADDRESS}
        accountAvatarType={AccountAvatarType.JazzIcon}
        title={TEST_CELL_TITLE}
        onPress={jest.fn}
      />
    );
    const tertiaryTextElement = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_TERTIARY_TEXT_TEST_ID,
    );
    expect(tertiaryTextElement.exists()).toBe(false);
  });
  it('should render tag with given label', () => {
    const wrapper = shallow(
      <Cell
        accountAddress={TEST_ACCOUNT_ADDRESS}
        accountAvatarType={AccountAvatarType.JazzIcon}
        title={TEST_CELL_TITLE}
        label={TEST_LABEL_TEXT}
        onPress={jest.fn}
      />
    );
    const tagComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_LABEL_TEST_ID,
    );
    expect(tagComponent.exists()).toBe(true);
  });
  it('should not render tag without given label', () => {
    const wrapper = shallow(
      <Cell
        accountAddress={TEST_ACCOUNT_ADDRESS}
        accountAvatarType={AccountAvatarType.JazzIcon}
        title={TEST_CELL_TITLE}
        onPress={jest.fn}
      />
    );
    const tagComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_LABEL_TEST_ID,
    );
    expect(tagComponent.exists()).toBe(false);
  });
});

