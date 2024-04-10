// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// External dependencies.
import { ButtonSize } from '../../Button.types';
import { IconName } from '../../../../Icons/Icon';

// Internal dependencies.
import ButtonPrimary from './ButtonPrimary';

describe('ButtonPrimary', () => {
  it('render matches latest snapshot', () => {
    const { toJSON } = render(
      <ButtonPrimary
        startIconName={IconName.Bank}
        size={ButtonSize.Md}
        label={'Click me!'}
        onPress={() => null}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
