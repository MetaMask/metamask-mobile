// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// Internal dependencies.
import Favicon from './Favicon';
import { FaviconSizes } from './Favicon.types';
import { TEST_REMOTE_IMAGE_PROPS } from './Favicon.constants';

describe('Favicon', () => {
  it('should match the snapshot', () => {
    const wrapper = shallow(
      <Favicon size={FaviconSizes.Xl} imageProps={TEST_REMOTE_IMAGE_PROPS} />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
