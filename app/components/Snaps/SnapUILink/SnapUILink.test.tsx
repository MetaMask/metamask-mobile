import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Linking, Text, View } from 'react-native';
import { SnapUILink } from './SnapUILink';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(),
}));

describe('SnapUILink', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const validProps = {
    href: 'https://metamask.io',
    children: 'Visit MetaMask',
  };

  it('renders correctly with valid props', () => {
    const { UNSAFE_getByType, getByTestId } = render(
      <SnapUILink {...validProps} />,
    );

    const linkText = getByTestId('snaps-ui-link');
    const spacer = UNSAFE_getByType(View);
    const icon = UNSAFE_getByType(Icon);

    expect(linkText).toBeTruthy();
    expect(linkText.props.children[0]).toBe('Visit MetaMask');
    expect(spacer).toBeTruthy();
    expect(spacer.props.style).toEqual({ width: 4 });
    expect(linkText.props.accessibilityRole).toBe('link');
    expect(linkText.props.accessibilityHint).toBe(
      `Opens ${validProps.href} in your browser`,
    );
    expect(icon.props.name).toBe(IconName.Export);
    expect(icon.props.color).toBe(IconColor.Primary);
    expect(icon.props.size).toBe(IconSize.Sm);
  });

  it('opens URL when pressed with valid https URL', () => {
    const { getByTestId } = render(<SnapUILink {...validProps} />);

    const link = getByTestId('snaps-ui-link');
    fireEvent.press(link);

    expect(Linking.openURL).toHaveBeenCalledWith(validProps.href);
    expect(Linking.openURL).toHaveBeenCalledTimes(1);
  });

  it('throws error when URL does not start with https://', () => {
    const invalidProps = {
      href: 'http://example.com',
      children: 'Invalid Link',
    };

    const { getByTestId } = render(<SnapUILink {...invalidProps} />);

    const link = getByTestId('snaps-ui-link');

    expect(() => {
      fireEvent.press(link);
    }).toThrow('Invalid URL');

    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  it('can be nested inside another Text component', () => {
    const { toJSON } = render(
      <Text>
        Before <SnapUILink href="https://metamask.io">MetaMask</SnapUILink>{' '}
        After
      </Text>,
    );

    const textContent = JSON.stringify(toJSON());
    expect(textContent).toContain('Before');
    expect(textContent).toContain('MetaMask');
    expect(textContent).toContain('After');
  });

  it('handles array children correctly', () => {
    const { getByTestId } = render(
      <SnapUILink href="https://metamask.io">
        {'Part 1 '}
        {'Part 2'}
      </SnapUILink>,
    );

    const link = getByTestId('snaps-ui-link');
    const childrenArray = link.props.children;
    const textContent = childrenArray[0].toString();

    expect(textContent).toBe('Part 1 ,Part 2');
  });

  it('renders correctly with complex children', () => {
    const { UNSAFE_getAllByType, toJSON } = render(
      <SnapUILink href="https://metamask.io">
        Normal text
        {/* eslint-disable-next-line react-native/no-inline-styles */}
        <Text style={{ fontWeight: 'bold' }}>Bold text</Text>
      </SnapUILink>,
    );

    const textContent = JSON.stringify(toJSON());
    expect(textContent).toContain('Normal text');
    expect(textContent).toContain('Bold text');

    // Should have our Icon plus any Text components
    const allIcons = UNSAFE_getAllByType(Icon);
    expect(allIcons.length).toBe(1);
  });

  it('validates URL format correctly', () => {
    // Valid HTTPS URL
    expect(() => {
      fireEvent.press(
        render(
          <SnapUILink href="https://example.com">Link</SnapUILink>,
        ).getByTestId('snaps-ui-link'),
      );
    }).not.toThrow();

    // Invalid HTTP URL
    expect(() => {
      fireEvent.press(
        render(
          <SnapUILink href="http://example.com">Link</SnapUILink>,
        ).getByTestId('snaps-ui-link'),
      );
    }).toThrow('Invalid URL');

    // Invalid non-HTTP URL
    expect(() => {
      fireEvent.press(
        render(
          <SnapUILink href="ftp://example.com">Link</SnapUILink>,
        ).getByTestId('snaps-ui-link'),
      );
    }).toThrow('Invalid URL');
  });
});
