// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// Internal dependencies.
import Favicon from './Favicon';
import { FaviconSizes } from './Favicon.types';
import {
  FAVICON_TEST_ID,
  FAVICON_IMAGE_TEST_ID,
  TEST_FAVICON_IMAGE_PROPS,
} from './Favicon.constants';

describe('Favicon - Snapshot', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Favicon size={FaviconSizes.Xl} imageProps={TEST_FAVICON_IMAGE_PROPS} />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('Favicon', () => {
  it('should render Favicon component', () => {
    const wrapper = shallow(
      <Favicon size={FaviconSizes.Xl} imageProps={TEST_FAVICON_IMAGE_PROPS} />,
    );
    const faviconComponent = wrapper.findWhere(
      (node) => node.prop('testID') === FAVICON_TEST_ID,
    );
    const faviconImageComponent = wrapper.findWhere(
      (node) => node.prop('testID') === FAVICON_IMAGE_TEST_ID,
    );
    expect(faviconComponent.exists()).toBe(true);
    expect(faviconImageComponent.exists()).toBe(true);
  });
});
