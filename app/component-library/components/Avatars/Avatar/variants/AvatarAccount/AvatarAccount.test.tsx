// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// Internal dependencies.
import AvatarAccount from './AvatarAccount';
import { SAMPLE_AVATARACCOUNT_PROPS } from './AvatarAccount.constants';

describe('AvatarAccount', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <AvatarAccount {...SAMPLE_AVATARACCOUNT_PROPS} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
