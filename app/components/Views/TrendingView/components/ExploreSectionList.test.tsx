import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import ExploreSectionList from './ExploreSectionList';

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const { View } = jest.requireActual('react-native');
  return {
    ...actual,
    Box: ({
      twClassName,
      children,
      testID,
    }: {
      twClassName?: string;
      children: React.ReactNode;
      testID?: string;
    }) => (
      <View testID={testID} accessibilityLabel={twClassName}>
        {children}
      </View>
    ),
    SectionDivider: () => <View testID="section-divider-line" />,
  };
});

describe('ExploreSectionList', () => {
  it('does not render a divider before the first section', () => {
    render(
      <ExploreSectionList
        sections={[
          { key: 'first', content: <Text>First</Text> },
          { key: 'second', content: <Text>Second</Text> },
        ]}
      />,
    );

    expect(screen.getByText('First')).toBeOnTheScreen();
    expect(screen.getByText('Second')).toBeOnTheScreen();
    expect(screen.getAllByTestId('explore-section-divider')).toHaveLength(1);
  });

  it('renders no dividers for a single section', () => {
    render(
      <ExploreSectionList
        sections={[{ key: 'only', content: <Text>Only</Text> }]}
      />,
    );

    expect(screen.queryByTestId('explore-section-divider')).toBeNull();
  });

  it('applies pb-3 to non-vertical-list sections that are not last', () => {
    render(
      <ExploreSectionList
        sections={[
          {
            key: 'carousel',
            content: <Text>Carousel</Text>,
          },
          {
            key: 'list',
            isVerticalList: true,
            content: <Text>List</Text>,
          },
        ]}
      />,
    );

    expect(
      screen.getByTestId('explore-section-carousel').props.accessibilityLabel,
    ).toBe('pb-3');
    expect(
      screen.getByTestId('explore-section-list').props.accessibilityLabel,
    ).toBeUndefined();
  });

  it('does not apply pb-3 to the last section even when it is not a vertical list', () => {
    render(
      <ExploreSectionList
        sections={[
          {
            key: 'carousel',
            content: <Text>Carousel</Text>,
          },
          {
            key: 'predictions',
            content: <Text>Predictions</Text>,
          },
        ]}
      />,
    );

    expect(
      screen.getByTestId('explore-section-carousel').props.accessibilityLabel,
    ).toBe('pb-3');
    expect(
      screen.getByTestId('explore-section-predictions').props
        .accessibilityLabel,
    ).toBeUndefined();
  });
});
