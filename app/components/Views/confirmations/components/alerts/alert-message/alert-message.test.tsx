import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { AlertMessage } from './alert-message';

const MESSAGE_MOCK = 'Test message';
const CONTENT_MOCK = <Text testID="custom-content">Custom content</Text>;

describe('AlertMessage', () => {
  it('renders message in a banner', () => {
    const { getByText, getByTestId } = render(
      <AlertMessage alertMessage={MESSAGE_MOCK} />,
    );
    expect(getByText(MESSAGE_MOCK)).toBeDefined();
    expect(getByTestId('alert-message-banner')).toBeDefined();
  });

  it('renders nothing if no message or content is provided', () => {
    const { toJSON } = render(<AlertMessage alertMessage={undefined} />);
    expect(toJSON()).toBeNull();
  });

  it('renders content instead of message when content is provided', () => {
    const { getByTestId, queryByText } = render(
      <AlertMessage content={CONTENT_MOCK} alertMessage={MESSAGE_MOCK} />,
    );
    expect(getByTestId('custom-content')).toBeDefined();
    expect(queryByText(MESSAGE_MOCK)).toBeNull();
  });
});
