import React from 'react';
import { ScrollView } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import { IconName } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import SocialTermsSheet from './SocialTermsSheet';
import { SocialTermsSheetSelectorsIDs } from './SocialTermsSheet.testIds';

// Unit coverage: the sheet is not a registered route, and the button calls
// ScrollView.scrollToEnd / WebView.injectJavaScript. Component-view does not
// expose those native imperative handles, so the existing unit file owns this.
jest.mock('@metamask/react-native-webview', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const injectJavaScript = jest.fn();
  const WebView = ReactActual.forwardRef(
    (
      props: Record<string, unknown>,
      ref: React.Ref<{ injectJavaScript: typeof injectJavaScript }>,
    ) => {
      ReactActual.useImperativeHandle(ref, () => ({ injectJavaScript }));
      return ReactActual.createElement(View, props);
    },
  );

  return { WebView, __mockInjectJavaScript: injectJavaScript };
});

const { __mockInjectJavaScript: mockInjectJavaScript } = jest.requireMock(
  '@metamask/react-native-webview',
) as { __mockInjectJavaScript: jest.Mock };

jest.mock('@metamask/design-system-react-native', () => {
  const actualDesignSystem = jest.requireActual(
    '@metamask/design-system-react-native',
  );
  // eslint-disable-next-line @typescript-eslint/no-require-imports, import-x/no-commonjs, @typescript-eslint/no-var-requires
  const ReactMock = require('react');

  return {
    ...actualDesignSystem,
    BottomSheet: ({
      children,
      testID,
    }: {
      children: React.ReactNode;
      testID?: string;
    }) => ReactMock.createElement('View', { testID }, children),
  };
});

const scrollToEnd = {
  nativeEvent: {
    layoutMeasurement: { height: 400 },
    contentOffset: { y: 600 },
    contentSize: { height: 1000 },
  },
};

const scrollToMiddle = {
  nativeEvent: {
    layoutMeasurement: { height: 400 },
    contentOffset: { y: 100 },
    contentSize: { height: 1000 },
  },
};

const renderSheet = () => {
  const onAgree = jest.fn();
  const onClose = jest.fn();
  const utils = renderWithProvider(
    <SocialTermsSheet onAgree={onAgree} onClose={onClose} />,
  );
  return { ...utils, onAgree, onClose };
};

