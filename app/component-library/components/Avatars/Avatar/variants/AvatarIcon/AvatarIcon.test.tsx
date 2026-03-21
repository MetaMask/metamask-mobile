// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// External dependencies.
import AvatarIcon from './AvatarIcon';

// Internal dependencies.
import { SAMPLE_AVATARICON_PROPS } from './AvatarIcon.constants';

describe('AvatarIcon', () => {
  it('should render correctly', () => {
    const { toJSON } = render(<AvatarIcon {...SAMPLE_AVATARICON_PROPS} />);
    expect(toJSON()).toMatchSnapshot();
  });
});
