// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// Internal dependencies.
import TagUrl from './TagUrl';
import { SAMPLE_TAGURL_PROPS } from './TagUrl.constants';

describe('TagUrl', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <TagUrl
        imageSource={SAMPLE_TAGURL_PROPS.imageSource}
        label={SAMPLE_TAGURL_PROPS.label}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
