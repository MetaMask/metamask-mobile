import React from 'react';
import { Text } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import CollapsibleReveal from './CollapsibleReveal';

describe('CollapsibleReveal', () => {
  it('snaps initially expanded content into view without unmounting', () => {
    render(
      <CollapsibleReveal expanded snapExpandedOnMount testID="reveal">
        <Text testID="reveal-child">content</Text>
      </CollapsibleReveal>,
    );

    expect(screen.getByTestId('reveal')).toBeOnTheScreen();
    expect(screen.getByTestId('reveal-child')).toBeOnTheScreen();
    expect(screen.getByTestId('reveal-content').props.pointerEvents).toBe(
      'auto',
    );
  });

  it('disables pointer events while collapsed and kept mounted', () => {
    render(
      <CollapsibleReveal
        expanded={false}
        snapExpandedOnMount={false}
        unmountWhenCollapsed={false}
        testID="reveal"
      >
        <Text testID="reveal-child">content</Text>
      </CollapsibleReveal>,
    );

    expect(screen.getByTestId('reveal-child')).toBeOnTheScreen();
    expect(screen.getByTestId('reveal-content').props.pointerEvents).toBe(
      'none',
    );
  });

  it('unmounts when collapsed with unmountWhenCollapsed', () => {
    render(
      <CollapsibleReveal
        expanded={false}
        snapExpandedOnMount={false}
        unmountWhenCollapsed
        testID="reveal"
      >
        <Text testID="reveal-child">content</Text>
      </CollapsibleReveal>,
    );

    expect(screen.queryByTestId('reveal')).toBeNull();
    expect(screen.queryByTestId('reveal-child')).toBeNull();
  });

  it('collapses before natural onLayout when expanded flips to false', () => {
    const { rerender } = render(
      <CollapsibleReveal
        expanded
        snapExpandedOnMount
        unmountWhenCollapsed={false}
        testID="reveal"
      >
        <Text testID="reveal-child">content</Text>
      </CollapsibleReveal>,
    );

    expect(screen.getByTestId('reveal').props.onLayout).toBeDefined();
    expect(screen.getByTestId('reveal-content').props.onLayout).toBeUndefined();

    rerender(
      <CollapsibleReveal
        expanded={false}
        snapExpandedOnMount
        unmountWhenCollapsed={false}
        testID="reveal"
      >
        <Text testID="reveal-child">content</Text>
      </CollapsibleReveal>,
    );

    expect(screen.getByTestId('reveal').props.onLayout).toBeUndefined();
    expect(screen.getByTestId('reveal-content').props.onLayout).toBeDefined();
    expect(screen.getByTestId('reveal-content').props.pointerEvents).toBe(
      'none',
    );
  });
});
