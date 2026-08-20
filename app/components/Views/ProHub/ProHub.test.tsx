import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ProHub from './ProHub';
import { ProHubTestIds } from './ProHub.testIds';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';

// ─── Navigation ───────────────────────────────────────────────────────────────

let mockGoBack: jest.Mock;
let mockNavigate: jest.Mock;

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
  };
});

// ─── Tailwind ─────────────────────────────────────────────────────────────────

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: (..._args: unknown[]) => ({}),
  }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const renderProHub = () => render(<ProHub />);

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('ProHub', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGoBack = jest.fn();
    mockNavigate = jest.fn();
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('renders the container', () => {
      const { getByTestId } = renderProHub();

      expect(getByTestId(ProHubTestIds.CONTAINER)).toBeOnTheScreen();
    });

    it('renders the title from i18n', () => {
      const { getByTestId } = renderProHub();

      expect(getByTestId(ProHubTestIds.TITLE)).toHaveTextContent(
        strings('pro_hub.title'),
      );
    });

    it('renders the subtitle from i18n', () => {
      const { getByTestId } = renderProHub();

      expect(getByTestId(ProHubTestIds.SUBTITLE)).toHaveTextContent(
        strings('pro_hub.subtitle'),
      );
    });

    it('renders the header', () => {
      const { getByTestId } = renderProHub();

      expect(getByTestId(ProHubTestIds.HEADER_ROOT)).toBeOnTheScreen();
    });

    it('renders the back button', () => {
      const { getByTestId } = renderProHub();

      expect(getByTestId(ProHubTestIds.BACK_BUTTON)).toBeOnTheScreen();
    });

    it('renders the manage plans button', () => {
      const { getByTestId } = renderProHub();

      expect(getByTestId(ProHubTestIds.MANAGE_PLANS_BUTTON)).toBeOnTheScreen();
    });

    it('renders the explore benefits button with correct label', () => {
      const { getByTestId } = renderProHub();

      expect(getByTestId(ProHubTestIds.EXPLORE_BUTTON)).toHaveTextContent(
        strings('pro_hub.explore_benefits'),
      );
    });

    it('renders the manage subscription button with correct label', () => {
      const { getByTestId } = renderProHub();

      expect(getByTestId(ProHubTestIds.MANAGE_BUTTON)).toHaveTextContent(
        strings('pro_hub.manage'),
      );
    });
  });

  // ── Back button ───────────────────────────────────────────────────────────

  describe('back button', () => {
    it('calls navigation.goBack when pressed', () => {
      const { getByTestId } = renderProHub();

      fireEvent.press(getByTestId(ProHubTestIds.BACK_BUTTON));

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('does not call navigation.goBack before the button is pressed', () => {
      renderProHub();

      expect(mockGoBack).not.toHaveBeenCalled();
    });
  });

  // ── Navigation ───────────────────────────────────────────────────────────

  describe('navigation', () => {
    it('navigates to Membership when manage subscription button is pressed', () => {
      const { getByTestId } = renderProHub();

      fireEvent.press(getByTestId(ProHubTestIds.MANAGE_BUTTON));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PRO_HUB.MEMBERSHIP);
    });

    it('navigates to Membership when manage plans icon is pressed', () => {
      const { getByTestId } = renderProHub();

      fireEvent.press(getByTestId(ProHubTestIds.MANAGE_PLANS_BUTTON));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PRO_HUB.MEMBERSHIP);
    });

    it('does not navigate before any button is pressed', () => {
      renderProHub();

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
