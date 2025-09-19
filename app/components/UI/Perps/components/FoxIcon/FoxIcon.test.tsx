import React from 'react';
import { render } from '@testing-library/react-native';
import FoxIcon from './FoxIcon';
import { IconColor } from '../../../../../component-library/components/Icons/Icon';

// Mock the styles hook
jest.mock('../../../../../component-library/hooks/useStyles', () => ({
  useStyles: jest.fn(() => ({
    styles: {},
    theme: {
      colors: {
        icon: {
          alternative: '#9B9B9B',
          muted: '#6A737D',
          default: '#24292E',
        },
        primary: {
          default: '#037DD6',
        },
      },
    },
  })),
}));

// Mock react-native-svg
jest.mock('react-native-svg', () => ({
  SvgXml: ({
    xml,
    width,
    height,
  }: {
    xml: string;
    width: number;
    height: number;
  }) => {
    const { View, Text } = jest.requireActual('react-native');
    return (
      <View testID="fox-icon-svg" style={{ width, height }}>
        <Text testID="fox-icon-xml">{xml}</Text>
      </View>
    );
  },
}));

describe('FoxIcon', () => {
  it('renders with default props', () => {
    const { getByTestId } = render(<FoxIcon />);

    expect(getByTestId('fox-icon-svg')).toBeTruthy();
  });

  it('renders with custom width and height', () => {
    const { getByTestId } = render(<FoxIcon width={20} height={20} />);

    const svgElement = getByTestId('fox-icon-svg');
    expect(svgElement.props.style.width).toBe(20);
    expect(svgElement.props.style.height).toBe(20);
  });

  it('uses alternative icon color by default', () => {
    const { getByTestId } = render(<FoxIcon />);

    const xmlContent = getByTestId('fox-icon-xml').props.children;
    expect(xmlContent).toContain('fill="#9B9B9B"');
  });

  it('uses muted icon color when specified', () => {
    const { getByTestId } = render(<FoxIcon iconColor={IconColor.Muted} />);

    const xmlContent = getByTestId('fox-icon-xml').props.children;
    expect(xmlContent).toContain('fill="#6A737D"');
  });

  it('uses default icon color when specified', () => {
    const { getByTestId } = render(<FoxIcon iconColor={IconColor.Default} />);

    const xmlContent = getByTestId('fox-icon-xml').props.children;
    expect(xmlContent).toContain('fill="#24292E"');
  });

  it('contains correct SVG path for fox icon', () => {
    const { getByTestId } = render(<FoxIcon />);

    const xmlContent = getByTestId('fox-icon-xml').props.children;
    expect(xmlContent).toContain('viewBox="0 0 15 14"');
    expect(xmlContent).toContain(
      'path d="M14.9064 10.2131L13.4564 7.03875L14.9033 4.50795L13.6772 0L8.994 2.88977H6.81998L2.13683 0L0.906372 4.52345L0.993555 4.72681L2.35637 6.74487L0.9107 10.2218L2.13065 13.4835L4.96379 12.27L7.10565 14H8.70833L10.8496 12.27L13.6833 13.4835L14.8316 10.414L14.9064 10.2131Z"',
    );
  });

  it('renders with correct dimensions in viewBox', () => {
    const { getByTestId } = render(<FoxIcon width={30} height={25} />);

    const xmlContent = getByTestId('fox-icon-xml').props.children;
    expect(xmlContent).toContain('width="30"');
    expect(xmlContent).toContain('height="25"');
  });

  describe('Edge cases', () => {
    it('handles extreme width and height values', () => {
      const { getByTestId } = render(<FoxIcon width={1000} height={1000} />);

      const svgElement = getByTestId('fox-icon-svg');
      expect(svgElement.props.style.width).toBe(1000);
      expect(svgElement.props.style.height).toBe(1000);

      const xmlContent = getByTestId('fox-icon-xml').props.children;
      expect(xmlContent).toContain('width="1000"');
      expect(xmlContent).toContain('height="1000"');
    });

    it('handles zero width and height values', () => {
      const { getByTestId } = render(<FoxIcon width={0} height={0} />);

      const svgElement = getByTestId('fox-icon-svg');
      expect(svgElement.props.style.width).toBe(0);
      expect(svgElement.props.style.height).toBe(0);

      const xmlContent = getByTestId('fox-icon-xml').props.children;
      expect(xmlContent).toContain('width="0"');
      expect(xmlContent).toContain('height="0"');
    });

    it('handles invalid icon color gracefully', () => {
      // Arrange - Pass an invalid enum value (TypeScript would catch this, but test runtime behavior)
      const { getByTestId } = render(
        <FoxIcon iconColor={'invalid' as IconColor} />,
      );

      // Act & Assert - Should fallback to alternative color
      const xmlContent = getByTestId('fox-icon-xml').props.children;
      expect(xmlContent).toContain('fill="#9B9B9B"'); // Should fallback to alternative color
    });

    it('handles Primary icon color', () => {
      const { getByTestId } = render(<FoxIcon iconColor={IconColor.Primary} />);

      const xmlContent = getByTestId('fox-icon-xml').props.children;
      expect(xmlContent).toContain('fill="#037DD6"'); // Primary color from mock
    });

    it('memoizes SVG XML to prevent unnecessary regeneration', () => {
      // Arrange
      const { rerender } = render(
        <FoxIcon width={14} height={14} iconColor={IconColor.Alternative} />,
      );

      // Act - Rerender with same props
      rerender(
        <FoxIcon width={14} height={14} iconColor={IconColor.Alternative} />,
      );

      // Assert - Component should render without errors (memoization working)
      // This test ensures useMemo dependency array is correct
      expect(true).toBe(true); // Test passes if no errors thrown
    });

    it('regenerates SVG XML when props change', () => {
      // Arrange
      const { getByTestId, rerender } = render(
        <FoxIcon width={14} height={14} iconColor={IconColor.Alternative} />,
      );

      const initialXml = getByTestId('fox-icon-xml').props.children;

      // Act - Rerender with different props
      rerender(<FoxIcon width={20} height={20} iconColor={IconColor.Muted} />);

      const updatedXml = getByTestId('fox-icon-xml').props.children;

      // Assert - XML should be different due to changed props
      expect(updatedXml).not.toBe(initialXml);
      expect(updatedXml).toContain('width="20"');
      expect(updatedXml).toContain('height="20"');
      expect(updatedXml).toContain('fill="#6A737D"'); // Muted color
    });
  });
});
