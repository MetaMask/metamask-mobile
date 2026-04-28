import React from 'react';
import { render } from '@testing-library/react-native';

import ClipboardText from './Clipboard';

describe('ClipboardText', () => {
  it('renders correctly', () => {
    const { getByTestId, getByText } = render(
      <ClipboardText
        text={'random text'}
        testID={'random-test-id'}
        styles={{ clipboardText: {} }}
      />,
    );

    getByTestId('random-test-id');
    getByText('random text');
  });
});
