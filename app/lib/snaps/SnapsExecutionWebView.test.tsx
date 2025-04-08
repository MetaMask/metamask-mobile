import React from 'react';
import { render } from '@testing-library/react-native';

import {
  createWebView,
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
});
