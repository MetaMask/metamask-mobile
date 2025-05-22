import {
  Box,
  Text,
  Container,
  Footer,
  Button,
  Input,
  Form,
  Field,
  Section,
  Row,
  Value,
  Card,
  Image as ImageComponent,
} from '@metamask/snaps-sdk/jsx';
import { fireEvent } from '@testing-library/react-native';
import Engine from '../../../core/Engine/Engine';
import { renderInterface, MOCK_INTERFACE_ID, MOCK_SNAP_ID } from './testUtils';

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
        origin: 'metamask',
        request: {
          jsonrpc: '2.0',
          method: ' ',
          params: {
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

  it('supports fields with multiple components', () => {
    const { toJSON } = renderInterface(
      Box({
        children: Form({
          name: 'form',
          children: [
            Field({
              label: 'My Input',
              children: [
                Box({
                  children: [
                    ImageComponent({ src: '<svg height="32" width="32" />' }),
                  ],
                }),
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
