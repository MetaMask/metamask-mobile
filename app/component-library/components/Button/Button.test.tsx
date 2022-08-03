import React from 'react';
import { shallow } from 'enzyme';
import { IconName } from '../Icon';
import Button from './Button';
import { ButtonSize } from './Button.types';

describe('Button', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Button
        icon={IconName.BankFilled}
        size={ButtonSize.Md}
        label={'Click me!'}
        onPress={() => null}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
