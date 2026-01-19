/* eslint-disable react/jsx-no-bind */
import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import BrowserBottomBar from './';
import { BrowserViewSelectorsIDs } from '../../Views/BrowserTab/BrowserView.testIds';
import { fireEvent, screen } from '@testing-library/react-native';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { MetaMetricsEvents } from '../../../core/Analytics';

// Mock the useMetrics hook
jest.mock('../../../components/hooks/useMetrics');

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn(() => ({ build: jest.fn(() => 'mockEvent') })),
  build: jest.fn(() => 'mockEvent'),
}));

describe('BrowserBottomBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useMetrics as jest.Mock).mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    });
  });
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

  describe('Analytics tracking', () => {
    it('should track search event when search button is pressed', () => {
      const showUrlModal = jest.fn();
      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar showUrlModal={showUrlModal} />,
      );

      fireEvent.press(getByTestId(BrowserViewSelectorsIDs.SEARCH_BUTTON));

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.BROWSER_SEARCH_USED,
      );
      expect(mockTrackEvent).toHaveBeenCalled();
      expect(showUrlModal).toHaveBeenCalled();
    });

    it('should track navigation event when back button is pressed', () => {
      const goBack = jest.fn();
      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar canGoBack goBack={goBack} />,
      );

      fireEvent.press(getByTestId(BrowserViewSelectorsIDs.BACK_BUTTON));

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.BROWSER_NAVIGATION,
      );
      expect(mockTrackEvent).toHaveBeenCalled();
      expect(goBack).toHaveBeenCalled();
    });

    it('should track navigation event when forward button is pressed', () => {
      const goForward = jest.fn();
      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar canGoForward goForward={goForward} />,
      );

      fireEvent.press(getByTestId(BrowserViewSelectorsIDs.FORWARD_BUTTON));

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.BROWSER_NAVIGATION,
      );
      expect(mockTrackEvent).toHaveBeenCalled();
      expect(goForward).toHaveBeenCalled();
    });

    it('should track navigation event when home button is pressed', () => {
      const goHome = jest.fn();
      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar goHome={goHome} />,
      );

      fireEvent.press(getByTestId(BrowserViewSelectorsIDs.HOME_BUTTON));

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.BROWSER_NAVIGATION,
      );
      expect(mockTrackEvent).toHaveBeenCalled();
      expect(goHome).toHaveBeenCalled();
    });

    it('should track fullscreen opened event when entering fullscreen', () => {
      const toggleFullscreen = jest.fn();
      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar
          toggleFullscreen={toggleFullscreen}
          isFullscreen={false}
        />,
      );

      fireEvent.press(
        getByTestId(BrowserViewSelectorsIDs.TOGGLE_FULLSCREEN_BUTTON),
      );

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.BROWSER_OPENED_FULLSCREEN,
      );
      expect(mockTrackEvent).toHaveBeenCalled();
      expect(toggleFullscreen).toHaveBeenCalled();
    });

    it('should track fullscreen closed event when exiting fullscreen', () => {
      const toggleFullscreen = jest.fn();
      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar toggleFullscreen={toggleFullscreen} isFullscreen />,
      );

      fireEvent.press(
        getByTestId(BrowserViewSelectorsIDs.TOGGLE_FULLSCREEN_BUTTON),
      );

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.BROWSER_CLOSED_FULLSCREEN,
      );
      expect(mockTrackEvent).toHaveBeenCalled();
      expect(toggleFullscreen).toHaveBeenCalled();
    });
  });

  describe('Fullscreen behavior', () => {
    it('should display fullscreen icon when not in fullscreen mode', () => {
      renderWithProvider(
        <BrowserBottomBar isFullscreen={false} toggleFullscreen={jest.fn} />,
      );

      const component = screen.toJSON();
      expect(component).toMatchSnapshot();
    });

    it('should display fullscreen-exit icon when in fullscreen mode', () => {
      renderWithProvider(
        <BrowserBottomBar isFullscreen toggleFullscreen={jest.fn} />,
      );

      const component = screen.toJSON();
      expect(component).toMatchSnapshot();
    });

    it('should apply bottom inset padding when in fullscreen mode', () => {
      // Mock useSafeAreaInsets
      const mockUseSafeAreaInsets = jest.fn(() => ({ bottom: 20 }));
      jest.doMock('react-native-safe-area-context', () => ({
        useSafeAreaInsets: mockUseSafeAreaInsets,
      }));

      renderWithProvider(
        <BrowserBottomBar isFullscreen toggleFullscreen={jest.fn} />,
      );

      expect(screen.toJSON()).toMatchSnapshot();
    });
  });

  describe('Button states and interactions', () => {
    it('should handle missing callback functions gracefully', () => {
      const { getByTestId } = renderWithProvider(<BrowserBottomBar />);

      // These should not crash when pressed without callbacks
      expect(() => {
        fireEvent.press(getByTestId(BrowserViewSelectorsIDs.BACK_BUTTON));
        fireEvent.press(getByTestId(BrowserViewSelectorsIDs.FORWARD_BUTTON));
        fireEvent.press(getByTestId(BrowserViewSelectorsIDs.HOME_BUTTON));
        fireEvent.press(getByTestId(BrowserViewSelectorsIDs.SEARCH_BUTTON));
        fireEvent.press(getByTestId(BrowserViewSelectorsIDs.TABS_BUTTON));
        fireEvent.press(getByTestId(BrowserViewSelectorsIDs.OPTIONS_BUTTON));
        fireEvent.press(
          getByTestId(BrowserViewSelectorsIDs.TOGGLE_FULLSCREEN_BUTTON),
        );
      }).not.toThrow();
    });

    it('should apply disabled styles when buttons are disabled', () => {
      renderWithProvider(
        <BrowserBottomBar
          canGoBack={false}
          canGoForward={false}
          // No goHome function provided - should be disabled
          // No toggleOptions function provided - should be disabled
          // No toggleFullscreen function provided - should be disabled
        />,
      );

      const component = screen.toJSON();
      expect(component).toMatchSnapshot();
    });

    it('should enable buttons when props are provided correctly', () => {
      const mockFn = jest.fn();
      renderWithProvider(
        <BrowserBottomBar
          canGoBack
          canGoForward
          goBack={mockFn}
          goForward={mockFn}
          goHome={mockFn}
          toggleOptions={mockFn}
          toggleFullscreen={mockFn}
          showTabs={mockFn}
          showUrlModal={mockFn}
        />,
      );

      expect(
        screen.getByTestId(BrowserViewSelectorsIDs.BACK_BUTTON).props.disabled,
      ).toBe(false);
      expect(
        screen.getByTestId(BrowserViewSelectorsIDs.FORWARD_BUTTON).props
          .disabled,
      ).toBe(false);
      expect(
        screen.getByTestId(BrowserViewSelectorsIDs.HOME_BUTTON).props.disabled,
      ).toBe(false);
      expect(
        screen.getByTestId(BrowserViewSelectorsIDs.OPTIONS_BUTTON).props
          .disabled,
      ).toBe(false);
      expect(
        screen.getByTestId(BrowserViewSelectorsIDs.TOGGLE_FULLSCREEN_BUTTON)
          .props.disabled,
      ).toBe(false);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should render without crashing when no props are provided', () => {
      expect(() => {
        renderWithProvider(<BrowserBottomBar />);
      }).not.toThrow();

      expect(screen.toJSON()).toMatchSnapshot();
    });

    it('should handle undefined callback functions in event handlers', () => {
      const { getByTestId } = renderWithProvider(
        <BrowserBottomBar
          canGoBack
          canGoForward
          // All callbacks intentionally undefined
        />,
      );

      // Should not crash when pressing buttons with undefined callbacks
      expect(() => {
        fireEvent.press(getByTestId(BrowserViewSelectorsIDs.BACK_BUTTON));
      }).not.toThrow();

      expect(() => {
        fireEvent.press(getByTestId(BrowserViewSelectorsIDs.FORWARD_BUTTON));
      }).not.toThrow();

      expect(() => {
        fireEvent.press(getByTestId(BrowserViewSelectorsIDs.HOME_BUTTON));
      }).not.toThrow();

      expect(() => {
        fireEvent.press(getByTestId(BrowserViewSelectorsIDs.SEARCH_BUTTON));
      }).not.toThrow();
    });

    it('should memoize component to prevent unnecessary re-renders', () => {
      const BrowserBottomBarMemo = BrowserBottomBar;
      expect(BrowserBottomBarMemo.$$typeof.toString()).toContain('react.memo');
    });
  });

  describe('Component snapshots', () => {
    it('should match snapshot with all props enabled', () => {
      const mockFn = jest.fn();
      renderWithProvider(
        <BrowserBottomBar
          canGoBack
          canGoForward
          goBack={mockFn}
          goForward={mockFn}
          goHome={mockFn}
          showTabs={mockFn}
          showUrlModal={mockFn}
          toggleOptions={mockFn}
          toggleFullscreen={mockFn}
          isFullscreen={false}
        />,
      );

      expect(screen.toJSON()).toMatchSnapshot();
    });

    it('should match snapshot with mixed enabled/disabled states', () => {
      const mockFn = jest.fn();
      renderWithProvider(
        <BrowserBottomBar
          canGoBack
          canGoForward={false}
          goBack={mockFn}
          goForward={mockFn}
          goHome={mockFn}
          showTabs={mockFn}
          showUrlModal={mockFn}
          // toggleOptions intentionally missing - should be disabled
          toggleFullscreen={mockFn}
          isFullscreen
        />,
      );

      expect(screen.toJSON()).toMatchSnapshot();
    });
  });
});
