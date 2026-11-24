import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Text } from '@metamask/design-system-react-native';
import BannerCompact from './BannerCompact';
import { BannerCompactSelectorsIDs } from './BannerCompact.testIds';

const TITLE = 'Verify your identity';
const DESCRIPTION = 'This usually takes a few minutes.';
const ACTION = 'Continue';

const renderBanner = (props: Partial<Parameters<typeof BannerCompact>[0]>) =>
  render(<BannerCompact title={TITLE} description={DESCRIPTION} {...props} />);

describe('BannerCompact', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the title and the description, without a line cap', () => {
    const { getByText, getByTestId } = renderBanner({});

    expect(getByText(TITLE)).toBeOnTheScreen();
    expect(getByText(DESCRIPTION)).toBeOnTheScreen();
    expect(getByText(DESCRIPTION).props.numberOfLines).toBeUndefined();
    expect(getByTestId(BannerCompactSelectorsIDs.CONTAINER)).toBeOnTheScreen();
  });

  it('renders the text action under the description', () => {
    const { getByText } = renderBanner({ actionLabel: ACTION });

    expect(getByText(ACTION)).toBeOnTheScreen();
  });

  it('renders an image source thumbnail in its slot', () => {
    const source = { uri: 'https://example.com/thumbnail.png' };
    const { getByTestId } = renderBanner({ thumbnail: source });

    expect(getByTestId(BannerCompactSelectorsIDs.THUMBNAIL)).toBeOnTheScreen();
  });

  it('renders a node thumbnail in its slot', () => {
    const { getByText, getByTestId } = renderBanner({
      thumbnail: <Text>Node</Text>,
    });

    expect(getByText('Node')).toBeOnTheScreen();
    expect(getByTestId(BannerCompactSelectorsIDs.THUMBNAIL)).toBeOnTheScreen();
  });

  it('is one pressable button labelled with the title and the action', () => {
    const onPress = jest.fn();
    const { getByTestId } = renderBanner({
      actionLabel: ACTION,
      onPress,
    });

    const row = getByTestId(BannerCompactSelectorsIDs.CONTAINER);
    expect(row.props.accessibilityRole).toBe('button');
    expect(row.props.accessibilityLabel).toBe(`${TITLE}, ${ACTION}`);

    fireEvent.press(row);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is not a button when no onPress is given', () => {
    const { getByTestId } = renderBanner({});

    expect(
      getByTestId(BannerCompactSelectorsIDs.CONTAINER).props.accessibilityRole,
    ).toBeUndefined();
  });

  it('close fires onClose and not the row press', () => {
    const onPress = jest.fn();
    const onClose = jest.fn();
    const { getByTestId } = renderBanner({ onPress, onClose });

    fireEvent.press(getByTestId(BannerCompactSelectorsIDs.CLOSE_BUTTON));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('renders no close button without onClose', () => {
    const { queryByTestId } = renderBanner({});

    expect(queryByTestId(BannerCompactSelectorsIDs.CLOSE_BUTTON)).toBeNull();
  });

  it('uses the caller testID for the row and derives the rest', () => {
    const onPress = jest.fn();
    const { getByTestId } = renderBanner({
      testID: 'my-banner',
      thumbnail: { uri: 'https://example.com/thumbnail.png' },
      actionLabel: ACTION,
      onPress,
      onClose: jest.fn(),
    });

    expect(getByTestId('my-banner')).toBeOnTheScreen();
    expect(getByTestId('my-banner-thumbnail')).toBeOnTheScreen();
    expect(getByTestId('my-banner-close')).toBeOnTheScreen();
    expect(getByTestId('my-banner-action')).toBeOnTheScreen();
  });
});
