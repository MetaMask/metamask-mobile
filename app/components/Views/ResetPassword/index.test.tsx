import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import ResetPassword from './';
import { backgroundState } from '../../../util/test/initial-root-state';
import { togglePasswordResetInProgress } from '../../../actions/settings';

// Mock the navigation
const mockNavigation = {
  navigate: jest.fn(),
  setOptions: jest.fn(),
};

// Mock the route
const mockRoute = {
  params: {},
};

const initialState = {
  user: {
    passwordSet: true,
    seedphraseBackedUp: false,
  },
  engine: {
    backgroundState,
  },
  settings: {
    passwordResetInProgress: false,
  },
};

// Mock the Authentication module
jest.mock('../../../core', () => ({
  Authentication: {
    resetPassword: jest.fn(),
    getType: jest.fn().mockResolvedValue({ availableTypes: [], currentType: null }),
  },
}));

// Mock NotificationManager
jest.mock('../../../core/NotificationManager', () => ({
  showSimpleNotification: jest.fn(),
}));

// Mock InteractionManager
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  InteractionManager: {
    runAfterInteractions: jest.fn((callback) => callback()),
  },
}));

describe('ResetPassword', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <ResetPassword navigation={mockNavigation} route={mockRoute} />,
      { state: initialState }
    );
    expect(toJSON()).toMatchSnapshot();
  });

  describe('togglePasswordResetInProgress functionality', () => {
    it('should render without errors when passwordResetInProgress is true', () => {
      const stateWithPasswordReset = {
        ...initialState,
        settings: {
          passwordResetInProgress: true,
        },
      };
      
      const { getByTestId } = renderWithProvider(
        <ResetPassword navigation={mockNavigation} route={mockRoute} />,
        { state: stateWithPasswordReset }
      );

      expect(getByTestId('account-backup-step-4-screen')).toBeTruthy();
    });

    it('should render without errors when passwordResetInProgress is false', () => {
      const stateWithPasswordReset = {
        ...initialState,
        settings: {
          passwordResetInProgress: false,
        },
      };

      const { getByTestId } = renderWithProvider(
        <ResetPassword navigation={mockNavigation} route={mockRoute} />,
        { state: stateWithPasswordReset }
      );

      expect(getByTestId('account-backup-step-4-screen')).toBeTruthy();
    });

    it('should verify action creator creates correct action structure', () => {
      // Test that the action creator returns the expected action structure
      const actionTrue = togglePasswordResetInProgress(true);
      expect(actionTrue).toEqual({
        type: 'TOGGLE_PASSWORD_RESET_IN_PROGRESS',
        passwordResetInProgress: true,
      });

      const actionFalse = togglePasswordResetInProgress(false);
      expect(actionFalse).toEqual({
        type: 'TOGGLE_PASSWORD_RESET_IN_PROGRESS',
        passwordResetInProgress: false,
      });
    });

    it('should connect to Redux store properly', () => {
      const { store } = renderWithProvider(
        <ResetPassword navigation={mockNavigation} route={mockRoute} />,
        { state: initialState }
      );

      // Verify the store is properly configured
      expect(store).toBeDefined();
      expect(store.getState()).toMatchObject(initialState);
    });
  });
});
