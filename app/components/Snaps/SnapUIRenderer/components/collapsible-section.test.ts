import { CollapsibleSection, Row, Text } from '@metamask/snaps-sdk/jsx';
import { fireEvent } from '@testing-library/react-native';
import { renderInterface } from '../testUtils';

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

describe('CollapsibleSection', () => {
  it('renders', () => {
    const { getByTestId } = renderInterface(
      CollapsibleSection({
        label: 'My Section',
        children: [
          Row({
            label: 'Row 1',
            children: Text({ children: 'Foo' }),
          }),
          Row({
            label: 'Row 2',
            children: Text({ children: 'Bar' }),
          }),
        ],
      }),
    );

    expect(getByTestId('snaps-ui-collapsible-section')).toBeDefined();
  });

  it('can expand', () => {
    const { toJSON, getByText } = renderInterface(
      CollapsibleSection({
        label: 'My Section',
        children: [
          Row({
            label: 'Row 1',
            children: Text({ children: 'Foo' }),
          }),
          Row({
            label: 'Row 2',
            children: Text({ children: 'Bar' }),
          }),
        ],
      }),
    );

    const section = getByText('My Section');

    fireEvent.press(section);

    expect(getByText('Row 1')).toBeDefined();

    expect(toJSON()).toMatchSnapshot();
  });
});
