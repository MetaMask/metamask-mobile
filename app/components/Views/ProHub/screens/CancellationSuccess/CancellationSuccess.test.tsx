import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CancellationSuccess from './CancellationSuccess';
import { CancellationSuccessTestIds } from './CancellationSuccess.testIds';
import { MOCK_CANCELLATION_END_DATE } from './CancellationSuccess.constants';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';

// ─── Navigation ───────────────────────────────────────────────────────────────

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ navigate: mockNavigate }),
  };
});

// ─── Tailwind ─────────────────────────────────────────────────────────────────

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: (..._args: unknown[]) => ({}),
  }),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const renderScreen = () => render(<CancellationSuccess />);

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('CancellationSuccess', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  describe('Rendering', () => {
    it('renders the container', () => {
      const { getByTestId } = renderScreen();

      expect(
        getByTestId(CancellationSuccessTestIds.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('renders the check icon box', () => {
      const { getByTestId } = renderScreen();

      expect(
        getByTestId(CancellationSuccessTestIds.CHECK_ICON_BOX),
      ).toBeOnTheScreen();
    });

    it('renders the title from i18n', () => {
      const { getByTestId } = renderScreen();

      expect(getByTestId(CancellationSuccessTestIds.TITLE)).toHaveTextContent(
        strings('pro_hub.cancellation_success.title'),
      );
    });

    it('renders the description containing the prefix from i18n', () => {
      const { getByTestId } = renderScreen();

      // Description node contains prefix + bold date + suffix — use partial regex.
      expect(
        getByTestId(CancellationSuccessTestIds.DESCRIPTION),
      ).toHaveTextContent(
        new RegExp(
          strings('pro_hub.cancellation_success.description_prefix').replace(
            /[.*+?^${}()|[\]\\]/g,
            '\\$&',
          ),
        ),
      );
    });

    it('renders the description containing the end date', () => {
      const { getByTestId } = renderScreen();

      expect(
        getByTestId(CancellationSuccessTestIds.DESCRIPTION),
      ).toHaveTextContent(
        new RegExp(
          MOCK_CANCELLATION_END_DATE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        ),
      );
    });

    it('renders the description containing the suffix from i18n', () => {
      const { getByTestId } = renderScreen();

      expect(
        getByTestId(CancellationSuccessTestIds.DESCRIPTION),
      ).toHaveTextContent(
        new RegExp(
          strings('pro_hub.cancellation_success.description_suffix').replace(
            /[.*+?^${}()|[\]\\]/g,
            '\\$&',
          ),
        ),
      );
    });

    it('renders the done button', () => {
      const { getByTestId } = renderScreen();

      expect(
        getByTestId(CancellationSuccessTestIds.DONE_BUTTON),
      ).toBeOnTheScreen();
    });

    it('renders the done button with the correct i18n label', () => {
      const { getByTestId } = renderScreen();

      expect(
        getByTestId(CancellationSuccessTestIds.DONE_BUTTON),
      ).toHaveTextContent(strings('pro_hub.cancellation_success.done'));
    });
  });

  // ── Done button ────────────────────────────────────────────────────────────

  describe('done button', () => {
    it('navigates to ProHub root when done is pressed', () => {
      const { getByTestId } = renderScreen();

      fireEvent.press(getByTestId(CancellationSuccessTestIds.DONE_BUTTON));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PRO_HUB.ROOT);
    });

    it('does not navigate before done is pressed', () => {
      renderScreen();

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
