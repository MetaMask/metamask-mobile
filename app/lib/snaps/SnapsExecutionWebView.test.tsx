import React from 'react';
import { render } from '@testing-library/react-native';

import {
  buildE2EProxyPatchScript,
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

  it('builds an iOS proxy patch script without emulator host fallback', () => {
    const script = buildE2EProxyPatchScript({
      mockServerPort: '8000',
      platform: 'ios',
      snapId: 'npm:@metamask/solana-wallet-snap',
    });

    expect(script).toContain('/proxy?source=');
    expect(script).toContain("snapProxySource = 'snap-webview'");
    expect(script).toContain('snapId = "npm:@metamask/solana-wallet-snap"');
    expect(script).toContain(
      '?source=${snapProxySource}&snapId=${encodeURIComponent(snapId)}&url=',
    );
    expect(script).toContain('http://localhost');
    expect(script).not.toContain('10.0.2.2');
  });

  it('builds an Android proxy patch script with emulator host fallback', () => {
    const script = buildE2EProxyPatchScript({
      mockServerPort: '8000',
      platform: 'android',
      snapId: 'npm:@metamask/bitcoin-wallet-snap',
    });

    expect(script).toContain('/proxy?source=');
    expect(script).toContain("snapProxySource = 'snap-webview'");
    expect(script).toContain('snapId = "npm:@metamask/bitcoin-wallet-snap"');
    expect(script).toContain(
      '?source=${snapProxySource}&snapId=${encodeURIComponent(snapId)}&url=',
    );
    expect(script).toContain('http://localhost');
    expect(script).toContain('10.0.2.2');
  });
});
