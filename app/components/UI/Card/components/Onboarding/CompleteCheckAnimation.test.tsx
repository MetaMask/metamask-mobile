import React from 'react';
import { act, render } from '@testing-library/react-native';
import { Alignment, Fit, RiveErrorType } from '@rive-app/react-native';
import CompleteCheckAnimation from './CompleteCheckAnimation';
import { CompleteSelectors } from './Complete.testIds';
import { __resetRiveMocks } from '../../../../../__mocks__/rive-app-react-native';

interface MockRiveViewProps {
  testID?: string;
  artboardName?: string;
  stateMachineName?: string;
  autoPlay?: boolean;
  fit?: Fit;
  alignment?: Alignment;
  onError?: (error: { message: string; type: RiveErrorType }) => void;
}

// Override the shared Rive mock so tests can drive the file-load result and
// the native view's readiness, which gates the entrance signal.
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
    return MockReact.createElement(View, { testID: props.testID });
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

jest.mock('../../../../../animations/card_verified_check.riv', () => 1, {
  virtual: true,
});

jest.mock('../../../KYC/components/Illustration', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    KycIllustrationSource: { checkmark: 'checkmark' },
    default: () =>
      ReactActual.createElement(View, { testID: 'vba-illustration' }),
  };
});

describe('CompleteCheckAnimation', () => {
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

  it('plays the tick through the authored artboard and state machine', () => {
    const { getByTestId, queryByTestId } = render(
      <CompleteCheckAnimation mode="animate" />,
    );

    expect(getByTestId(CompleteSelectors.CHECK_ANIMATION)).toBeOnTheScreen();
    expect(queryByTestId(CompleteSelectors.CHECK_IMAGE)).not.toBeOnTheScreen();
    expect(mockLastRiveViewProps).toEqual(
      expect.objectContaining({
        artboardName: 'Check',
        stateMachineName: 'State Machine 1',
        autoPlay: true,
        fit: Fit.Contain,
        alignment: Alignment.Center,
      }),
    );
  });

  it('shows the static checkmark in static mode', () => {
    const onEntranceStart = jest.fn();
    const { getByTestId, queryByTestId } = render(
      <CompleteCheckAnimation
        mode="static"
        onEntranceStart={onEntranceStart}
      />,
    );

    expect(getByTestId(CompleteSelectors.CHECK_IMAGE)).toBeOnTheScreen();
    expect(
      queryByTestId(CompleteSelectors.CHECK_ANIMATION),
    ).not.toBeOnTheScreen();
    expect(onEntranceStart).not.toHaveBeenCalled();
  });

  it('renders neither the tick nor the checkmark while pending', () => {
    const { queryByTestId } = render(<CompleteCheckAnimation mode="pending" />);

    expect(
      queryByTestId(CompleteSelectors.CHECK_ANIMATION),
    ).not.toBeOnTheScreen();
    expect(queryByTestId(CompleteSelectors.CHECK_IMAGE)).not.toBeOnTheScreen();
  });

  it('reports the entrance start once the file is loaded and the view is ready', () => {
    const onEntranceStart = jest.fn();
    mockViewReady = false;

    const { rerender } = render(
      <CompleteCheckAnimation
        mode="animate"
        onEntranceStart={onEntranceStart}
      />,
    );
    expect(onEntranceStart).not.toHaveBeenCalled();

    mockViewReady = true;
    rerender(
      <CompleteCheckAnimation
        mode="animate"
        onEntranceStart={onEntranceStart}
      />,
    );
    rerender(
      <CompleteCheckAnimation
        mode="animate"
        onEntranceStart={onEntranceStart}
      />,
    );

    expect(onEntranceStart).toHaveBeenCalledTimes(1);
  });

  it('falls back to the static checkmark and reports when the file fails to load', () => {
    const onRiveError = jest.fn();
    mockRiveFileResult = {
      riveFile: null,
      isLoading: false,
      error: new Error('malformed file'),
    };

    const { getByTestId } = render(
      <CompleteCheckAnimation mode="animate" onRiveError={onRiveError} />,
    );

    expect(getByTestId(CompleteSelectors.CHECK_IMAGE)).toBeOnTheScreen();
    expect(onRiveError).toHaveBeenCalledTimes(1);
  });

  it('falls back to the static checkmark when the Rive view errors', () => {
    const onRiveError = jest.fn();
    const { getByTestId, queryByTestId } = render(
      <CompleteCheckAnimation mode="animate" onRiveError={onRiveError} />,
    );

    act(() => {
      mockLastRiveViewProps?.onError?.({
        message: 'bad artboard',
        type: RiveErrorType.IncorrectArtboardName,
      });
    });

    expect(getByTestId(CompleteSelectors.CHECK_IMAGE)).toBeOnTheScreen();
    expect(
      queryByTestId(CompleteSelectors.CHECK_ANIMATION),
    ).not.toBeOnTheScreen();
    expect(onRiveError).toHaveBeenCalledTimes(1);
  });
});
