import React from 'react';
import { render } from '@testing-library/react-native';

import ClipboardText from './Clipboard';

describe('ClipboardText', () => {
  it('renders correctly', () => {
    const { toJSON } = render(
      <ClipboardText
        text={'random text'}
        testID={'random-test-id'}
        styles={{ clipboardText: {} }}
      />,
    );

    expect(toJSON()).not.toBeNull();
  });
});
