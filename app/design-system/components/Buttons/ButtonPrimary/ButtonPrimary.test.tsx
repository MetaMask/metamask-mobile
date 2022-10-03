// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import { ButtonBaseSize } from '../ButtonBase';
import { IconName } from '../../Icon';

// Internal dependencies.
import ButtonPrimary from './ButtonPrimary';
import { ButtonPrimaryVariant } from './ButtonPrimary.types';

describe('ButtonPrimary', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <ButtonPrimary
        iconName={IconName.BankFilled}
        size={ButtonBaseSize.Md}
        label={'Click me!'}
        onPress={() => null}
        variant={ButtonPrimaryVariant.Normal}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
