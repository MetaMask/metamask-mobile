// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// Internal dependencies.
import BannerTip from './BannerTip';
import {
  SAMPLE_BANNERTIP_PROPS,
  BANNERTIP_TEST_ID,
} from './BannerTip.constants';

describe('BannerTip', () => {
  it('should render default settings correctly', () => {
    const wrapper = shallow(<BannerTip {...SAMPLE_BANNERTIP_PROPS} />);
    expect(wrapper).toMatchSnapshot();
  });
  it('should render BannerTip', () => {
    const wrapper = shallow(<BannerTip {...SAMPLE_BANNERTIP_PROPS} />);

    const bannerAlertComponent = wrapper.findWhere(
      (node) => node.prop('testID') === BANNERTIP_TEST_ID,
    );
    expect(bannerAlertComponent.exists()).toBe(true);
  });
});
