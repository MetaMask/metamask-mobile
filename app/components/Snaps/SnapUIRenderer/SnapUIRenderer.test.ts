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
    const { queryByTestId } = renderInterface(null);

    expect(queryByTestId('snap-ui-renderer__scrollview')).toBeNull();
  });

  it('renders basic UI', () => {
    const { getByText, getRenderCount } = renderInterface(
      Box({ children: Text({ children: 'Hello world!' }) }),
    );

    expect(getByText('Hello world!')).toBeOnTheScreen();
    expect(getRenderCount()).toBe(1);
  });

  it('renders footers', () => {
    const { getByText } = renderInterface(
      Container({
        children: [
          Box({ children: Text({ children: 'Hello world!' }) }),
          Footer({ children: Button({ children: 'Foo' }) }),
        ],
      }),
      { useFooter: true },
    );

    expect(getByText('Foo')).toBeOnTheScreen();
  });

  it('adds a footer if required', () => {
    const { getByText } = renderInterface(
      Container({
        children: Box({ children: Text({ children: 'Hello world!' }) }),
      }),
      { useFooter: true },
    );

    expect(getByText('Close')).toBeOnTheScreen();
  });

  it('supports the onCancel prop', () => {
    const onCancel = jest.fn();
    const { getByText } = renderInterface(
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

    fireEvent.press(button);
    expect(onCancel).toHaveBeenCalled();
  });

  it('supports interactive inputs', () => {
    const { getByTestId } = renderInterface(
      Box({ children: Input({ name: 'input' }) }),
    );

    const input = getByTestId('input-snap-ui-input');
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
  });

  it('prefills interactive inputs with existing state', () => {
    const { getByTestId } = renderInterface(
      Box({ children: Input({ name: 'input' }) }),
      { state: { input: 'bar' } },
    );

    const input = getByTestId('input-snap-ui-input');
    expect(input).toBeDefined();
    expect(input.props.value).toStrictEqual('bar');
  });

  it('re-renders when the interface changes', () => {
    const { getByTestId, updateInterface, getRenderCount } = renderInterface(
      Box({ children: Input({ name: 'input', type: 'number' }) }),
    );

    const inputs = getByTestId('input-snap-ui-input');
    expect(inputs).toBeTruthy();

    updateInterface(
      Box({
        children: [
          Input({ name: 'input', type: 'number' }),
          Input({ name: 'input2', type: 'password' }),
        ],
      }),
    );

    expect(getByTestId('input-snap-ui-input')).toBeOnTheScreen();
    expect(getByTestId('input2-snap-ui-input')).toBeOnTheScreen();

    expect(getRenderCount()).toBe(2);
  });

  it('re-syncs state when the interface changes', () => {
    const { getByTestId, getRenderCount, updateInterface } = renderInterface(
      Box({ children: Input({ name: 'input' }) }),
    );

    updateInterface(
      Box({ children: [Input({ name: 'input' }), Input({ name: 'input2' })] }),
      { input: 'bar', input2: 'foo' },
    );
    const input1AfterRerender = getByTestId('input-snap-ui-input');
    const input2AfterRerender = getByTestId('input2-snap-ui-input');
    expect(input1AfterRerender).toBeDefined();
    expect(input2AfterRerender).toBeDefined();
    expect(input1AfterRerender.props.value).toStrictEqual('bar');
    expect(input2AfterRerender.props.value).toStrictEqual('foo');
    expect(getRenderCount()).toBe(2);
  });

  it('supports fields with multiple components', () => {
    const { getByText, getByTestId } = renderInterface(
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

    expect(getByText('My Input')).toBeOnTheScreen();
    expect(getByTestId('input-snap-ui-input')).toBeOnTheScreen();
    expect(getByText('Submit')).toBeOnTheScreen();
  });

  it('renders complex nested components', () => {
    const { getByText, getRenderCount } = renderInterface(
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
    expect(getByText('CardTitle')).toBeOnTheScreen();
    expect(getByText('Foo')).toBeOnTheScreen();
  });
});
