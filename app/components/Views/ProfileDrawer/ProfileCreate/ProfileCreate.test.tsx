import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import ProfileCreate from './ProfileCreate';
import { renderScreen } from '../../../../util/test/renderWithProvider';
import { ProfileCreateViewSelectorsIDs } from '../ProfileDrawer.testIds';
import Routes from '../../../../constants/navigation/Routes';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: jest.fn(),
  }),
}));

const ProfileCreateWrapper = () => <ProfileCreate />;

const renderProfileCreate = () =>
  renderScreen(ProfileCreateWrapper, {
    name: Routes.PROFILE_DRAWER.PROFILE_CREATE,
  });

const getStepperCta = () =>
  screen.getByTestId(`${ProfileCreateViewSelectorsIDs.STEPPER}-cta-button`);

describe('ProfileCreate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the screen container without crashing', () => {
      renderProfileCreate();

      expect(
        screen.getByTestId(ProfileCreateViewSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('renders the header close button', () => {
      renderProfileCreate();

      expect(
        screen.getByTestId(ProfileCreateViewSelectorsIDs.CLOSE_BUTTON),
      ).toBeOnTheScreen();
    });

    it('renders the first onboarding step content', () => {
      renderProfileCreate();

      expect(
        screen.getByTestId(
          `${ProfileCreateViewSelectorsIDs.STEPPER}-container`,
        ),
      ).toBeOnTheScreen();
      expect(screen.getByText('Create your profile')).toBeOnTheScreen();
      expect(
        screen.getByText(
          'Set up a social profile to connect with others in MetaMask.',
        ),
      ).toBeOnTheScreen();
    });
  });

  describe('Stepper navigation', () => {
    it('advances to step 2 when the step 1 primary CTA is pressed', () => {
      renderProfileCreate();

      fireEvent.press(getStepperCta());

      expect(screen.getByText('Connect with others')).toBeOnTheScreen();
      expect(
        screen.queryByText('Create your profile'),
      ).not.toBeOnTheScreen();
    });

    it('calls goBack when the final step CTA is pressed', () => {
      renderProfileCreate();

      // Advance from step 1 to step 2, then to the final step 3.
      fireEvent.press(getStepperCta());
      fireEvent.press(getStepperCta());

      // Final CTA advances past the last step, triggering StepperCard's
      // onComplete -> handleClose -> navigation.goBack().
      fireEvent.press(getStepperCta());

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('Header actions', () => {
    it('calls goBack when the close button is pressed', () => {
      renderProfileCreate();

      fireEvent.press(
        screen.getByTestId(ProfileCreateViewSelectorsIDs.CLOSE_BUTTON),
      );

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });
});
