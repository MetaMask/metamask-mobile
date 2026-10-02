import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import ProfileDrawer from './ProfileDrawer';
import { renderScreen } from '../../../util/test/renderWithProvider';
import { ProfileDrawerViewSelectorsIDs } from './ProfileDrawer.testIds';
import Routes from '../../../constants/navigation/Routes';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockOpenQRScanner = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
}));

jest.mock('../../hooks/useQRScanner/useQRScanner', () => ({
  useQRScanner: () => ({ openQRScanner: mockOpenQRScanner }),
}));

const ProfileDrawerWrapper = () => <ProfileDrawer />;

const renderProfileDrawer = () =>
  renderScreen(ProfileDrawerWrapper, {
    name: Routes.PROFILE_DRAWER.ROOT,
  });

describe('ProfileDrawer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the screen container and header without crashing', () => {
      renderProfileDrawer();

      expect(
        screen.getByTestId(ProfileDrawerViewSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(ProfileDrawerViewSelectorsIDs.HEADER),
      ).toBeOnTheScreen();
    });

    it('renders the header close and scan buttons', () => {
      renderProfileDrawer();

      expect(
        screen.getByTestId(ProfileDrawerViewSelectorsIDs.CLOSE_BUTTON),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(ProfileDrawerViewSelectorsIDs.SCAN_BUTTON),
      ).toBeOnTheScreen();
    });

    it('renders the profile placeholder with a create profile label', () => {
      renderProfileDrawer();

      expect(
        screen.getByTestId(ProfileDrawerViewSelectorsIDs.PROFILE_PLACEHOLDER),
      ).toBeOnTheScreen();
      expect(screen.getByText('Create profile')).toBeOnTheScreen();
    });

    it('renders all five placeholder row labels', () => {
      renderProfileDrawer();

      expect(screen.getByText('Account selector')).toBeOnTheScreen();
      expect(screen.getByText('Notifications')).toBeOnTheScreen();
      expect(screen.getByText('Subscriptions')).toBeOnTheScreen();
      expect(screen.getByText('Settings')).toBeOnTheScreen();
      expect(screen.getByText('Help and support')).toBeOnTheScreen();
    });

    it('renders all five placeholder rows with their testIDs', () => {
      renderProfileDrawer();

      expect(
        screen.getByTestId(ProfileDrawerViewSelectorsIDs.ROW_ACCOUNT_SELECTOR),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(ProfileDrawerViewSelectorsIDs.ROW_NOTIFICATIONS),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(ProfileDrawerViewSelectorsIDs.ROW_SUBSCRIPTIONS),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(ProfileDrawerViewSelectorsIDs.ROW_SETTINGS),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId(ProfileDrawerViewSelectorsIDs.ROW_HELP_AND_SUPPORT),
      ).toBeOnTheScreen();
    });
  });

  describe('Header actions', () => {
    it('calls goBack when the close button is pressed', () => {
      renderProfileDrawer();

      fireEvent.press(
        screen.getByTestId(ProfileDrawerViewSelectorsIDs.CLOSE_BUTTON),
      );

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('opens the QR scanner when the scan button is pressed', () => {
      renderProfileDrawer();

      fireEvent.press(
        screen.getByTestId(ProfileDrawerViewSelectorsIDs.SCAN_BUTTON),
      );

      expect(mockOpenQRScanner).toHaveBeenCalledTimes(1);
    });
  });

  describe('Profile placeholder', () => {
    it('navigates to the profile create screen when the profile placeholder is pressed', () => {
      renderProfileDrawer();

      fireEvent.press(
        screen.getByTestId(ProfileDrawerViewSelectorsIDs.PROFILE_PLACEHOLDER),
      );

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.PROFILE_DRAWER.PROFILE_CREATE,
        undefined,
      );
    });
  });

  describe('Placeholder rows', () => {
    it('does not navigate when a placeholder row is pressed (UI-only pass)', () => {
      renderProfileDrawer();

      const placeholderRowTestIds = [
        ProfileDrawerViewSelectorsIDs.ROW_ACCOUNT_SELECTOR,
        ProfileDrawerViewSelectorsIDs.ROW_NOTIFICATIONS,
        ProfileDrawerViewSelectorsIDs.ROW_SUBSCRIPTIONS,
        ProfileDrawerViewSelectorsIDs.ROW_SETTINGS,
        ProfileDrawerViewSelectorsIDs.ROW_HELP_AND_SUPPORT,
      ];

      placeholderRowTestIds.forEach((testId) => {
        expect(() => fireEvent.press(screen.getByTestId(testId))).not.toThrow();
        expect(mockNavigate).not.toHaveBeenCalled();
      });

      expect(mockGoBack).not.toHaveBeenCalled();
      expect(mockOpenQRScanner).not.toHaveBeenCalled();
    });
  });
});
