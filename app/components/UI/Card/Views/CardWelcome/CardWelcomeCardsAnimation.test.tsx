import React from 'react';
import { StyleSheet } from 'react-native';
import { render, act } from '@testing-library/react-native';
import { Fit, RiveErrorType } from '@rive-app/react-native';
import CardWelcomeCardsAnimation from './CardWelcomeCardsAnimation';
import { CardWelcomeSelectors } from './CardWelcome.testIds';
import { __resetRiveMocks } from '../../../../../__mocks__/rive-app-react-native';

interface MockRiveViewProps {
  testID?: string;
  style?: Record<string, unknown>;
  artboardName?: string;
  stateMachineName?: string;
  autoPlay?: boolean;
  fit?: Fit;
  onError?: (error: { message: string; type: RiveErrorType }) => void;
}

// Override the global Rive mock: the shared mock renders RiveView without
// exposing `onError`, and these tests also drive the file-load result and the
// native view's readiness (`mockViewReady`), which gates the entrance signal.
let mockRiveFileResult: {
  riveFile: unknown;
  isLoading: boolean;
  error: Error | null;
};
let mockViewReady: boolean;
let mockLastRiveViewProps: MockRiveViewProps | undefined;

jest.mock('@rive-app/react-native', () => {
  const actual = jest.requireActual(
    '../../../../../__mocks__/rive-app-react-native',
  );
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const MockReact = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');

  const MockRiveView = (props: MockRiveViewProps) => {
    mockLastRiveViewProps = props;
    return MockReact.createElement(View, {
      testID: props.testID,
      style: props.style,
    });
  };

  return {
    ...actual,
    RiveView: MockRiveView,
    useRiveFile: () => mockRiveFileResult,
    useRive: () => ({
      riveRef: { current: null },
      riveViewRef: mockViewReady ? { playIfNeeded: jest.fn() } : null,
      setHybridRef: { f: jest.fn() },
    }),
  };
});

jest.mock('../../../../../images/stacked-cards.png', () => 1);

jest.mock(
  '../../../../../animations/onboarding_card_education_v3.riv',
  () => 1,
  { virtual: true },
);

