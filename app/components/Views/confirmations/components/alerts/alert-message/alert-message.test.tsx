import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { AlertMessage } from './alert-message';

const MESSAGE_MOCK = 'Test message';
const styles = StyleSheet.create({
  alert: {
    fontSize: 16,
  },
});
const CONTENT_MOCK = <Text testID="custom-content">Custom content</Text>;

describe('AlertMessage', () => {
  it('renders the message as danger help text', () => {
    const { getByText, getByTestId } = render(
      <AlertMessage alertMessage={MESSAGE_MOCK} />,
    );
    expect(getByText(MESSAGE_MOCK)).toBeDefined();
    expect(getByTestId('alert-message-banner')).toBeDefined();
  });

  it('applies a text style override', () => {
    const { getByTestId } = render(
      <AlertMessage alertMessage={MESSAGE_MOCK} style={styles.alert} />,
    );

    expect(getByTestId('alert-message-banner')).toHaveStyle({ fontSize: 16 });
  });

  it('renders nothing if no message or content is provided', () => {
    const { toJSON } = render(<AlertMessage alertMessage={undefined} />);
    expect(toJSON()).toBeNull();
  });

  it('renders content instead of the message when content is provided', () => {
    const { getByTestId, queryByText, queryByTestId } = render(
      <AlertMessage content={CONTENT_MOCK} alertMessage={MESSAGE_MOCK} />,
    );
    expect(getByTestId('custom-content')).toBeDefined();
    expect(queryByText(MESSAGE_MOCK)).toBeNull();
    expect(queryByTestId('alert-message-banner')).toBeNull();
  });
});
