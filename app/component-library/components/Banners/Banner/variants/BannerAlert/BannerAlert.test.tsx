// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// Internal dependencies.
import BannerAlert from './BannerAlert';
import {
  SAMPLE_BANNERALERT_PROPS,
  BANNERALERT_TEST_ID,
} from './BannerAlert.constants';

describe('BannerAlert', () => {
  it('should render BannerAlert', () => {
    const wrapper = render(<BannerAlert {...SAMPLE_BANNERALERT_PROPS} />);
    expect(wrapper).toMatchSnapshot();
    expect(wrapper.queryByTestId(BANNERALERT_TEST_ID)).not.toBe(null);
  });
});
