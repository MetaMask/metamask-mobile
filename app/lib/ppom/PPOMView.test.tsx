import React from 'react';
import { ViewProps } from 'react-native';
import { render } from '@testing-library/react-native';

import { PPOMView } from './PPOMView';

jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  return {
    WebView: (props: ViewProps) => <View {...props} />,
  };
});

describe('PPOMView', () => {
  it('should render correctly deeply', () => {
    const wrapper = render(<PPOMView />);
    expect(wrapper).toMatchSnapshot();
  });
});
