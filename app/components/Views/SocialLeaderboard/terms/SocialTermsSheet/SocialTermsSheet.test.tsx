import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import SocialTermsSheet from './SocialTermsSheet';
import { SocialTermsSheetSelectorsIDs } from './SocialTermsSheet.testIds';

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
});
