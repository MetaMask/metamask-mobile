import React from 'react';
import { render } from '@testing-library/react-native';
import Root from './Root';

describe('Root Component', () => {
  it('renders correctly', () => {
    const { getByText } = render(<Root />);
    expect(
      getByText(
        'This is the Root component. It will be used to render different views based on the selected state.',
      ),
    ).toBeTruthy();
  });
});
