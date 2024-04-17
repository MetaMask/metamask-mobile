/* eslint-disable react/jsx-no-bind */
import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import BrowserBottomBar from './';

describe('BrowserBottomBar', () => {
  it('should render correctly', () => {
    const fn = () => null;

    const { toJSON } = renderWithProvider(
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
