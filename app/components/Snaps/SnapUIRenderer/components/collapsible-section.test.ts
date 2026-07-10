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
    const { getByText, queryByText } = renderInterface(
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

    expect(queryByText('Row 1')).not.toBeOnTheScreen();
    expect(queryByText('Foo')).not.toBeOnTheScreen();

    fireEvent.press(section);

    expect(getByText('Row 1')).toBeOnTheScreen();
    expect(getByText('Foo')).toBeOnTheScreen();
    expect(getByText('Row 2')).toBeOnTheScreen();
    expect(getByText('Bar')).toBeOnTheScreen();
  });
});
