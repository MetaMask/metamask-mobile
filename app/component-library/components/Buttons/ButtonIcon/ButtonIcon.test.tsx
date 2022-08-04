import React from 'react';
import { shallow } from 'enzyme';

import { IconName } from '../../Icon';

import ButtonIcon from './ButtonIcon';
import { ButtonIconVariant } from './ButtonIcon.types';

describe('ButtonIcon', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <ButtonIcon
        variant={ButtonIconVariant.Primary}
        icon={IconName.AddSquareFilled}
        onPress={jest.fn}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
