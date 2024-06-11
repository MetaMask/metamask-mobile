import React from 'react';
import { render } from '@testing-library/react-native';

import ClipboardText from './Clipboard';

describe('ClipboardText', () => {
  it('renders correctly', () => {
    const wrapper = render(
      <ClipboardText
        text={'random text'}
        testID={'random-test-id'}
        styles={{ clipboardText: {} }}
      />,
    );

    expect(wrapper).toMatchSnapshot();
  });
});
