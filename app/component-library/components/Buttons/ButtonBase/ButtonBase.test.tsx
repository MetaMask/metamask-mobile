import React from 'react';
import { shallow } from 'enzyme';

import { IconName } from '../../Icon';

import ButtonBase from './ButtonBase';
import { ButtonBaseSize } from './ButtonBase.types';

describe('ButtonBase', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <ButtonBase
        icon={IconName.BankFilled}
        size={ButtonBaseSize.Md}
        label={'Click me!'}
        onPress={() => null}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
