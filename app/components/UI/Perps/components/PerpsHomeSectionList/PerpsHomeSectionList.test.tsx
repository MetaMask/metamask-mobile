import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import PerpsHomeSectionList from './PerpsHomeSectionList';

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const { View } = jest.requireActual('react-native');
  return {
    ...actual,
    SectionDivider: ({ testID }: { testID?: string }) => (
      <View testID={testID} />
    ),
  };
});

describe('PerpsHomeSectionList', () => {
  it('renders a divider before every visible section, including the first', () => {
    render(
      <PerpsHomeSectionList
        sections={[
          { key: 'positions', visible: true, content: <Text>Positions</Text> },
          { key: 'orders', visible: true, content: <Text>Orders</Text> },
        ]}
      />,
    );

    expect(screen.getByText('Positions')).toBeOnTheScreen();
    expect(screen.getByText('Orders')).toBeOnTheScreen();
    expect(screen.getAllByTestId('perps-home-section-divider')).toHaveLength(2);
  });

  it('skips hidden sections and their dividers', () => {
    render(
      <PerpsHomeSectionList
        sections={[
          { key: 'positions', visible: false, content: <Text>Positions</Text> },
          {
            key: 'whats-happening',
            visible: true,
            content: <Text>Whats Happening</Text>,
          },
        ]}
      />,
    );

    expect(screen.queryByText('Positions')).toBeNull();
    expect(screen.getByText('Whats Happening')).toBeOnTheScreen();
    expect(screen.getAllByTestId('perps-home-section-divider')).toHaveLength(1);
  });

  it('renders no sections when all are hidden', () => {
    render(
      <PerpsHomeSectionList
        sections={[
          { key: 'positions', visible: false, content: <Text>Positions</Text> },
        ]}
      />,
    );

    expect(screen.queryByTestId('perps-home-section-divider')).toBeNull();
    expect(screen.queryByText('Positions')).toBeNull();
  });
});
