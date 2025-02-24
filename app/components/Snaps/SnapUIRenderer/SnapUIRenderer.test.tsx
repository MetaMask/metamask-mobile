import React from 'react';
import {
  Box,
  Text,
  Container,
  Footer,
  Button,
  Input,
  JSXElement,
} from '@metamask/snaps-sdk/jsx';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { SnapUIRenderer } from './SnapUIRenderer';
import Engine from '../../../core/Engine/Engine';
import { RootState } from '../../../reducers';
import { FormState } from '@metamask/snaps-sdk';
import { PayloadAction } from '@reduxjs/toolkit';

jest.mock('../../../core/Engine/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
  context: {
    SnapInterfaceController: {
      updateInterfaceState: jest.fn(),
    },
  },
}));

const mockEngine = jest.mocked(Engine);

const MOCK_SNAP_ID = 'npm:@metamask/test-snap-bip44';
const MOCK_INTERFACE_ID = 'interfaceId';

const noOp = () => {
  // no-op
};

function renderInterface(
  content: JSXElement | null,
  { useFooter = false, onCancel = noOp, state = {} } = {},
) {
  const storeState = {
    engine: {
      backgroundState: {
        SubjectMetadataController: {
          subjectMetadata: {
            'npm:@metamask/test-snap-bip44': {
              name: '@metamask/test-snap-bip44',
              version: '1.2.3',
              subjectType: 'snap',
            },
          },
        },
        SnapController: {
          snaps: {
            [MOCK_SNAP_ID]: {
              id: 'npm:@metamask/test-snap-bip44',
              origin: 'npm:@metamask/test-snap-bip44',
              version: '5.1.2',
              iconUrl: null,
              initialPermissions: {
                'endowment:ethereum-provider': {},
              },
              manifest: {
                description: 'An example Snap that signs messages using BLS.',
                proposedName: 'BIP-44 Test Snap',
                repository: {
                  type: 'git',
                  url: 'https://github.com/MetaMask/test-snaps.git',
                },
                source: {
                  location: {
                    npm: {
                      filePath: 'dist/bundle.js',
                      packageName: '@metamask/test-snap-bip44',
                      registry: 'https://registry.npmjs.org',
                    },
                  },
                  shasum: 'L1k+dT9Q+y3KfIqzaH09MpDZVPS9ZowEh9w01ZMTWMU=',
                },
                version: '5.1.2',
              },
              versionHistory: [
                {
                  date: 1680686075921,
                  origin: 'https://metamask.github.io',
                  version: '5.1.2',
                },
              ],
            },
          },
        },
        SnapInterfaceController: {
          interfaces: {
            [MOCK_INTERFACE_ID]: {
              snapId: MOCK_SNAP_ID,
              content,
              state,
              context: null,
              contentType: null,
            },
          },
        },
      },
    },
  };

  const result = renderWithProvider(
    <SnapUIRenderer
      snapId={MOCK_SNAP_ID}
      interfaceId={MOCK_INTERFACE_ID}
      useFooter={useFooter}
      onCancel={onCancel}
      PERF_DEBUG
    />,
    { state: storeState as unknown as RootState },
  );

  const reducer = (
    reducerState: RootState,
    action: PayloadAction<{ content: JSXElement; state: FormState }>,
  ) => {
    if (action.type === 'updateInterface') {
      return {
        engine: {
          backgroundState: {
            ...reducerState.engine.backgroundState,
            SnapInterfaceController: {
              interfaces: {
                [MOCK_INTERFACE_ID]: {
                  snapId: MOCK_SNAP_ID,
                  content: action.payload.content,
                  state: action.payload.state ?? state,
                  context: null,
                  contentType: null,
                },
              },
            },
          },
        },
      };
    }
    return reducerState;
  };

  const { store } = result;

  // @ts-expect-error Mock reducer doesn't fully match the type.
  store.replaceReducer(reducer);

  const updateInterface = (
    newContent: JSXElement,
    newState: FormState | null = null,
  ) => {
    store.dispatch({
      type: 'updateInterface',
      payload: {
        content: newContent,
        state: newState,
      },
    });
  };

  const getRenderCount = () =>
    parseInt(result.getByTestId('performance').props['data-renders'], 10);

  return { ...result, updateInterface, getRenderCount };
}

