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
    const component = renderInterface(null);

    expect(component).toMatchSnapshot();
  });

  it('renders basic UI', () => {
    const component = renderInterface(
      Box({ children: Text({ children: 'Hello world!' }) }),
    );
    const { getByText, getRenderCount } = component;

    expect(getByText('Hello world!')).toBeDefined();
    expect(getRenderCount()).toBe(1);
    expect(component).toMatchSnapshot();
  });

  it('renders footers', () => {
    const component = renderInterface(
      Container({
        children: [
          Box({ children: Text({ children: 'Hello world!' }) }),
          Footer({ children: Button({ children: 'Foo' }) }),
        ],
      }),
      { useFooter: true },
    );
    const { getByText } = component;

    expect(getByText('Foo')).toBeDefined();
    expect(component).toMatchSnapshot();
  });

  it('adds a footer if required', () => {
    const component = renderInterface(
      Container({
        children: Box({ children: Text({ children: 'Hello world!' }) }),
      }),
      { useFooter: true },
    );
    const { getByText } = component;

    expect(getByText('Close')).toBeDefined();
    expect(component).toMatchSnapshot();
  });

  it('supports the onCancel prop', () => {
    const onCancel = jest.fn();
    const component = renderInterface(
      Container({
        children: [
          Box({ children: Text({ children: 'Hello world!' }) }),
          Footer({ children: Button({ children: 'Foo' }) }),
        ],
      }),
      { useFooter: true, onCancel },
    );
    const { getByText } = component;

    const button = getByText('Cancel');
    expect(button).toBeDefined();
    expect(component).toMatchSnapshot();

    fireEvent.press(button);
    expect(onCancel).toHaveBeenCalled();
  });

  it('supports interactive inputs', () => {
    const component = renderInterface(
      Box({ children: Input({ name: 'input' }) }),
    );
    const { getByTestId } = component;

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

    expect(component).toMatchSnapshot();
  });

  it('prefills interactive inputs with existing state', () => {
    const component = renderInterface(
      Box({ children: Input({ name: 'input' }) }),
      { state: { input: 'bar' } },
    );
    const { getByTestId } = component;

    const input = getByTestId('input-snap-ui-input');
    expect(input).toBeDefined();
    expect(input.props.value).toStrictEqual('bar');

    expect(component).toMatchSnapshot();
  });

  it('re-renders when the interface changes', () => {
    const component = renderInterface(
        Box({ children: Input({ name: 'input', type: 'number' }) }),
      );
    const { getByTestId, updateInterface, getRenderCount } = component;

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

    expect(getByTestId('input-snap-ui-input')).toBeDefined();
    expect(getByTestId('input2-snap-ui-input')).toBeDefined();

    expect(getRenderCount()).toBe(2);

    expect(component).toMatchSnapshot();
  });

  it('re-syncs state when the interface changes', () => {
    const component = renderInterface(Box({ children: Input({ name: 'input' }) }));
    const { getByTestId, getRenderCount, updateInterface } = component;

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

    expect(component).toMatchSnapshot();
  });

  it('supports fields with multiple components', () => {
    const component = renderInterface(
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

    expect(component).toMatchSnapshot();
  });

  it('renders complex nested components', () => {
    const component = renderInterface(
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
    const { getRenderCount } = component;

    expect(getRenderCount()).toBe(1);

    expect(component).toMatchSnapshot();
  });
});
