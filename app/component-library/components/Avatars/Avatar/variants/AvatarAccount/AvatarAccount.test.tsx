// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// Internal dependencies.
import AvatarAccount from './AvatarAccount';
import { AvatarAccountType } from './AvatarAccount.types';
import { AvatarSize } from '../../Avatar.types';

// Mock external dependencies
jest.mock('react-native-jazzicon', () => 'JazzIcon');
jest.mock('@metamask/design-system-react-native', () => ({
  Maskicon: 'Maskicon',
}));

describe('AvatarAccount', () => {
  const mockAccountAddress = '0x1234567890123456789012345678901234567890';

  describe('Component Rendering', () => {
    it('renders with default props', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <AvatarAccount
          accountAddress={mockAccountAddress}
          testID="avatar-account"
        />,
      );

      // Assert - Component should be present
      expect(getByTestId('avatar-account')).toBeOnTheScreen();
    });

    it('renders with custom style and forwards props to AvatarBase', () => {
      // Arrange
      const customStyle = { margin: 10 };
      const testID = 'custom-avatar';

      // Act
      const { getByTestId } = render(
        <AvatarAccount
          accountAddress={mockAccountAddress}
          size={AvatarSize.Lg}
          style={customStyle}
          testID={testID}
          accessibilityLabel="Custom Avatar"
        />,
      );

      // Assert
      const avatar = getByTestId(testID);
      expect(avatar).toBeOnTheScreen();
      expect(avatar.props.accessibilityLabel).toBe('Custom Avatar');
    });
  });

  describe('Avatar Type Variants', () => {
    it.each([
      AvatarAccountType.JazzIcon,
      AvatarAccountType.Blockies,
      AvatarAccountType.Maskicon,
    ] as const)('renders %s type without crashing', (avatarType) => {
      // Arrange & Act
      const { getByTestId } = render(
        <AvatarAccount
          accountAddress={mockAccountAddress}
          type={avatarType}
          testID={`avatar-${avatarType}`}
        />,
      );

      // Assert - Should render without crashing
      expect(getByTestId(`avatar-${avatarType}`)).toBeOnTheScreen();
    });

    it('defaults to JazzIcon when no type is specified', () => {
      // Arrange & Act
      const defaultAvatar = render(
        <AvatarAccount accountAddress={mockAccountAddress} />,
      );
      const jazzIconAvatar = render(
        <AvatarAccount
          accountAddress={mockAccountAddress}
          type={AvatarAccountType.JazzIcon}
        />,
      );

      // Assert - Default should behave same as JazzIcon
      expect(defaultAvatar.toJSON()).toEqual(jazzIconAvatar.toJSON());
    });

    it('renders different content for different avatar types', () => {
      // Arrange & Act
      const jazzIcon = render(
        <AvatarAccount
          accountAddress={mockAccountAddress}
          type={AvatarAccountType.JazzIcon}
        />,
      );
      const blockies = render(
        <AvatarAccount
          accountAddress={mockAccountAddress}
          type={AvatarAccountType.Blockies}
        />,
      );
      const maskicon = render(
        <AvatarAccount
          accountAddress={mockAccountAddress}
          type={AvatarAccountType.Maskicon}
        />,
      );

      // Assert - Different types should produce different content
      expect(jazzIcon.toJSON()).not.toEqual(blockies.toJSON());
      expect(jazzIcon.toJSON()).not.toEqual(maskicon.toJSON());
      expect(blockies.toJSON()).not.toEqual(maskicon.toJSON());
    });
  });

  describe('Size Handling', () => {
    it.each([
      AvatarSize.Xs,
      AvatarSize.Sm,
      AvatarSize.Md,
      AvatarSize.Lg,
      AvatarSize.Xl,
    ] as const)('renders %s size without crashing', (size) => {
      // Arrange & Act
      const { getByTestId } = render(
        <AvatarAccount
          accountAddress={mockAccountAddress}
          size={size}
          testID={`avatar-${size}`}
        />,
      );

      // Assert
      expect(getByTestId(`avatar-${size}`)).toBeOnTheScreen();
    });
  });

  describe('Border Radius Handling', () => {
    it('applies border radius directly to JazzIcon via containerStyle', () => {
      // Arrange & Act
      const { toJSON } = render(
        <AvatarAccount
          accountAddress={mockAccountAddress}
          type={AvatarAccountType.JazzIcon}
          size={AvatarSize.Md}
        />,
      );

      // Assert - JazzIcon should have containerStyle with border radius
      const rendered = toJSON();
      expect(rendered).toMatchSnapshot();
    });

    it('applies border radius directly to Blockies via Image style', () => {
      // Arrange & Act
      const { toJSON } = render(
        <AvatarAccount
          accountAddress={mockAccountAddress}
          type={AvatarAccountType.Blockies}
          size={AvatarSize.Lg}
        />,
      );

      // Assert - Image should have style with border radius
      const rendered = toJSON();
      expect(rendered).toMatchSnapshot();
    });

    it('applies border radius directly to Maskicon via style prop', () => {
      // Arrange & Act
      const { toJSON } = render(
        <AvatarAccount
          accountAddress={mockAccountAddress}
          type={AvatarAccountType.Maskicon}
          size={AvatarSize.Sm}
        />,
      );

      // Assert - Maskicon should have style with border radius
      const rendered = toJSON();
      expect(rendered).toMatchSnapshot();
    });

    it('applies different border radius values for different sizes', () => {
      // Arrange & Act
      const xsAvatar = render(
        <AvatarAccount
          accountAddress={mockAccountAddress}
          type={AvatarAccountType.JazzIcon}
          size={AvatarSize.Xs}
        />,
      );
      const xlAvatar = render(
        <AvatarAccount
          accountAddress={mockAccountAddress}
          type={AvatarAccountType.JazzIcon}
          size={AvatarSize.Xl}
        />,
      );

      // Assert - Different sizes should produce different border radius values
      expect(xsAvatar.toJSON()).not.toEqual(xlAvatar.toJSON());
    });
  });

  describe('Address Handling', () => {
    it('renders different avatars for different addresses', () => {
      // Arrange
      const address1 = '0x1111111111111111111111111111111111111111';
      const address2 = '0x2222222222222222222222222222222222222222';

      // Act
      const avatar1 = render(
        <AvatarAccount
          accountAddress={address1}
          type={AvatarAccountType.JazzIcon}
        />,
      );
      const avatar2 = render(
        <AvatarAccount
          accountAddress={address2}
          type={AvatarAccountType.JazzIcon}
        />,
      );

      // Assert - Different addresses should produce different avatars
      expect(avatar1.toJSON()).not.toEqual(avatar2.toJSON());
    });

    it('renders consistently for the same address', () => {
      // Arrange
      const sameAddress = '0x1111111111111111111111111111111111111111';

      // Act
      const avatar1 = render(
        <AvatarAccount
          accountAddress={sameAddress}
          type={AvatarAccountType.JazzIcon}
        />,
      );
      const avatar2 = render(
        <AvatarAccount
          accountAddress={sameAddress}
          type={AvatarAccountType.JazzIcon}
        />,
      );

      // Assert - Same address should produce identical avatars
      expect(avatar1.toJSON()).toEqual(avatar2.toJSON());
    });
  });

  describe('Edge Cases', () => {
    it('handles empty address gracefully', () => {
      // Arrange & Act
      const { getByTestId } = render(
        <AvatarAccount
          accountAddress=""
          type={AvatarAccountType.JazzIcon}
          testID="empty-address-avatar"
        />,
      );

      // Assert - Should render without crashing
      expect(getByTestId('empty-address-avatar')).toBeOnTheScreen();
    });

    it('handles very long address gracefully', () => {
      // Arrange
      const longAddress = '0x' + '1'.repeat(100); // Longer than typical address

      // Act
      const { getByTestId } = render(
        <AvatarAccount
          accountAddress={longAddress}
          type={AvatarAccountType.JazzIcon}
          testID="long-address-avatar"
        />,
      );

      // Assert - Should render without crashing
      expect(getByTestId('long-address-avatar')).toBeOnTheScreen();
    });
  });

  describe('Integration - Component Snapshot', () => {
    it('maintains expected visual structure', () => {
      // Arrange & Act - Only keeping one essential snapshot for visual regression
      const { toJSON } = render(
        <AvatarAccount
          accountAddress={mockAccountAddress}
          type={AvatarAccountType.JazzIcon}
          size={AvatarSize.Md}
        />,
      );

      // Assert - Single snapshot for visual regression testing
      expect(toJSON()).toMatchSnapshot();
    });

    it('maintains expected visual structure for non-EVM', () => {
      // Arrange & Act - Only keeping one essential snapshot for visual regression
      const { toJSON } = render(
        <AvatarAccount
          accountAddress="CYWSQQ2iiFL6EZzuqvMM9o22CZX3N8PowvvkpBXqLK4e"
          type={AvatarAccountType.JazzIcon}
          size={AvatarSize.Md}
        />,
      );

      // Assert - Single snapshot for visual regression testing
      expect(toJSON()).toMatchSnapshot();
    });
  });
});
