import React from 'react';
import { shallow } from 'enzyme';

import { ButtonSize } from '../../Button.types';
import { IconName } from '../../../../Icon';

import ButtonTertiary from './ButtonTertiary';

describe('ButtonTertiary', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <ButtonTertiary
        iconName={IconName.BankFilled}
        size={ButtonSize.Md}
        label={'Click me!'}
        onPress={() => null}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
