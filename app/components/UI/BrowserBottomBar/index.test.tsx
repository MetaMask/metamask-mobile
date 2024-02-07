/* eslint-disable react/jsx-no-bind */
import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import BrowserBottomBar from './';
import initialBackgroundState from '../../../util/test/initial-background-state.json';

const mockInitialState = {
  engine: {
    backgroundState: initialBackgroundState,
  },
};

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 0 }),
}));

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
      { state: mockInitialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
