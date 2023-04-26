// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// Internal dependencies.
import TagUrl from './TagUrl';
import { TEST_IMAGE_SOURCE, TEST_LABEL } from './TagUrl.constants';

describe('TagUrl', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <TagUrl imageSource={TEST_IMAGE_SOURCE} label={TEST_LABEL} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
