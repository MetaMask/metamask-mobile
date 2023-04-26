// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// External dependencies.
import AvatarIcon from './AvatarIcon';

// Internal dependencies.
import { AvatarSize } from '../../Avatar.types';
import { IconName } from '../../../../Icons/Icon';

describe('AvatarIcon', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <AvatarIcon size={AvatarSize.Lg} name={IconName.AddSquare} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
