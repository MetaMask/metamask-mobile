import React from 'react';
import { render } from '@testing-library/react-native';
import ImportPrivateKeySuccess from './';

describe('ImportPrivateKeySuccess', () => {
  it('should render correctly', () => {
    const wrapper = render(<ImportPrivateKeySuccess route={{ params: {} }} />);
    expect(wrapper).toMatchSnapshot();
  });
});
