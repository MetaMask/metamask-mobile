import React from 'react';
import { render } from '@testing-library/react-native';
import { LastUsedTag } from './last-used-tag';

describe('LastUsedTag', () => {
  it('renders the "Last used" label', () => {
    const { getByText } = render(<LastUsedTag />);

    expect(getByText('Last used')).toBeOnTheScreen();
  });
});