describe('SocialTermsSheet', () => {
  beforeEach(() => {
    mockInjectJavaScript.mockClear();
  });

  it('keeps Agree disabled and shows the scroll helper before the end is reached', () => {
    const { getByTestId, onAgree } = renderSheet();

    fireEvent.scroll(
      getByTestId(SocialTermsSheetSelectorsIDs.BODY),
      scrollToMiddle,
    );
    fireEvent.press(getByTestId(SocialTermsSheetSelectorsIDs.CHECKBOX));
    fireEvent.press(getByTestId(SocialTermsSheetSelectorsIDs.AGREE_BUTTON));

    expect(
      getByTestId(SocialTermsSheetSelectorsIDs.SCROLL_HELPER),
    ).toBeOnTheScreen();
    expect(onAgree).not.toHaveBeenCalled();
  });

  it('calls onAgree after scrolling to the end and checking the box', () => {
    const { getByTestId, queryByTestId, onAgree } = renderSheet();

    fireEvent.scroll(
      getByTestId(SocialTermsSheetSelectorsIDs.BODY),
      scrollToEnd,
    );
    fireEvent.press(getByTestId(SocialTermsSheetSelectorsIDs.CHECKBOX));
    fireEvent.press(getByTestId(SocialTermsSheetSelectorsIDs.AGREE_BUTTON));

    expect(
      queryByTestId(SocialTermsSheetSelectorsIDs.SCROLL_HELPER),
    ).not.toBeOnTheScreen();
    expect(onAgree).toHaveBeenCalledTimes(1);
  });

  it('keeps Agree disabled when the end is reached but the box is not checked', () => {
    const { getByTestId, onAgree } = renderSheet();

    fireEvent.scroll(
      getByTestId(SocialTermsSheetSelectorsIDs.BODY),
      scrollToEnd,
    );
    fireEvent.press(getByTestId(SocialTermsSheetSelectorsIDs.AGREE_BUTTON));

    expect(onAgree).not.toHaveBeenCalled();
  });

  it('treats content that fits the viewport as read', () => {
    const { getByTestId, queryByTestId } = renderSheet();
    const body = getByTestId(SocialTermsSheetSelectorsIDs.BODY);

    fireEvent(body, 'layout', { nativeEvent: { layout: { height: 400 } } });
    fireEvent(body, 'contentSizeChange', 300, 380);

    expect(
      queryByTestId(SocialTermsSheetSelectorsIDs.SCROLL_HELPER),
    ).not.toBeOnTheScreen();
  });

  it('calls onClose from the header close button', () => {
    const { getByTestId, onClose, onAgree } = renderSheet();

    fireEvent.press(getByTestId(SocialTermsSheetSelectorsIDs.CLOSE_BUTTON));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onAgree).not.toHaveBeenCalled();
  });

  it('renders the hosted terms page when a uri is provided', () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      <SocialTermsSheet
        uri="https://example.com/terms"
        onAgree={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    expect(getByTestId(SocialTermsSheetSelectorsIDs.WEBVIEW)).toBeOnTheScreen();
    expect(
      queryByTestId(SocialTermsSheetSelectorsIDs.BODY),
    ).not.toBeOnTheScreen();
  });

  it('does not hide the scroll-to-bottom button when a WebView native scroll reports the end', () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      <SocialTermsSheet
        html="<html><body>Terms</body></html>"
        onAgree={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    const webView = getByTestId(SocialTermsSheetSelectorsIDs.WEBVIEW);

    fireEvent.scroll(webView, {
      nativeEvent: {
        layoutMeasurement: { height: 400 },
        contentOffset: { y: 8 },
        contentSize: { height: 400 },
      },
    });

    expect(
      getByTestId(SocialTermsSheetSelectorsIDs.SCROLL_TO_BOTTOM_BUTTON),
    ).toBeOnTheScreen();

    fireEvent(webView, 'message', {
      nativeEvent: { data: 'social-terms-scroll-end' },
    });

    expect(
      queryByTestId(SocialTermsSheetSelectorsIDs.SCROLL_TO_BOTTOM_BUTTON),
    ).not.toBeOnTheScreen();

    fireEvent(webView, 'message', {
      nativeEvent: { data: 'social-terms-scroll-not-end' },
    });

    expect(
      getByTestId(SocialTermsSheetSelectorsIDs.SCROLL_TO_BOTTOM_BUTTON),
    ).toBeOnTheScreen();
  });

  it('marks the WebView terms as read from native scroll events', () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      <SocialTermsSheet
        html="<html><body>Terms</body></html>"
        onAgree={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    fireEvent.scroll(
      getByTestId(SocialTermsSheetSelectorsIDs.WEBVIEW),
      scrollToEnd,
    );

    expect(
      queryByTestId(SocialTermsSheetSelectorsIDs.SCROLL_HELPER),
    ).not.toBeOnTheScreen();
  });

  it('ignores a WebView scroll event that reports a viewport-sized document', () => {
    const { getByTestId } = renderWithProvider(
      <SocialTermsSheet
        html="<html><body>Terms</body></html>"
        onAgree={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    fireEvent.scroll(getByTestId(SocialTermsSheetSelectorsIDs.WEBVIEW), {
      nativeEvent: {
        layoutMeasurement: { height: 400 },
        contentOffset: { y: 0 },
        contentSize: { height: 400 },
      },
    });

    expect(
      getByTestId(SocialTermsSheetSelectorsIDs.SCROLL_HELPER),
    ).toBeOnTheScreen();
  });

  it('does not mark the terms as read before the content is measured', () => {
    const { getByTestId } = renderWithProvider(
      <SocialTermsSheet
        html="<html><body>Terms</body></html>"
        onAgree={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    fireEvent.scroll(getByTestId(SocialTermsSheetSelectorsIDs.WEBVIEW), {
      nativeEvent: {
        layoutMeasurement: { height: 0 },
        contentOffset: { y: 0 },
        contentSize: { height: 0 },
      },
    });

    expect(
      getByTestId(SocialTermsSheetSelectorsIDs.SCROLL_HELPER),
    ).toBeOnTheScreen();
  });

  it('allows only same-origin navigation for the bundled terms page', () => {
    const { getByTestId } = renderWithProvider(
      <SocialTermsSheet
        html="<html><body>Terms</body></html>"
        onAgree={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    const onShouldStartLoadWithRequest = getByTestId(
      SocialTermsSheetSelectorsIDs.WEBVIEW,
    ).props.onShouldStartLoadWithRequest;

    expect(
      onShouldStartLoadWithRequest({ url: 'https://metamask.com/privacy' }),
    ).toBe(true);
    expect(
      onShouldStartLoadWithRequest({
        url: 'https://metamask.com.evil.example/terms',
      }),
    ).toBe(false);
    expect(
      onShouldStartLoadWithRequest({ url: 'http://metamask.com/terms' }),
    ).toBe(false);
  });

  it('allows same-origin navigation for a hosted terms page', () => {
    const { getByTestId } = renderWithProvider(
      <SocialTermsSheet
        uri="https://metamask.com/social-tos"
        onAgree={jest.fn()}
        onClose={jest.fn()}
      />,
    );
    const onShouldStartLoadWithRequest = getByTestId(
      SocialTermsSheetSelectorsIDs.WEBVIEW,
    ).props.onShouldStartLoadWithRequest;

    expect(
      onShouldStartLoadWithRequest({ url: 'https://metamask.com/privacy' }),
    ).toBe(true);
    expect(
      onShouldStartLoadWithRequest({ url: 'https://evil.example/terms' }),
    ).toBe(false);
  });

  it('shows a circular scroll-to-bottom button until the terms end is on screen', () => {
    const {
      getByTestId,
      queryByTestId,
      UNSAFE_getByProps,
      UNSAFE_queryByProps,
    } = renderSheet();
    const button = getByTestId(
      SocialTermsSheetSelectorsIDs.SCROLL_TO_BOTTOM_BUTTON,
    );

    expect(button).toBeOnTheScreen();
    expect(button).toHaveProp(
      'accessibilityLabel',
      strings('social_leaderboard.terms.scroll_to_bottom'),
    );
    expect(UNSAFE_getByProps({ name: IconName.ArrowDown }).props.name).toBe(
      IconName.ArrowDown,
    );

    fireEvent.scroll(
      getByTestId(SocialTermsSheetSelectorsIDs.BODY),
      scrollToEnd,
    );

    expect(
      queryByTestId(SocialTermsSheetSelectorsIDs.SCROLL_TO_BOTTOM_BUTTON),
    ).not.toBeOnTheScreen();
    expect(UNSAFE_queryByProps({ name: IconName.ArrowDown })).toBeNull();
  });

  it('scrolls the terms to the end when the scroll-to-bottom button is pressed', () => {
    const { getByTestId, queryByTestId, onAgree, UNSAFE_getByType } =
      renderSheet();
    const scrollToEndSpy = jest.fn();
    UNSAFE_getByType(ScrollView).instance.scrollToEnd = scrollToEndSpy;

    fireEvent.press(
      getByTestId(SocialTermsSheetSelectorsIDs.SCROLL_TO_BOTTOM_BUTTON),
    );
    fireEvent.scroll(
      getByTestId(SocialTermsSheetSelectorsIDs.BODY),
      scrollToEnd,
    );
    fireEvent.press(getByTestId(SocialTermsSheetSelectorsIDs.CHECKBOX));
    fireEvent.press(getByTestId(SocialTermsSheetSelectorsIDs.AGREE_BUTTON));

    expect(scrollToEndSpy).toHaveBeenCalledTimes(1);
    expect(scrollToEndSpy).toHaveBeenCalledWith({ animated: true });
    expect(
      queryByTestId(SocialTermsSheetSelectorsIDs.SCROLL_TO_BOTTOM_BUTTON),
    ).not.toBeOnTheScreen();
    expect(onAgree).toHaveBeenCalledTimes(1);
  });

  it('shows the scroll-to-bottom button again after leaving the end', () => {
    const { getByTestId, queryByTestId, onAgree } = renderSheet();
    const body = getByTestId(SocialTermsSheetSelectorsIDs.BODY);

    fireEvent.scroll(body, scrollToEnd);
    fireEvent.scroll(body, scrollToMiddle);
    fireEvent.press(getByTestId(SocialTermsSheetSelectorsIDs.CHECKBOX));
    fireEvent.press(getByTestId(SocialTermsSheetSelectorsIDs.AGREE_BUTTON));

    expect(
      getByTestId(SocialTermsSheetSelectorsIDs.SCROLL_TO_BOTTOM_BUTTON),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(SocialTermsSheetSelectorsIDs.SCROLL_HELPER),
    ).not.toBeOnTheScreen();
    expect(onAgree).toHaveBeenCalledTimes(1);
  });

  it('hides the scroll-to-bottom button when the terms fit in the viewport', () => {
    const { getByTestId, queryByTestId } = renderSheet();
    const body = getByTestId(SocialTermsSheetSelectorsIDs.BODY);

    fireEvent(body, 'layout', { nativeEvent: { layout: { height: 400 } } });
    fireEvent(body, 'contentSizeChange', 300, 380);

    expect(
      queryByTestId(SocialTermsSheetSelectorsIDs.SCROLL_TO_BOTTOM_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('smooth-scrolls hosted terms when the scroll-to-bottom button is pressed', () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      <SocialTermsSheet
        html="<html><body>Terms</body></html>"
        onAgree={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    fireEvent.press(
      getByTestId(SocialTermsSheetSelectorsIDs.SCROLL_TO_BOTTOM_BUTTON),
    );
    fireEvent(getByTestId(SocialTermsSheetSelectorsIDs.WEBVIEW), 'message', {
      nativeEvent: { data: 'social-terms-scroll-end' },
    });

    expect(mockInjectJavaScript).toHaveBeenCalledWith(
      expect.stringContaining("behavior: 'smooth'"),
    );
    expect(
      queryByTestId(SocialTermsSheetSelectorsIDs.SCROLL_TO_BOTTOM_BUTTON),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(SocialTermsSheetSelectorsIDs.SCROLL_HELPER),
    ).not.toBeOnTheScreen();
  });

  it('shows the scroll-to-bottom button again when hosted terms leave the end', () => {
    const onAgree = jest.fn();
    const { getByTestId, queryByTestId } = renderWithProvider(
      <SocialTermsSheet
        uri="https://metamask.com/social-tos"
        onAgree={onAgree}
        onClose={jest.fn()}
      />,
    );
    const webView = getByTestId(SocialTermsSheetSelectorsIDs.WEBVIEW);

    fireEvent(webView, 'message', {
      nativeEvent: { data: 'social-terms-scroll-end' },
    });
    fireEvent(webView, 'message', {
      nativeEvent: { data: 'social-terms-scroll-not-end' },
    });
    fireEvent.press(getByTestId(SocialTermsSheetSelectorsIDs.CHECKBOX));
    fireEvent.press(getByTestId(SocialTermsSheetSelectorsIDs.AGREE_BUTTON));

    expect(
      getByTestId(SocialTermsSheetSelectorsIDs.SCROLL_TO_BOTTOM_BUTTON),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(SocialTermsSheetSelectorsIDs.SCROLL_HELPER),
    ).not.toBeOnTheScreen();
    expect(onAgree).toHaveBeenCalledTimes(1);
  });
});
