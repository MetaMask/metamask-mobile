import React from 'react';
import {
  Box,
  Text,
  Container,
  Footer,
  Button,
  Input,
  JSXElement,
  Form,
  Field,
  Checkbox,
  Section,
  Row,
  Value,
  Card,
  Image as ImageComponent,
  Selector,
  SelectorOption,
} from '@metamask/snaps-sdk/jsx';
import { fireEvent, act } from '@testing-library/react-native';
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
    act(() => {
      store.dispatch({
        type: 'updateInterface',
        payload: {
          content: newContent,
          state: newState,
        },
      });
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

  it('adds a footer if required', () => {
    const { toJSON, getByText } = renderInterface(
      Container({
        children: Box({ children: Text({ children: 'Hello world!' }) }),
      }),
      { useFooter: true },
    );

    expect(getByText('Close')).toBeDefined();
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
      renderInterface(
        Box({ children: Input({ name: 'input', type: 'number' }) }),
      );

    const inputs = getAllByTestId('input');
    expect(inputs).toHaveLength(1);

    updateInterface(
      Box({
        children: [
          Input({ name: 'input', type: 'number' }),
          Input({ name: 'input2', type: 'password' }),
        ],
      }),
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
    expect(inputsAfterRerender).toHaveLength(2);
    expect(inputsAfterRerender[0].props.value).toStrictEqual('bar');
    expect(inputsAfterRerender[1].props.value).toStrictEqual('foo');

    expect(getRenderCount()).toBe(2);

    expect(toJSON()).toMatchSnapshot();
  });

  it('supports forms with fields', () => {
    const { toJSON, getByTestId, getByText } = renderInterface(
      Box({
        children: Form({
          name: 'form',
          children: [
            Field({ label: 'My Input', children: Input({ name: 'input' }) }),
            Field({
              label: 'My Checkbox',
              children: Checkbox({
                name: 'checkbox',
                label: 'This is a checkbox',
              }),
            }),
            Field({
              label: 'My Selector',
              children: Selector({
                name: 'selector',
                title: 'Select an option',
                children: [
                  SelectorOption({
                    value: 'option1',
                    children: Card({
                      title: 'CardTitle1',
                      description: 'CardDescription1',
                      value: 'CardValue1',
                      extra: 'CardExtra1',
                    }),
                  }),
                  SelectorOption({
                    value: 'option2',
                    children: Card({
                      title: 'CardTitle2',
                      description: 'CardDescription2',
                      value: 'CardValue2',
                      extra: 'CardExtra2',
                    }),
                  }),
                ],
              }),
            }),
            Button({ type: 'submit', name: 'submit', children: 'Submit' }),
          ],
        }),
      }),
      { state: { form: { selector: 'option1' } } },
    );

    const input = getByTestId('input');
    fireEvent.changeText(input, 'abc');

    expect(
      mockEngine.context.SnapInterfaceController.updateInterfaceState,
    ).toHaveBeenNthCalledWith(1, MOCK_INTERFACE_ID, {
      form: { input: 'abc', selector: 'option1' },
    });

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
            event: { name: 'input', type: 'InputChangeEvent', value: 'abc' },
            id: MOCK_INTERFACE_ID,
          },
        },
        snapId: MOCK_SNAP_ID,
      },
    );

    const checkbox = getByText('This is a checkbox');
    fireEvent.press(checkbox);

    expect(
      mockEngine.context.SnapInterfaceController.updateInterfaceState,
    ).toHaveBeenNthCalledWith(2, MOCK_INTERFACE_ID, {
      form: { input: 'abc', checkbox: true, selector: 'option1' },
    });

    expect(mockEngine.controllerMessenger.call).toHaveBeenNthCalledWith(
      2,
      'SnapController:handleRequest',
      {
        handler: 'onUserInput',
        origin: '',
        request: {
          jsonrpc: '2.0',
          method: ' ',
          params: {
            context: null,
            event: { name: 'checkbox', type: 'InputChangeEvent', value: true },
            id: MOCK_INTERFACE_ID,
          },
        },
        snapId: MOCK_SNAP_ID,
      },
    );

    const selector = getByText('CardTitle1');
    fireEvent.press(selector);

    const selectorItem = getByText('CardTitle2');
    fireEvent.press(selectorItem);

    expect(
      mockEngine.context.SnapInterfaceController.updateInterfaceState,
    ).toHaveBeenNthCalledWith(3, MOCK_INTERFACE_ID, {
      form: { input: 'abc', checkbox: true, selector: 'option2' },
    });

    expect(mockEngine.controllerMessenger.call).toHaveBeenNthCalledWith(
      3,
      'SnapController:handleRequest',
      {
        handler: 'onUserInput',
        origin: '',
        request: {
          jsonrpc: '2.0',
          method: ' ',
          params: {
            context: null,
            event: {
              name: 'selector',
              type: 'InputChangeEvent',
              value: 'option2',
            },
            id: MOCK_INTERFACE_ID,
          },
        },
        snapId: MOCK_SNAP_ID,
      },
    );

    const button = getByText('Submit');
    fireEvent.press(button);

    expect(mockEngine.controllerMessenger.call).toHaveBeenNthCalledWith(
      4,
      'SnapController:handleRequest',
      {
        handler: 'onUserInput',
        origin: '',
        request: {
          jsonrpc: '2.0',
          method: ' ',
          params: {
            context: null,
            event: { name: 'submit', type: 'ButtonClickEvent' },
            id: MOCK_INTERFACE_ID,
          },
        },
        snapId: MOCK_SNAP_ID,
      },
    );

    expect(mockEngine.controllerMessenger.call).toHaveBeenNthCalledWith(
      5,
      'SnapController:handleRequest',
      {
        handler: 'onUserInput',
        origin: '',
        request: {
          jsonrpc: '2.0',
          method: ' ',
          params: {
            context: null,
            event: {
              name: 'form',
              type: 'FormSubmitEvent',
              value: {
                checkbox: true,
                input: 'abc',
                selector: 'option2',
              },
            },
            id: MOCK_INTERFACE_ID,
          },
        },
        snapId: MOCK_SNAP_ID,
      },
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('supports fields with multiple components', () => {
    const { toJSON } = renderInterface(
      Box({
        children: Form({
          name: 'form',
          children: [
            Field({
              label: 'My Input',
              children: [
                Box({ children: [ImageComponent({ src: '<svg height="32" width="32" />' })]}),
                Input({ name: 'input' }),
                Button({ type: 'submit', name: 'submit', children: 'Submit' }),
              ],
            }),
          ],
        }),
      }),
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders complex nested components', () => {
    const { toJSON, getRenderCount } = renderInterface(
      Container({
        children: [
          Box({
            children: [
              Section({
                children: [
                  Row({
                    label: 'Key',
                    children: Value({ value: 'Value', extra: 'Extra' }),
                  }),
                  Card({
                    image: '<svg />',
                    title: 'CardTitle',
                    description: 'CardDescription',
                    value: 'CardValue',
                    extra: 'CardExtra',
                  }),
                ],
              }),
            ],
          }),
          Footer({ children: Button({ children: 'Foo' }) }),
        ],
      }),
      { useFooter: true },
    );

    expect(getRenderCount()).toBe(1);

    expect(toJSON()).toMatchSnapshot();
  });
});
