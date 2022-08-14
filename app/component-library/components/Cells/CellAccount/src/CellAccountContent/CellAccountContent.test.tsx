// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import { AvatarAccountType } from '../../../../Avatars/AvatarAccount';
import {
  TEST_ACCOUNT_ADDRESS,
  TEST_CELL_ACCOUNT_TITLE,
  TEST_CELL_ACCOUNT_SECONDARY_TEXT,
  TEST_CELL_ACCOUNT_TERTIARY_TEXT,
  TEST_TAG_LABEL_TEXT,
} from '../../CellAccount.constants';

// Internal dependencies.
import CellAccountContent from './CellAccountContent';
import {
  CELL_ACCOUNT_AVATAR_TEST_ID,
  CELL_ACCOUNT_TITLE_TEST_ID,
  CELL_ACCOUNT_SECONDARY_TEXT_TEST_ID,
  CELL_ACCOUNT_TERTIARY_TEXT_TEST_ID,
  CELL_ACCOUNT_TAG_LABEL_TEST_ID,
} from './CellAccountContent.constants';

describe('CellAccountContent - Snapshot', () => {
  it('should render default settings correctly', () => {
    const wrapper = shallow(
      <CellAccountContent
        avatarAccountAddress={TEST_ACCOUNT_ADDRESS}
        avatarAccountType={AvatarAccountType.JazzIcon}
        title={TEST_CELL_ACCOUNT_TITLE}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render secondaryText when given', () => {
    const wrapper = shallow(
      <CellAccountContent
        avatarAccountAddress={TEST_ACCOUNT_ADDRESS}
        avatarAccountType={AvatarAccountType.JazzIcon}
        title={TEST_CELL_ACCOUNT_TITLE}
        secondaryText={TEST_CELL_ACCOUNT_SECONDARY_TEXT}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render tertiaryText when given', () => {
    const wrapper = shallow(
      <CellAccountContent
        avatarAccountAddress={TEST_ACCOUNT_ADDRESS}
        avatarAccountType={AvatarAccountType.JazzIcon}
        title={TEST_CELL_ACCOUNT_TITLE}
        tertiaryText={TEST_CELL_ACCOUNT_TERTIARY_TEXT}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render label when given', () => {
    const wrapper = shallow(
      <CellAccountContent
        avatarAccountAddress={TEST_ACCOUNT_ADDRESS}
        avatarAccountType={AvatarAccountType.JazzIcon}
        title={TEST_CELL_ACCOUNT_TITLE}
        tagLabel={TEST_TAG_LABEL_TEXT}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('CellAccountContent', () => {
  it('should render Avatar', () => {
    const wrapper = shallow(
      <CellAccountContent
        avatarAccountAddress={TEST_ACCOUNT_ADDRESS}
        avatarAccountType={AvatarAccountType.JazzIcon}
        title={TEST_CELL_ACCOUNT_TITLE}
      />,
    );
    const avatarComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_ACCOUNT_AVATAR_TEST_ID,
    );
    expect(avatarComponent.exists()).toBe(true);
  });
  it('should render the given title', () => {
    const wrapper = shallow(
      <CellAccountContent
        avatarAccountAddress={TEST_ACCOUNT_ADDRESS}
        avatarAccountType={AvatarAccountType.JazzIcon}
        title={TEST_CELL_ACCOUNT_TITLE}
      />,
    );
    const titleElement = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_ACCOUNT_TITLE_TEST_ID,
    );
    expect(titleElement.props().children).toBe(TEST_CELL_ACCOUNT_TITLE);
  });
  it('should render the given secondaryText', () => {
    const wrapper = shallow(
      <CellAccountContent
        avatarAccountAddress={TEST_ACCOUNT_ADDRESS}
        avatarAccountType={AvatarAccountType.JazzIcon}
        title={TEST_CELL_ACCOUNT_TITLE}
        secondaryText={TEST_CELL_ACCOUNT_SECONDARY_TEXT}
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
      <CellAccountContent
        avatarAccountAddress={TEST_ACCOUNT_ADDRESS}
        avatarAccountType={AvatarAccountType.JazzIcon}
        title={TEST_CELL_ACCOUNT_TITLE}
      />,
    );
    const secondaryTextElement = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_ACCOUNT_SECONDARY_TEXT_TEST_ID,
    );
    expect(secondaryTextElement.exists()).toBe(false);
  });
  it('should render the given tertiaryText', () => {
    const wrapper = shallow(
      <CellAccountContent
        avatarAccountAddress={TEST_ACCOUNT_ADDRESS}
        avatarAccountType={AvatarAccountType.JazzIcon}
        title={TEST_CELL_ACCOUNT_TITLE}
        tertiaryText={TEST_CELL_ACCOUNT_TERTIARY_TEXT}
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
      <CellAccountContent
        avatarAccountAddress={TEST_ACCOUNT_ADDRESS}
        avatarAccountType={AvatarAccountType.JazzIcon}
        title={TEST_CELL_ACCOUNT_TITLE}
      />,
    );
    const tertiaryTextElement = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_ACCOUNT_TERTIARY_TEXT_TEST_ID,
    );
    expect(tertiaryTextElement.exists()).toBe(false);
  });
  it('should render tag with given label', () => {
    const wrapper = shallow(
      <CellAccountContent
        avatarAccountAddress={TEST_ACCOUNT_ADDRESS}
        avatarAccountType={AvatarAccountType.JazzIcon}
        title={TEST_CELL_ACCOUNT_TITLE}
        tagLabel={TEST_TAG_LABEL_TEXT}
      />,
    );
    const tagComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_ACCOUNT_TAG_LABEL_TEST_ID,
    );
    expect(tagComponent.exists()).toBe(true);
  });
  it('should not render tag without given label', () => {
    const wrapper = shallow(
      <CellAccountContent
        avatarAccountAddress={TEST_ACCOUNT_ADDRESS}
        avatarAccountType={AvatarAccountType.JazzIcon}
        title={TEST_CELL_ACCOUNT_TITLE}
      />,
    );
    const tagComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELL_ACCOUNT_TAG_LABEL_TEST_ID,
    );
    expect(tagComponent.exists()).toBe(false);
  });
});
