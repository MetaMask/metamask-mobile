// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// External dependencies.
import { IconName } from '../../Icons/Icon';

// Internal dependencies.
import ButtonIcon from './ButtonIcon';
import { ButtonIconVariants } from './ButtonIcon.types';

describe('ButtonIcon', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <ButtonIcon
        variant={ButtonIconVariants.Primary}
        iconName={IconName.AddSquare}
        onPress={jest.fn}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
