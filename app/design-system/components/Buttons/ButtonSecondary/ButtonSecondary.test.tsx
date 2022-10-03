// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import { ButtonBaseSize } from '../ButtonBase';
import { IconName } from '../../Icon';

// Internal dependencies.
import ButtonSecondary from './ButtonSecondary';
import { ButtonSecondaryVariant } from './ButtonSecondary.types';

describe('ButtonSecondary', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <ButtonSecondary
        iconName={IconName.BankFilled}
        size={ButtonBaseSize.Md}
        label={'Click me!'}
        onPress={() => null}
        variant={ButtonSecondaryVariant.Normal}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
