import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import ExploreSectionList from './ExploreSectionList';

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
});
