/* eslint-disable react/jsx-no-bind */
import React from 'react';
import { render } from '@testing-library/react-native';
import BrowserBottomBar from './';

describe('BrowserBottomBar', () => {
  it('should render correctly', () => {
    const fn = () => null;

    const { toJSON } = render(
      <BrowserBottomBar
        canGoBack
        canGoForward={false}
        showTabs={fn}
        toggleOptions={fn}
        showUrlModal={fn}
        goBack={fn}
        goForward={fn}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
