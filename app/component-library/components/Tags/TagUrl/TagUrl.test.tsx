// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// Internal dependencies.
import TagUrl from './TagUrl';
import { TEST_IMAGE_SOURCE, TEST_LABEL } from './TagUrl.constants';

describe('TagUrl', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <TagUrl imageSource={TEST_IMAGE_SOURCE} label={TEST_LABEL} />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
