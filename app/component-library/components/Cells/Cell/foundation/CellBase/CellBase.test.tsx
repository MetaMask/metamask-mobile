// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// Internal dependencies.
import CellBase from './CellBase';
import {
  SAMPLE_CELLBASE_AVATARPROPS,
  SAMPLE_CELLBASE_TITLE,
  SAMPLE_CELLBASE_SECONDARYTEXT,
  SAMPLE_CELLBASE_TERTIARY_TEXT,
  SAMPLE_CELLBASE_TAGLABEL,
  CELLBASE_AVATAR_TEST_ID,
  CELLBASE_TITLE_TEST_ID,
  CELLBASE_SECONDARY_TEXT_TEST_ID,
  CELLBASE_TERTIARY_TEXT_TEST_ID,
  CELLBASE_TAG_LABEL_TEST_ID,
} from './CellBase.constants';

describe('CellBase - Snapshot', () => {
  it('should render default settings correctly', () => {
    const wrapper = shallow(
      <CellBase
        avatarProps={SAMPLE_CELLBASE_AVATARPROPS}
        title={SAMPLE_CELLBASE_TITLE}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render secondaryText when given', () => {
    const wrapper = shallow(
      <CellBase
        avatarProps={SAMPLE_CELLBASE_AVATARPROPS}
        title={SAMPLE_CELLBASE_TITLE}
        secondaryText={SAMPLE_CELLBASE_SECONDARYTEXT}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render tertiaryText when given', () => {
    const wrapper = shallow(
      <CellBase
        avatarProps={SAMPLE_CELLBASE_AVATARPROPS}
        title={SAMPLE_CELLBASE_TITLE}
        tertiaryText={SAMPLE_CELLBASE_TERTIARY_TEXT}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render label when given', () => {
    const wrapper = shallow(
      <CellBase
        avatarProps={SAMPLE_CELLBASE_AVATARPROPS}
        title={SAMPLE_CELLBASE_TITLE}
        tagLabel={SAMPLE_CELLBASE_TAGLABEL}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('CellBase', () => {
  it('should render Avatar', () => {
    const wrapper = shallow(
      <CellBase
        avatarProps={SAMPLE_CELLBASE_AVATARPROPS}
        title={SAMPLE_CELLBASE_TITLE}
      />,
    );
    const avatarComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELLBASE_AVATAR_TEST_ID,
    );
    expect(avatarComponent.exists()).toBe(true);
  });
  it('should render the given title', () => {
    const wrapper = shallow(
      <CellBase
        avatarProps={SAMPLE_CELLBASE_AVATARPROPS}
        title={SAMPLE_CELLBASE_TITLE}
      />,
    );
    const titleElement = wrapper.findWhere(
      (node) => node.prop('testID') === CELLBASE_TITLE_TEST_ID,
    );
    expect(titleElement.props().children).toBe(SAMPLE_CELLBASE_TITLE);
  });
  it('should render the given secondaryText', () => {
    const wrapper = shallow(
      <CellBase
        avatarProps={SAMPLE_CELLBASE_AVATARPROPS}
        title={SAMPLE_CELLBASE_TITLE}
        secondaryText={SAMPLE_CELLBASE_SECONDARYTEXT}
      />,
    );
    const secondaryTextElement = wrapper.findWhere(
      (node) => node.prop('testID') === CELLBASE_SECONDARY_TEXT_TEST_ID,
    );
    expect(secondaryTextElement.props().children).toBe(
      SAMPLE_CELLBASE_SECONDARYTEXT,
    );
  });
  it('should not render secondaryText if not given', () => {
    const wrapper = shallow(
      <CellBase
        avatarProps={SAMPLE_CELLBASE_AVATARPROPS}
        title={SAMPLE_CELLBASE_TITLE}
      />,
    );
    const secondaryTextElement = wrapper.findWhere(
      (node) => node.prop('testID') === CELLBASE_SECONDARY_TEXT_TEST_ID,
    );
    expect(secondaryTextElement.exists()).toBe(false);
  });
  it('should render the given tertiaryText', () => {
    const wrapper = shallow(
      <CellBase
        avatarProps={SAMPLE_CELLBASE_AVATARPROPS}
        title={SAMPLE_CELLBASE_TITLE}
        tertiaryText={SAMPLE_CELLBASE_TERTIARY_TEXT}
      />,
    );
    const tertiaryTextElement = wrapper.findWhere(
      (node) => node.prop('testID') === CELLBASE_TERTIARY_TEXT_TEST_ID,
    );
    expect(tertiaryTextElement.props().children).toBe(
      SAMPLE_CELLBASE_TERTIARY_TEXT,
    );
  });
  it('should not render tertiaryText if not given', () => {
    const wrapper = shallow(
      <CellBase
        avatarProps={SAMPLE_CELLBASE_AVATARPROPS}
        title={SAMPLE_CELLBASE_TITLE}
      />,
    );
    const tertiaryTextElement = wrapper.findWhere(
      (node) => node.prop('testID') === CELLBASE_TERTIARY_TEXT_TEST_ID,
    );
    expect(tertiaryTextElement.exists()).toBe(false);
  });
  it('should render tag with given label', () => {
    const wrapper = shallow(
      <CellBase
        avatarProps={SAMPLE_CELLBASE_AVATARPROPS}
        title={SAMPLE_CELLBASE_TITLE}
        tagLabel={SAMPLE_CELLBASE_TAGLABEL}
      />,
    );
    const tagComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELLBASE_TAG_LABEL_TEST_ID,
    );
    expect(tagComponent.exists()).toBe(true);
  });
  it('should not render tag without given label', () => {
    const wrapper = shallow(
      <CellBase
        avatarProps={SAMPLE_CELLBASE_AVATARPROPS}
        title={SAMPLE_CELLBASE_TITLE}
      />,
    );
    const tagComponent = wrapper.findWhere(
      (node) => node.prop('testID') === CELLBASE_TAG_LABEL_TEST_ID,
    );
    expect(tagComponent.exists()).toBe(false);
  });
});
