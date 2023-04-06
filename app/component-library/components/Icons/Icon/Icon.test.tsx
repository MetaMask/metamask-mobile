// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';
import Icon from './Icon';
import { IconName } from './Icon.types';
import { shallow } from 'enzyme';

describe('Icon', () => {
  it('renders correctly', () => {
    const wrapper = shallow(<Icon name={IconName.Add} />);

    expect(wrapper).toMatchSnapshot();
  });
  it('check icon property name', () => {
    const { getByTestId } = render(
      <Icon name={IconName.Add} testID={'test-icon'} />,
    );

    expect(getByTestId('test-icon').props.name).toBe(IconName.Add);
  });
});
