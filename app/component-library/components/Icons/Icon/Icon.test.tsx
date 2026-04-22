// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// Internal dependencies
import Icon from './Icon';
import { IconName } from './Icon.types';

describe('Icon', () => {
  it('renders correctly', () => {
    const wrapper = render(<Icon name={IconName.Add} />);

    expect(wrapper).toMatchSnapshot();
  });
  it('check icon property name', () => {
    const { getByTestId } = render(
      <Icon name={IconName.Add} testID={'test-icon'} />,
    );

    expect(getByTestId('test-icon').props.name).toBe(IconName.Add);
  });
});
