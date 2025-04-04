// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// External dependencies.
import { ButtonSize } from '../../Button.types';
import { IconName } from '../../../../Icons/Icon';

// Internal dependencies.
import ButtonSecondary from './ButtonSecondary';

describe('ButtonSecondary', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <ButtonSecondary
        startIconName={IconName.Bank}
        size={ButtonSize.Md}
        label={'Click me!'}
        onPress={() => null}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
