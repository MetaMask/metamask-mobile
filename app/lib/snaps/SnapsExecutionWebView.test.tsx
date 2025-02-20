import React from 'react';
import { shallow } from 'enzyme';

import {
  createWebView,
  removeWebView,
  SnapsExecutionWebView,
} from './SnapsExecutionWebView';

describe('SnapsExecutionWebView', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<SnapsExecutionWebView />);
    expect(wrapper).toBeDefined();
  });

  it('should create and remove WebViews correctly', async () => {
    const wrapper = shallow(<SnapsExecutionWebView />);
    createWebView('foo');
    createWebView('bar');
    wrapper.update();
    expect(wrapper.find('WebView')).toHaveLength(2);

    removeWebView('foo');
    wrapper.update();
    expect(wrapper.find('WebView')).toHaveLength(1);
  });
});
