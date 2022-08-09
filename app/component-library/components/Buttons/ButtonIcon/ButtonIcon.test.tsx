// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import { IconName } from '../../Icon';

// Internal dependencies.
import ButtonIcon from './ButtonIcon';
import { ButtonIconVariant } from './ButtonIcon.types';

describe('ButtonIcon', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <ButtonIcon
        variant={ButtonIconVariant.Primary}
        iconName={IconName.AddSquareFilled}
        onPress={jest.fn}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
