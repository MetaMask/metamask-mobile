import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Linking, Text } from 'react-native';
import { SnapUILink } from './SnapUILink';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import { TextColor } from '../../../component-library/components/Texts/Text';

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
    const icon = UNSAFE_getByType(Icon);

    expect(linkText).toBeTruthy();
    expect(linkText.type).toBe('Text');
    expect(linkText.props.style).toMatchObject({ color: TextColor.Info });
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
    const { getByText } = render(
      <Text>
        Before <SnapUILink href="https://metamask.io">MetaMask</SnapUILink>{' '}
        After
      </Text>,
    );

    expect(getByText('Before')).toBeTruthy();
    expect(getByText('MetaMask')).toBeTruthy();
    expect(getByText('After')).toBeTruthy();
  });
});
