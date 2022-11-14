// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// Internal dependencies.
import Token from './Token';
import { TokenSizes } from './Token.types';
import {
  TOKEN_TEST_ID,
  TOKEN_HALO_TEST_ID,
  TOKEN_IMAGE_TEST_ID,
  TEST_TOKEN_IMAGE_PROPS,
} from './Token.constants';

describe('Token - Snapshot', () => {
  it('should render Token correctly with halo on default', () => {
    const wrapper = shallow(
      <Token size={TokenSizes.Xl} imageProps={TEST_TOKEN_IMAGE_PROPS} />,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render Token without if isHaloEnabled=false', () => {
    const wrapper = shallow(
      <Token
        size={TokenSizes.Xl}
        imageProps={TEST_TOKEN_IMAGE_PROPS}
        isHaloEnabled={false}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('Token', () => {
  it('should render Token component with halo enabled on default', () => {
    const wrapper = shallow(
      <Token size={TokenSizes.Xl} imageProps={TEST_TOKEN_IMAGE_PROPS} />,
    );
    const tokenComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TOKEN_TEST_ID,
    );
    const tokenHaloComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TOKEN_HALO_TEST_ID,
    );
    const tokenImageComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TOKEN_IMAGE_TEST_ID,
    );
    expect(tokenComponent.exists()).toBe(true);
    expect(tokenHaloComponent.exists()).toBe(true);
    expect(tokenImageComponent.exists()).toBe(true);
  });
  it('should render Token component without halo if isHaloEnabled=false', () => {
    const wrapper = shallow(
      <Token
        size={TokenSizes.Xl}
        imageProps={TEST_TOKEN_IMAGE_PROPS}
        isHaloEnabled={false}
      />,
    );
    const tokenHaloComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TOKEN_HALO_TEST_ID,
    );
    expect(tokenHaloComponent.exists()).toBe(false);
  });
});
