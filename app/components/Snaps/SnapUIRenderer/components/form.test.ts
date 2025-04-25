import { Box, Form, Input, Button, Field, Checkbox, Selector, SelectorOption, Card } from '@metamask/snaps-sdk/jsx';
import Engine from '../../../../core/Engine/Engine';
import { fireEvent } from '@testing-library/react-native';
import { MOCK_INTERFACE_ID, MOCK_SNAP_ID, renderInterface } from '../testUtils';

jest.mock('../../../../core/Engine/Engine', () => ({
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

describe('SnapUIForm', () => {
  it('will render', () => {
    const { toJSON, getByText } = renderInterface(
      Box({
        children: Form({
          name: 'form',
          children: [
            Input({ name: 'input' }),
            Button({ type: 'submit', name: 'submit', children: 'Submit' }),
          ],
        }),
      }),
    );

    expect(toJSON()).toMatchSnapshot();
    expect(getByText('Submit')).toBeTruthy();
  });

  it('will render with fields', () => {
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
        origin: 'metamask',
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
        origin: 'metamask',
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
        origin: 'metamask',
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
        origin: 'metamask',
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
        origin: 'metamask',
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
});
