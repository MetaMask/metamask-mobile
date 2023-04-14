// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import Text, { TextVariant } from '../Texts/Text';

// Internal dependencies.
import Header from './Header';
import {
  DEFAULT_HEADER_TITLE_TEXTVARIANT,
  HEADER_TEST_ID,
  HEADER_TITLE_TEST_ID,
} from './Header.constants';

describe('Header', () => {
  it('should render snapshot correctly', () => {
    const wrapper = shallow(<Header>Sample Header Title</Header>);
    expect(wrapper).toMatchSnapshot();
  });
  it('should render Header', () => {
    const wrapper = shallow(<Header>Sample Header Title</Header>);
    const headerComponent = wrapper.findWhere(
      (node) => node.prop('testID') === HEADER_TEST_ID,
    );
    expect(headerComponent.exists()).toBe(true);
  });
  it('should render Header with the right text variant if typeof children === string', () => {
    const wrapper = shallow(<Header>Sample Header Title</Header>);
    const headerTitleComponent = wrapper.findWhere(
      (node) => node.prop('testID') === HEADER_TITLE_TEST_ID,
    );
    expect(headerTitleComponent.props().variant).toBe(
      DEFAULT_HEADER_TITLE_TEXTVARIANT,
    );
  });
  it('should render Header with the custom node if typeof children !== string', () => {
    const testTextVariant = TextVariant.DisplayMD;
    const wrapper = shallow(
      <Header>
        <Text variant={testTextVariant} testID={HEADER_TITLE_TEST_ID}>
          Sample Header Title
        </Text>
      </Header>,
    );
    const headerTitleComponent = wrapper.findWhere(
      (node) => node.prop('testID') === HEADER_TITLE_TEST_ID,
    );
    expect(headerTitleComponent.props().variant).toBe(testTextVariant);
  });
});
