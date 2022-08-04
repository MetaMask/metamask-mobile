import React from 'react';
import { shallow } from 'enzyme';

import { ButtonBaseSize } from '../ButtonBase';
import { IconName } from '../../Icon';

import ButtonPrimary from './ButtonPrimary';
import { ButtonPrimaryVariant } from './ButtonPrimary.types';

describe('ButtonPrimary', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <ButtonPrimary
        icon={IconName.BankFilled}
        size={ButtonBaseSize.Md}
        label={'Click me!'}
        onPress={() => null}
        variant={ButtonPrimaryVariant.Normal}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
