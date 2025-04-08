import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { SnapUILink } from './SnapUILink';
import ButtonLink from '../../../component-library/components/Buttons/Button/variants/ButtonLink';
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
    const { UNSAFE_getByType } = render(<SnapUILink {...validProps} />);

    const button = UNSAFE_getByType(ButtonLink);
    const icon = UNSAFE_getByType(Icon);

    expect(button).toBeTruthy();
    expect(button.props.testID).toBe('snaps-ui-link');
    expect(button.props.color).toBe(TextColor.Info);
    expect(icon.props.name).toBe(IconName.Export);
    expect(icon.props.color).toBe(IconColor.Primary);
    expect(icon.props.size).toBe(IconSize.Sm);
  });

  it('opens URL when pressed with valid https URL', () => {
    const { getByTestId } = render(<SnapUILink {...validProps} />);

    const button = getByTestId('snaps-ui-link');
    fireEvent.press(button);

    expect(Linking.openURL).toHaveBeenCalledWith(validProps.href);
    expect(Linking.openURL).toHaveBeenCalledTimes(1);
  });

  it('throws error when URL does not start with https://', () => {
    const invalidProps = {
      href: 'http://example.com',
      children: 'Invalid Link',
    };

    const { getByTestId } = render(<SnapUILink {...invalidProps} />);

    const button = getByTestId('snaps-ui-link');

    expect(() => {
      fireEvent.press(button);
    }).toThrow('Invalid URL');

    expect(Linking.openURL).not.toHaveBeenCalled();
  });
});
