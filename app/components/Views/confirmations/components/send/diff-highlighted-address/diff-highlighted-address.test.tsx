import React from 'react';
import { render } from '@testing-library/react-native';
import { FontWeight, TextColor } from '@metamask/design-system-react-native';
import { DiffHighlightedAddress } from './diff-highlighted-address';

jest.mock('@metamask/design-system-react-native', () => {
  const { Text: RNText, View: RNView } = jest.requireActual('react-native');

  return {
    Box: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => (
      <RNView {...props}>{children}</RNView>
    ),
    Text: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => (
      <RNText {...props}>{children}</RNText>
    ),
    FontWeight: {
      Bold: 'bold',
      Medium: 'medium',
    },
    TextColor: {
      ErrorDefault: 'error-default',
      SuccessDefault: 'success-default',
      TextAlternative: 'text-alternative',
    },
    TextVariant: {
      BodySm: 'body-sm',
    },
  };
});

describe('DiffHighlightedAddress', () => {
  it('renders consecutive address differences with default warning styles', () => {
    const { getByText } = render(
      <DiffHighlightedAddress
        address="0x123456"
        diffIndices={[3, 4, 7]}
        label="Entered address"
        dotTwColor="bg-error-default"
      />,
    );

    const firstDiffSegment = getByText('23');
    const secondDiffSegment = getByText('6');

    expect(getByText('Entered address')).toBeOnTheScreen();
    expect(getByText('0x1')).toBeOnTheScreen();
    expect(getByText('45')).toBeOnTheScreen();
    expect(firstDiffSegment.props.color).toBe(TextColor.ErrorDefault);
    expect(firstDiffSegment.props.fontWeight).toBe(FontWeight.Bold);
    expect(firstDiffSegment.props.twClassName).toBe('bg-error-muted');
    expect(secondDiffSegment.props.color).toBe(TextColor.ErrorDefault);
  });

  it('renders custom styles for address differences', () => {
    const { getByText } = render(
      <DiffHighlightedAddress
        address="0xabcdef"
        diffIndices={[2, 3]}
        label="Known address"
        dotTwColor="bg-success-default"
        highlightTwColor="bg-success-muted"
        diffTextColor={TextColor.SuccessDefault}
      />,
    );

    const diffSegment = getByText('ab');

    expect(getByText('Known address')).toBeOnTheScreen();
    expect(diffSegment.props.color).toBe(TextColor.SuccessDefault);
    expect(diffSegment.props.fontWeight).toBe(FontWeight.Bold);
    expect(diffSegment.props.twClassName).toBe('bg-success-muted');
  });
});
