// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import Text, { TextVariant } from '../Texts/Text';

// Internal dependencies.
import HeaderBase from './HeaderBase';
import {
  DEFAULT_HEADERBASE_TITLE_TEXTVARIANT,
  HEADERBASE_TEST_ID,
  HEADERBASE_TITLE_TEST_ID,
} from './HeaderBase.constants';

describe('HeaderBase', () => {
  it('should render snapshot correctly', () => {
    const wrapper = shallow(<HeaderBase>Sample HeaderBase Title</HeaderBase>);
    expect(wrapper).toMatchSnapshot();
  });
  it('should render HeaderBase', () => {
    const wrapper = shallow(<HeaderBase>Sample HeaderBase Title</HeaderBase>);
    const headerBaseComponent = wrapper.findWhere(
      (node) => node.prop('testID') === HEADERBASE_TEST_ID,
    );
    expect(headerBaseComponent.exists()).toBe(true);
  });
  it('should render Header with the right text variant if typeof children === string', () => {
    const wrapper = shallow(<HeaderBase>Sample HeaderBase Title</HeaderBase>);
    const headerBaseTitleComponent = wrapper.findWhere(
      (node) => node.prop('testID') === HEADERBASE_TITLE_TEST_ID,
    );
    expect(headerBaseTitleComponent.props().variant).toBe(
      DEFAULT_HEADERBASE_TITLE_TEXTVARIANT,
    );
  });
  it('should render Header with the custom node if typeof children !== string', () => {
    const testTextVariant = TextVariant.DisplayMD;
    const wrapper = shallow(
      <HeaderBase>
        <Text variant={testTextVariant} testID={HEADERBASE_TITLE_TEST_ID}>
          Sample HeaderBase Title
        </Text>
      </HeaderBase>,
    );
    const headerBaseTitleComponent = wrapper.findWhere(
      (node) => node.prop('testID') === HEADERBASE_TITLE_TEST_ID,
    );
    expect(headerBaseTitleComponent.props().variant).toBe(testTextVariant);
  });
});
