// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// Internal dependencies.
import BannerAlert from './BannerAlert';
import {
  SAMPLE_BANNERALERT_PROPS,
  BANNERALERT_TEST_ID,
} from './BannerAlert.constants';

describe('BannerAlert', () => {
  it('should render default settings correctly', () => {
    const wrapper = shallow(<BannerAlert {...SAMPLE_BANNERALERT_PROPS} />);
    expect(wrapper).toMatchSnapshot();
  });
  it('should render BannerAlert', () => {
    const wrapper = shallow(<BannerAlert {...SAMPLE_BANNERALERT_PROPS} />);

    const bannerAlertComponent = wrapper.findWhere(
      (node) => node.prop('testID') === BANNERALERT_TEST_ID,
    );
    expect(bannerAlertComponent.exists()).toBe(true);
  });
});