describe('SnapUIRenderer', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders loading state', () => {
    const { toJSON } = renderInterface(null);

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders basic UI', () => {
    const { toJSON, getByText, getRenderCount } = renderInterface(
      Box({ children: Text({ children: 'Hello world!' }) }),
    );

    expect(getByText('Hello world!')).toBeDefined();
    expect(getRenderCount()).toBe(1);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders footers', () => {
    const { toJSON, getByText } = renderInterface(
      Container({
        children: [
          Box({ children: Text({ children: 'Hello world!' }) }),
          Footer({ children: Button({ children: 'Foo' }) }),
        ],
      }),
      { useFooter: true },
    );

    expect(getByText('Foo')).toBeDefined();
    expect(toJSON()).toMatchSnapshot();
  });

  it('supports the onCancel prop', () => {
    const onCancel = jest.fn();
    const { toJSON, getByText } = renderInterface(
      Container({
        children: [
          Box({ children: Text({ children: 'Hello world!' }) }),
          Footer({ children: Button({ children: 'Foo' }) }),
        ],
      }),
      { useFooter: true, onCancel },
    );

    const button = getByText('Cancel');
    expect(button).toBeDefined();
    expect(toJSON()).toMatchSnapshot();

    fireEvent.press(button);
    expect(onCancel).toHaveBeenCalled();
  });

  it('supports interactive inputs', () => {
    const { toJSON, getByTestId } = renderInterface(
      Box({ children: Input({ name: 'input' }) }),
    );

    const input = getByTestId('input');
    fireEvent.changeText(input, 'a');

    expect(
      mockEngine.context.SnapInterfaceController.updateInterfaceState,
    ).toHaveBeenNthCalledWith(1, MOCK_INTERFACE_ID, { input: 'a' });

    expect(mockEngine.controllerMessenger.call).toHaveBeenNthCalledWith(
      1,
      'SnapController:handleRequest',
      {
        handler: 'onUserInput',
        origin: '',
        request: {
          jsonrpc: '2.0',
          method: ' ',
          params: {
            context: null,
            event: { name: 'input', type: 'InputChangeEvent', value: 'a' },
            id: MOCK_INTERFACE_ID,
          },
        },
        snapId: MOCK_SNAP_ID,
      },
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('prefills interactive inputs with existing state', () => {
    const { toJSON, getByTestId } = renderInterface(
      Box({ children: Input({ name: 'input' }) }),
      { state: { input: 'bar' } },
    );

    const input = getByTestId('input');
    expect(input).toBeDefined();
    expect(input.props.value).toStrictEqual('bar');

    expect(toJSON()).toMatchSnapshot();
  });

  it('re-renders when the interface changes', () => {
    const { toJSON, getAllByTestId, updateInterface, getRenderCount } =
      renderInterface(Box({ children: Input({ name: 'input' }) }));

    const inputs = getAllByTestId('input');
    expect(inputs).toHaveLength(1);

    updateInterface(
      Box({ children: [Input({ name: 'input' }), Input({ name: 'input2' })] }),
    );

    const inputsAfterRerender = getAllByTestId('input');
    expect(inputsAfterRerender).toHaveLength(2);

    expect(getRenderCount()).toBe(2);

    expect(toJSON()).toMatchSnapshot();
  });

  it('re-syncs state when the interface changes', () => {
    const { toJSON, getAllByTestId, getRenderCount, updateInterface } =
      renderInterface(Box({ children: Input({ name: 'input' }) }));

    updateInterface(
      Box({ children: [Input({ name: 'input' }), Input({ name: 'input2' })] }),
      { input: 'bar', input2: 'foo' },
    );

    const inputsAfterRerender = getAllByTestId('input');
    expect(inputsAfterRerender[0].props.value).toStrictEqual('bar');
    expect(inputsAfterRerender[1].props.value).toStrictEqual('foo');

    expect(getRenderCount()).toBe(2);

    expect(toJSON()).toMatchSnapshot();
  });
});
