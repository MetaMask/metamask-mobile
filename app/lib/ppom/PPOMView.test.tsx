import React from 'react';
import { ViewProps } from 'react-native';
import { render } from '@testing-library/react-native';

import { PPOMView } from './PPOMView';

jest.mock('react-native-webview', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { View } = require('react-native');
  const WebView = (props: ViewProps) => <View {...props} />;

  return {
    WebView,
  };
});

describe('PPOMView', () => {
  it('should render correctly deeply', () => {
    const wrapper = render(<PPOMView />);
    expect(wrapper).toMatchSnapshot();
  });
});
