/* eslint-disable react/jsx-no-bind */
import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import BrowserBottomBar from './';
import { BrowserViewSelectorsIDs } from '../../../../e2e/selectors/Browser/BrowserView.selectors';
import { fireEvent, screen } from '@testing-library/react-native';

describe('BrowserBottomBar', () => {
  it('should render correctly', () => {
    const fn = () => null;

    renderWithProvider(
      <BrowserBottomBar
        canGoBack
        canGoForward={false}
        showTabs={fn}
        toggleOptions={fn}
        showUrlModal={fn}
        toggleFullscreen={fn}
        isFullscreen={false}
        goBack={fn}
        goForward={fn}
        goHome={fn}
      />,
    );
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('should render disabled elements correctly', () => {
    renderWithProvider(
      <BrowserBottomBar canGoBack={false} canGoForward={false} />,
    );

    expect(
      screen.getByTestId(BrowserViewSelectorsIDs.BACK_BUTTON).props.disabled,
    ).toBe(true);
    expect(
      screen.getByTestId(BrowserViewSelectorsIDs.FORWARD_BUTTON).props.disabled,
    ).toBe(true);
    expect(
      screen.getByTestId(BrowserViewSelectorsIDs.HOME_BUTTON).props.disabled,
    ).toBe(true);
    expect(
      screen.getByTestId(BrowserViewSelectorsIDs.OPTIONS_BUTTON).props.disabled,
    ).toBe(true);
    expect(
      screen.getByTestId(BrowserViewSelectorsIDs.TOGGLE_FULLSCREEN_BUTTON).props
        .disabled,
    ).toBe(true);
  });

  it('should call the callbacks when buttons are pressed', () => {
    const goBack = jest.fn();
    const goForward = jest.fn();
    const goHome = jest.fn();
    const showTabs = jest.fn();
    const toggleOptions = jest.fn();
    const showUrlModal = jest.fn();
    const toggleFullscreen = jest.fn();

    const { getByTestId } = renderWithProvider(
      <BrowserBottomBar
        canGoBack
        canGoForward={false}
        showTabs={showTabs}
        toggleOptions={toggleOptions}
        showUrlModal={showUrlModal}
        goBack={goBack}
        goForward={goForward}
        goHome={goHome}
        toggleFullscreen={toggleFullscreen}
        isFullscreen={false}
      />,
    );

    fireEvent.press(getByTestId(BrowserViewSelectorsIDs.BACK_BUTTON));
    expect(goBack).toHaveBeenCalled();

    fireEvent.press(getByTestId(BrowserViewSelectorsIDs.FORWARD_BUTTON));
    expect(goForward).toHaveBeenCalled();

    fireEvent.press(getByTestId(BrowserViewSelectorsIDs.HOME_BUTTON));
    expect(goHome).toHaveBeenCalled();

    fireEvent.press(getByTestId(BrowserViewSelectorsIDs.TABS_BUTTON));
    expect(showTabs).toHaveBeenCalled();

    fireEvent.press(getByTestId(BrowserViewSelectorsIDs.OPTIONS_BUTTON));
    expect(toggleOptions).toHaveBeenCalled();

    fireEvent.press(getByTestId(BrowserViewSelectorsIDs.SEARCH_BUTTON));
    expect(showUrlModal).toHaveBeenCalled();

    fireEvent.press(
      getByTestId(BrowserViewSelectorsIDs.TOGGLE_FULLSCREEN_BUTTON),
    );
    expect(toggleFullscreen).toHaveBeenCalled();
  });
});
