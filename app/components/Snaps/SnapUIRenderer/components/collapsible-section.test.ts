import { CollapsibleSection, Row, Text } from '@metamask/snaps-sdk/jsx';
import { fireEvent } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import type {
  ReactTestRendererJSON,
  ReactTestRendererNode,
} from 'react-test-renderer';
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

type SnapshotNode = ReactTestRendererJSON | ReactTestRendererJSON[] | null;

const normalizeSvgMockStyles = (
  node: ReactTestRendererJSON,
): ReactTestRendererJSON => {
  node.children =
    node.children?.map((child): ReactTestRendererNode => {
      if (typeof child === 'string') {
        return child;
      }

      return normalizeSvgMockStyles(child);
    }) ?? null;

  if (node.type === 'SvgMock') {
    node.props.style = StyleSheet.flatten(node.props.style);
  }

  return node;
};

const normalizeSnapshot = (node: SnapshotNode): SnapshotNode => {
  if (node === null) {
    return null;
  }

  if (Array.isArray(node)) {
    return node.map(normalizeSvgMockStyles);
  }

  return normalizeSvgMockStyles(node);
};

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

    expect(normalizeSnapshot(toJSON())).toMatchSnapshot();
  });
});