describe('CardWelcomeCardsAnimation', () => {
  const style = { width: 320 };

  beforeEach(() => {
    jest.clearAllMocks();
    __resetRiveMocks();
    mockLastRiveViewProps = undefined;
    mockViewReady = true;
    mockRiveFileResult = {
      riveFile: { __mockRiveFile: true },
      isLoading: false,
      error: null,
    };
  });

  it('uses the contract testID for the Rive animation', () => {
    expect(CardWelcomeSelectors.CARDS_ANIMATION).toBe(
      'card-welcome-cards-rive',
    );
  });

  it('renders the Rive animation and no static image when animate is true', () => {
    const { getByTestId, queryByTestId } = render(
      <CardWelcomeCardsAnimation animate style={style} />,
    );

    expect(getByTestId(CardWelcomeSelectors.CARDS_ANIMATION)).toBeOnTheScreen();
    expect(
      queryByTestId(CardWelcomeSelectors.CARD_IMAGE),
    ).not.toBeOnTheScreen();
  });

  it('plays the cards entrance through the authored artboard and state machine', () => {
    render(<CardWelcomeCardsAnimation animate style={style} />);

    expect(mockLastRiveViewProps).toEqual(
      expect.objectContaining({
        artboardName: 'cards',
        stateMachineName: 'State Machine 1',
        autoPlay: true,
        fit: Fit.Contain,
      }),
    );
  });

  it('renders the static image and no Rive animation when animate is false', () => {
    const { getByTestId, queryByTestId } = render(
      <CardWelcomeCardsAnimation animate={false} style={style} />,
    );

    expect(getByTestId(CardWelcomeSelectors.CARD_IMAGE)).toBeOnTheScreen();
    expect(
      queryByTestId(CardWelcomeSelectors.CARDS_ANIMATION),
    ).not.toBeOnTheScreen();
  });

  it('renders neither the animation nor the static image while the file loads', () => {
    mockRiveFileResult = { riveFile: undefined, isLoading: true, error: null };

    const { queryByTestId } = render(
      <CardWelcomeCardsAnimation animate style={style} />,
    );

    expect(
      queryByTestId(CardWelcomeSelectors.CARDS_ANIMATION),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(CardWelcomeSelectors.CARD_IMAGE),
    ).not.toBeOnTheScreen();
  });

  it('falls back to the static image and reports when the file fails to load', () => {
    const onRiveError = jest.fn();
    mockRiveFileResult = {
      riveFile: null,
      isLoading: false,
      error: new Error('malformed file'),
    };

    const { getByTestId, queryByTestId } = render(
      <CardWelcomeCardsAnimation
        animate
        style={style}
        onRiveError={onRiveError}
      />,
    );

    expect(getByTestId(CardWelcomeSelectors.CARD_IMAGE)).toBeOnTheScreen();
    expect(
      queryByTestId(CardWelcomeSelectors.CARDS_ANIMATION),
    ).not.toBeOnTheScreen();
    expect(onRiveError).toHaveBeenCalledTimes(1);
  });

  it('reports the entrance start once the file is loaded and the view is ready', () => {
    const onEntranceStart = jest.fn();

    render(
      <CardWelcomeCardsAnimation
        animate
        style={style}
        onEntranceStart={onEntranceStart}
      />,
    );

    expect(onEntranceStart).toHaveBeenCalledTimes(1);
  });

  it('does not report the entrance start while the file is still loading', () => {
    const onEntranceStart = jest.fn();
    mockRiveFileResult = { riveFile: undefined, isLoading: true, error: null };

    render(
      <CardWelcomeCardsAnimation
        animate
        style={style}
        onEntranceStart={onEntranceStart}
      />,
    );

    expect(onEntranceStart).not.toHaveBeenCalled();
  });

  it('does not report the entrance start until the native view is ready', () => {
    const onEntranceStart = jest.fn();
    mockViewReady = false;

    const { rerender } = render(
      <CardWelcomeCardsAnimation
        animate
        style={style}
        onEntranceStart={onEntranceStart}
      />,
    );

    expect(onEntranceStart).not.toHaveBeenCalled();

    mockViewReady = true;
    rerender(
      <CardWelcomeCardsAnimation
        animate
        style={style}
        onEntranceStart={onEntranceStart}
      />,
    );

    expect(onEntranceStart).toHaveBeenCalledTimes(1);
  });

  it('does not report the entrance start when the static image renders instead', () => {
    const onEntranceStart = jest.fn();

    render(
      <CardWelcomeCardsAnimation
        animate={false}
        style={style}
        onEntranceStart={onEntranceStart}
      />,
    );

    expect(onEntranceStart).not.toHaveBeenCalled();
  });

  it('reports the entrance start only once across re-renders', () => {
    const onEntranceStart = jest.fn();

    const { rerender } = render(
      <CardWelcomeCardsAnimation
        animate
        style={style}
        onEntranceStart={onEntranceStart}
      />,
    );
    rerender(
      <CardWelcomeCardsAnimation
        animate
        style={{ ...style, height: 100 }}
        onEntranceStart={onEntranceStart}
      />,
    );

    expect(onEntranceStart).toHaveBeenCalledTimes(1);
  });

  it('passes the style prop through to the Rive animation', () => {
    const { getByTestId } = render(
      <CardWelcomeCardsAnimation animate style={style} />,
    );

    const flattenedStyle = StyleSheet.flatten(
      getByTestId(CardWelcomeSelectors.CARDS_ANIMATION).props.style,
    );

    expect(flattenedStyle).toEqual(expect.objectContaining(style));
  });

  it('passes the style prop through to the static image', () => {
    const { getByTestId } = render(
      <CardWelcomeCardsAnimation animate={false} style={style} />,
    );

    const flattenedStyle = StyleSheet.flatten(
      getByTestId(CardWelcomeSelectors.CARD_IMAGE).props.style,
    );

    expect(flattenedStyle).toEqual(expect.objectContaining(style));
  });

  it('falls back to the static image when the Rive animation errors', () => {
    const { getByTestId, queryByTestId } = render(
      <CardWelcomeCardsAnimation animate style={style} />,
    );

    expect(getByTestId(CardWelcomeSelectors.CARDS_ANIMATION)).toBeOnTheScreen();

    const onError = mockLastRiveViewProps?.onError;
    expect(onError).toBeDefined();

    act(() => {
      onError?.({
        message: 'failed to load',
        type: RiveErrorType.MalformedFile,
      });
    });

    expect(getByTestId(CardWelcomeSelectors.CARD_IMAGE)).toBeOnTheScreen();
    expect(
      queryByTestId(CardWelcomeSelectors.CARDS_ANIMATION),
    ).not.toBeOnTheScreen();
  });

  it('calls onRiveError when the Rive animation errors', () => {
    const onRiveError = jest.fn();
    render(
      <CardWelcomeCardsAnimation
        animate
        style={style}
        onRiveError={onRiveError}
      />,
    );

    const onError = mockLastRiveViewProps?.onError;
    expect(onError).toBeDefined();

    act(() => {
      onError?.({
        message: 'failed to load',
        type: RiveErrorType.MalformedFile,
      });
    });

    expect(onRiveError).toHaveBeenCalledTimes(1);
  });

  it('does not throw when the Rive animation errors and onRiveError is omitted', () => {
    const { getByTestId } = render(
      <CardWelcomeCardsAnimation animate style={style} />,
    );

    const onError = mockLastRiveViewProps?.onError;
    expect(onError).toBeDefined();

    expect(() => {
      act(() => {
        onError?.({
          message: 'failed to load',
          type: RiveErrorType.MalformedFile,
        });
      });
    }).not.toThrow();

    expect(getByTestId(CardWelcomeSelectors.CARD_IMAGE)).toBeOnTheScreen();
  });
});
