import React from 'react';
import { render } from '@testing-library/react-native';
import AccountBackupStep1B from './';

describe('AccountBackupStep1B', () => {
  it('should render correctly', () => {
    const wrapper = render(<AccountBackupStep1B />);
    expect(wrapper).toMatchSnapshot();
  });
});
