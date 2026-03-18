// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// Internal dependencies.
import TagUrl from './TagUrl';
import { SAMPLE_TAGURL_PROPS } from './TagUrl.constants';

describe('TagUrl', () => {
  it('should render correctly', () => {
    const component = render(
      <TagUrl
        imageSource={SAMPLE_TAGURL_PROPS.imageSource}
        label={SAMPLE_TAGURL_PROPS.label}
      />,
    );
    expect(component).toMatchSnapshot();
  });
});
