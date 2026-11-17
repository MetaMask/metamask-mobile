import React from 'react';
import { act, render, screen } from '@testing-library/react-native';
import {
  RiveErrorType,
  __fireRiveViewError,
  __resetRiveMocks,
} from '../../../../__mocks__/rive-app-react-native';
import Logger from '../../../../util/Logger';
import VerifiedCheckAnimation from './VerifiedCheckAnimation';
import { VerifiedCheckAnimationSelectors } from './VerifiedCheckAnimation.testIds';

const mockUseRiveFile = jest.fn();
const mockRiveView = jest.fn();
let mockViewReady = true;

jest.mock('@rive-app/react-native', () => {
  const ReactActual = jest.requireActual('react');
  const actual = jest.requireActual(
    '../../../../__mocks__/rive-app-react-native',
  );
  return {
    ...actual,
    useRiveFile: (...args: unknown[]) => mockUseRiveFile(...args),
    useRive: () => ({
      riveViewRef: mockViewReady ? { ready: true } : null,
      setHybridRef: { f: jest.fn() },
    }),
    RiveView: (props: Record<string, unknown>) => {
      mockRiveView(props);
      return ReactActual.createElement(actual.RiveView, props);
    },
  };
});

jest.mock(
  '../../../../animations/card_verified_check.riv',
  () => 'verified-check',
);

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: { log: jest.fn(), error: jest.fn() },
}));

const loadedFile = { riveFile: { __mockRiveFile: true }, error: null };

describe('VerifiedCheckAnimation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetRiveMocks();
    mockViewReady = true;
    mockUseRiveFile.mockReturnValue(loadedFile);
  });

  it('plays the Check artboard and starts the entrance', () => {
    const onEntranceStart = jest.fn();

    render(
      <VerifiedCheckAnimation
        mode="animate"
        onEntranceStart={onEntranceStart}
      />,
    );

    expect(mockRiveView).toHaveBeenCalledWith(
      expect.objectContaining({
        artboardName: 'Check',
        stateMachineName: 'State Machine 1',
        autoPlay: true,
        testID: VerifiedCheckAnimationSelectors.CHECK_ANIMATION,
      }),
    );
    expect(onEntranceStart).toHaveBeenCalled();
  });

  it('waits for the native view before starting the entrance', () => {
    mockViewReady = false;
    const onEntranceStart = jest.fn();
    const view = (
      <VerifiedCheckAnimation
        mode="animate"
        onEntranceStart={onEntranceStart}
      />
    );

    const { rerender } = render(view);

    expect(onEntranceStart).not.toHaveBeenCalled();

    mockViewReady = true;
    rerender(
      <VerifiedCheckAnimation
        mode="animate"
        onEntranceStart={onEntranceStart}
      />,
    );

    expect(onEntranceStart).toHaveBeenCalledTimes(1);
  });

  it('shows the static checkmark in static mode', () => {
    const onEntranceStart = jest.fn();

    render(
      <VerifiedCheckAnimation
        mode="static"
        onEntranceStart={onEntranceStart}
      />,
    );

    expect(
      screen.getByTestId(VerifiedCheckAnimationSelectors.CHECK_IMAGE),
    ).toBeOnTheScreen();
    expect(mockRiveView).not.toHaveBeenCalled();
    expect(onEntranceStart).not.toHaveBeenCalled();
  });

  it('keeps the slot empty while pending', () => {
    render(
      <VerifiedCheckAnimation mode="pending" onEntranceStart={jest.fn()} />,
    );

    expect(
      screen.queryByTestId(VerifiedCheckAnimationSelectors.CHECK_IMAGE),
    ).not.toBeOnTheScreen();
    expect(mockRiveView).not.toHaveBeenCalled();
  });

  it('falls back and starts the entrance when the file fails to load', () => {
    const onEntranceStart = jest.fn();
    mockUseRiveFile.mockReturnValue({
      riveFile: null,
      error: { message: 'malformed', type: RiveErrorType.MalformedFile },
    });

    render(
      <VerifiedCheckAnimation
        mode="animate"
        onEntranceStart={onEntranceStart}
      />,
    );

    expect(
      screen.getByTestId(VerifiedCheckAnimationSelectors.CHECK_IMAGE),
    ).toBeOnTheScreen();
    expect(onEntranceStart).toHaveBeenCalled();
  });

  it('falls back when the native view reports an error', () => {
    render(
      <VerifiedCheckAnimation mode="animate" onEntranceStart={jest.fn()} />,
    );

    act(() => {
      __fireRiveViewError({
        message: 'missing artboard',
        type: RiveErrorType.IncorrectArtboardName,
      });
    });

    expect(Logger.error).toHaveBeenCalled();
    expect(
      screen.getByTestId(VerifiedCheckAnimationSelectors.CHECK_IMAGE),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(VerifiedCheckAnimationSelectors.CHECK_ANIMATION),
    ).not.toBeOnTheScreen();
  });
});
