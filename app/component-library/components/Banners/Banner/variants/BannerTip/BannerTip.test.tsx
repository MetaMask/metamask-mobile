// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// Internal dependencies.
import BannerTip from './BannerTip';
import {
  SAMPLE_BANNERTIP_PROPS,
  BANNERTIP_TEST_ID,
} from './BannerTip.constants';

describe('BannerTip', () => {
  it('should render default settings correctly', () => {
    const wrapper = render(<BannerTip {...SAMPLE_BANNERTIP_PROPS} />);
    expect(wrapper).toMatchSnapshot();
    expect(wrapper.queryByTestId(BANNERTIP_TEST_ID)).not.toBe(null);
  });
});
