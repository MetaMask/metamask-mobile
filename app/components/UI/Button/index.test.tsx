import React from 'react';
import { render } from '@testing-library/react-native';
import Button from './';

describe('Button', () => {
  it('should render correctly', () => {
    // @ts-expect-error Button component is rendered without required props for testing purposes
    const { toJSON } = render(<Button />);
    expect(toJSON()).toMatchSnapshot();
  });
});
