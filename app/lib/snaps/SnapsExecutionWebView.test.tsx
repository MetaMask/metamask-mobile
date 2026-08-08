import React from 'react';
import { render } from '@testing-library/react-native';

import {
  createWebView,
  prewarmSnapsWebView,
  removeWebView,
  SnapsExecutionWebView,
} from './SnapsExecutionWebView';

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

  it('pre-warms a spare WebView and reuses it for the next Snap', async () => {
    const wrapper = render(<SnapsExecutionWebView />);

    // Pre-warm boots a spare WebView ahead of any Snap.
    prewarmSnapsWebView();
    wrapper.rerender(<SnapsExecutionWebView />);
    expect(
      await wrapper.queryByTestId('snaps-execution-webview-0'),
    ).toBeTruthy();

    // Creating a Snap adopts the warm spare (it becomes addressable by jobId)
    // and a fresh spare is kept warm for the next one.
    createWebView('foo');
    wrapper.rerender(<SnapsExecutionWebView />);
    expect(await wrapper.queryByTestId('foo')).toBeTruthy();
    expect(await wrapper.queryByTestId('snaps-execution-webview-0')).toBeNull();
    expect(
      await wrapper.queryByTestId('snaps-execution-webview-1'),
    ).toBeTruthy();

    removeWebView('foo');
  });
});
