import React from 'react';
import { render } from '@testing-library/react-native';
import { AlertMessage } from './alert-message';

const MESSAGE_MOCK = 'Test message';

describe('AlertMessage', () => {
  it('renders message', () => {
    const { getByText } = render(<AlertMessage alertMessage={MESSAGE_MOCK} />);
    expect(getByText(MESSAGE_MOCK)).toBeDefined();
  });

  it('renders nothing if no message is provided', () => {
    const { toJSON } = render(<AlertMessage alertMessage={undefined} />);
    expect(toJSON()).toBeNull();
  });
});
