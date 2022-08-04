// 3rd party dependencies
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies
import { AccountAvatarType } from '../AccountAvatar';

// Internal dependencies
import CellAccount from './CellAccount';
import {
  TEST_ACCOUNT_ADDRESS,
  TEST_CELL_ACCOUNT_TITLE,
  TEST_CELL_ACCOUNT_SECONDARY_TEXT,
  TEST_CELL_ACCOUNT_TERTIARY_TEXT,
  TEST_TAG_LABEL_TEXT,
  CELL_ACCOUNT_SINGLE_SELECT_TEST_ID,
  CELL_ACCOUNT_MULTI_SELECT_TEST_ID,
  CELL_ACCOUNT_AVATAR_TEST_ID,
  CELL_ACCOUNT_TITLE_TEST_ID,
  CELL_ACCOUNT_SECONDARY_TEXT_TEST_ID,
  CELL_ACCOUNT_TERTIARY_TEXT_TEST_ID,
  CELL_ACCOUNT_TAG_LABEL_TEST_ID,
} from './CellAccount.constants';

describe('CellAccount - Snapshot', () => {
  it('should render default settings correctly', () => {
    const wrapper = shallow(
      <CellAccount
        accountAddress={TEST_ACCOUNT_ADDRESS}
        accountAvatarType={AccountAvatarType.JazzIcon}
        title={TEST_CELL_ACCOUNT_TITLE}
        onPress={jest.fn}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render secondaryText when given', () => {
    const wrapper = shallow(
      <CellAccount
        accountAddress={TEST_ACCOUNT_ADDRESS}
        accountAvatarType={AccountAvatarType.JazzIcon}
        title={TEST_CELL_ACCOUNT_TITLE}
        secondaryText={TEST_CELL_ACCOUNT_SECONDARY_TEXT}
        onPress={jest.fn}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render tertiaryText when given', () => {
    const wrapper = shallow(
      <CellAccount
        accountAddress={TEST_ACCOUNT_ADDRESS}
        accountAvatarType={AccountAvatarType.JazzIcon}
        title={TEST_CELL_ACCOUNT_TITLE}
        tertiaryText={TEST_CELL_ACCOUNT_TERTIARY_TEXT}
        onPress={jest.fn}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render label when given', () => {
    const wrapper = shallow(
      <CellAccount
        accountAddress={TEST_ACCOUNT_ADDRESS}
        accountAvatarType={AccountAvatarType.JazzIcon}
        title={TEST_CELL_ACCOUNT_TITLE}
        tagLabel={TEST_TAG_LABEL_TEXT}
        onPress={jest.fn}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render the proper selected state', () => {
    const wrapper = shallow(
      <CellAccount
        accountAddress={TEST_ACCOUNT_ADDRESS}
        accountAvatarType={AccountAvatarType.JazzIcon}
        title={TEST_CELL_ACCOUNT_TITLE}
        isSelected
        onPress={jest.fn}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render the proper multiselect when isMultiSelect is true', () => {
    const wrapper = shallow(
      <CellAccount
        accountAddress={TEST_ACCOUNT_ADDRESS}
        accountAvatarType={AccountAvatarType.JazzIcon}
        title={TEST_CELL_ACCOUNT_TITLE}
        isMultiSelect
        onPress={jest.fn}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('CellAccount', () => {
  it('should render singleSelect if isMultiSelect is false', () => {
    const wrapper = shallow(
      <CellAccount
        accountAddress={TEST_ACCOUNT_ADDRESS}
        accountAvatarType={AccountAvatarType.JazzIcon}
        title={TEST_CELL_ACCOUNT_TITLE}
        onPress={jest.fn}
        isMultiSelect={false}
      />,
    );
    const singleSelectComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_ACCOUNT_SINGLE_SELECT_TEST_ID,
    );
    expect(singleSelectComponent.exists()).toBe(true);

    const multiSelectComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_ACCOUNT_MULTI_SELECT_TEST_ID,
    );
    expect(multiSelectComponent.exists()).toBe(false);
  });
  it('should render multiSelect if isMultiSelect is true', () => {
    const wrapper = shallow(
      <CellAccount
        accountAddress={TEST_ACCOUNT_ADDRESS}
        accountAvatarType={AccountAvatarType.JazzIcon}
        title={TEST_CELL_ACCOUNT_TITLE}
        isMultiSelect
        onPress={jest.fn}
      />,
    );
    const singleSelectComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_ACCOUNT_SINGLE_SELECT_TEST_ID,
    );
    expect(singleSelectComponent.exists()).toBe(false);

    const multiSelectComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_ACCOUNT_MULTI_SELECT_TEST_ID,
    );
    expect(multiSelectComponent.exists()).toBe(true);
  });
  it('should render Avatar', () => {
    const wrapper = shallow(
      <CellAccount
        accountAddress={TEST_ACCOUNT_ADDRESS}
        accountAvatarType={AccountAvatarType.JazzIcon}
        title={TEST_CELL_ACCOUNT_TITLE}
        onPress={jest.fn}
      />,
    );
    const avatarComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_ACCOUNT_AVATAR_TEST_ID,
    );
    expect(avatarComponent.exists()).toBe(true);
  });
  it('should render the given title', () => {
    const wrapper = shallow(
      <CellAccount
        accountAddress={TEST_ACCOUNT_ADDRESS}
        accountAvatarType={AccountAvatarType.JazzIcon}
        title={TEST_CELL_ACCOUNT_TITLE}
        onPress={jest.fn}
      />,
    );
    const titleElement = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_ACCOUNT_TITLE_TEST_ID,
    );
    expect(titleElement.props().children).toBe(TEST_CELL_ACCOUNT_TITLE);
  });
  it('should render the given secondaryText', () => {
    const wrapper = shallow(
      <CellAccount
        accountAddress={TEST_ACCOUNT_ADDRESS}
        accountAvatarType={AccountAvatarType.JazzIcon}
        title={TEST_CELL_ACCOUNT_TITLE}
        secondaryText={TEST_CELL_ACCOUNT_SECONDARY_TEXT}
        onPress={jest.fn}
      />,
    );
    const secondaryTextElement = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_ACCOUNT_SECONDARY_TEXT_TEST_ID,
    );
    expect(secondaryTextElement.props().children).toBe(
      TEST_CELL_ACCOUNT_SECONDARY_TEXT,
    );
  });
  it('should not render secondaryText if not given', () => {
    const wrapper = shallow(
      <CellAccount
        accountAddress={TEST_ACCOUNT_ADDRESS}
        accountAvatarType={AccountAvatarType.JazzIcon}
        title={TEST_CELL_ACCOUNT_TITLE}
        onPress={jest.fn}
      />,
    );
    const secondaryTextElement = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_ACCOUNT_SECONDARY_TEXT_TEST_ID,
    );
    expect(secondaryTextElement.exists()).toBe(false);
  });
  it('should render the given tertiaryText', () => {
    const wrapper = shallow(
      <CellAccount
        accountAddress={TEST_ACCOUNT_ADDRESS}
        accountAvatarType={AccountAvatarType.JazzIcon}
        title={TEST_CELL_ACCOUNT_TITLE}
        tertiaryText={TEST_CELL_ACCOUNT_TERTIARY_TEXT}
        onPress={jest.fn}
      />,
    );
    const tertiaryTextElement = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_ACCOUNT_TERTIARY_TEXT_TEST_ID,
    );
    expect(tertiaryTextElement.props().children).toBe(
      TEST_CELL_ACCOUNT_TERTIARY_TEXT,
    );
  });
  it('should not render tertiaryText if not given', () => {
    const wrapper = shallow(
      <CellAccount
        accountAddress={TEST_ACCOUNT_ADDRESS}
        accountAvatarType={AccountAvatarType.JazzIcon}
        title={TEST_CELL_ACCOUNT_TITLE}
        onPress={jest.fn}
      />,
    );
    const tertiaryTextElement = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_ACCOUNT_TERTIARY_TEXT_TEST_ID,
    );
    expect(tertiaryTextElement.exists()).toBe(false);
  });
  it('should render tag with given label', () => {
    const wrapper = shallow(
      <CellAccount
        accountAddress={TEST_ACCOUNT_ADDRESS}
        accountAvatarType={AccountAvatarType.JazzIcon}
        title={TEST_CELL_ACCOUNT_TITLE}
        tagLabel={TEST_TAG_LABEL_TEXT}
        onPress={jest.fn}
      />,
    );
    const tagComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_ACCOUNT_TAG_LABEL_TEST_ID,
    );
    expect(tagComponent.exists()).toBe(true);
  });
  it('should not render tag without given label', () => {
    const wrapper = shallow(
      <CellAccount
        accountAddress={TEST_ACCOUNT_ADDRESS}
        accountAvatarType={AccountAvatarType.JazzIcon}
        title={TEST_CELL_ACCOUNT_TITLE}
        onPress={jest.fn}
      />,
    );
    const tagComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_ACCOUNT_TAG_LABEL_TEST_ID,
    );
    expect(tagComponent.exists()).toBe(false);
  });
});
