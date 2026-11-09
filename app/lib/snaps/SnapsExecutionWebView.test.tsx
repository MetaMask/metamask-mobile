import React from 'react';
import { render } from '@testing-library/react-native';

import {
  createWebView,
  removeWebView,
  SnapsExecutionWebView,
} from './SnapsExecutionWebView';

jest.mock('../../util/test/utils', () => ({
  ...jest.requireActual('../../util/test/utils'),
  isTestEnvironment: true,
}));

describe('SnapsExecutionWebView', () => {
  it('should render correctly', () => {
    const wrapper = render(<SnapsExecutionWebView />);
    expect(wrapper).toMatchInlineSnapshot(`
      <View
        style={
          {
            "height": 0,
            "width": 0,
          }
        }
      />
    `);
  });

  it('should create and remove WebViews correctly', async () => {
    const wrapper = render(<SnapsExecutionWebView />);
    createWebView('foo');
    createWebView('bar');
    wrapper.rerender(<SnapsExecutionWebView />);
    expect(await wrapper.queryByTestId('foo')).toBeTruthy();
    expect(await wrapper.queryByTestId('bar')).toBeTruthy();
    removeWebView('foo');
    wrapper.rerender(<SnapsExecutionWebView />);
    expect(await wrapper.queryByTestId('foo')).toBeNull();
    expect(await wrapper.queryByTestId('bar')).toBeTruthy();
  });

  it('keeps WebView debugging enabled in release test builds', () => {
    const globalWithDev = global as typeof global & { __DEV__: boolean };
    const originalDev = globalWithDev.__DEV__;
    globalWithDev.__DEV__ = false;
    const wrapper = render(<SnapsExecutionWebView />);
    createWebView('debuggable');
    wrapper.rerender(<SnapsExecutionWebView />);

    const webView = wrapper.getByTestId('debuggable');
    globalWithDev.__DEV__ = originalDev;

    expect(webView.props.webviewDebuggingEnabled).toBe(true);
  });
});
