import React from 'react';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { render, fireEvent } from '@testing-library/react-native';

import Routes from '../../../../../constants/navigation/Routes';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useSendNavbar } from './useSendNavbar';

const mockHandleCancelPress = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
  useNavigationState: jest.fn(),
}));

jest.mock('./useSendActions', () => ({
  useSendActions: () => ({
    handleCancelPress: mockHandleCancelPress,
  }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('useSendNavbar', () => {
  const mockParentNavigate = jest.fn();
  const mockParentGoBack = jest.fn();
  const mockGoBack = jest.fn();
  const mockNavigation = {
    navigate: mockNavigate,
    goBack: mockGoBack,
    getParent: jest.fn(),
  };

  const createMockNavigationState = (
    routes: {
      name: string;
      params?: Record<string, unknown>;
      state?: unknown;
    }[],
    index = routes.length - 1,
  ) => ({
    index,
    routes,
  });

  const mockParentStackState = (
    routes: {
      name: string;
      params?: Record<string, unknown>;
      state?: unknown;
    }[],
    index = routes.length - 1,
  ) => {
    const state = createMockNavigationState(routes, index);
    mockNavigation.getParent.mockReturnValue({
      navigate: mockParentNavigate,
      goBack: mockParentGoBack,
      getState: () => state,
    });
    return state;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockParentStackState([{ name: 'Send' }]);
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
    (useNavigationState as jest.Mock).mockReturnValue(
      createMockNavigationState([{ name: Routes.SEND.ASSET }]),
    );
  });

  it('returns navigation options for Amount, Asset, and Recipient routes', () => {
    const { result } = renderHookWithProvider(() => useSendNavbar());

    expect(result.current).toHaveProperty('Amount');
    expect(result.current).toHaveProperty('Asset');
    expect(result.current).toHaveProperty('Recipient');
  });

  describe('Amount route', () => {
    it('provides header configuration with a header function', () => {
      const { result } = renderHookWithProvider(() => useSendNavbar());
      const { Amount } = result.current;

      expect(Amount.header).toBeDefined();
      expect(typeof Amount.header).toBe('function');
    });

    it('renders back and close buttons in header', () => {
      const { result } = renderHookWithProvider(() => useSendNavbar());
      const { Amount } = result.current;

      const Header = Amount.header;
      const { getByTestId } = render(<Header />);

      expect(getByTestId('send-navbar-back-button')).toBeOnTheScreen();
      expect(getByTestId('send-navbar-close-button')).toBeOnTheScreen();
    });

    it('renders title in header', () => {
      const { result } = renderHookWithProvider(() => useSendNavbar());
      const { Amount } = result.current;

      const Header = Amount.header;
      const { getByText } = render(<Header />);

      expect(getByText('send.title')).toBeOnTheScreen();
    });

    it('navigates to wallet view when back button is pressed with no previous routes', () => {
      mockParentStackState([{ name: 'Send' }]);

      const { result } = renderHookWithProvider(() => useSendNavbar());
      const { Amount } = result.current;

      const Header = Amount.header;
      const { getByTestId } = render(<Header />);
      const backButton = getByTestId('send-navbar-back-button');

      fireEvent.press(backButton);

      expect(mockParentNavigate).toHaveBeenCalledWith(Routes.WALLET_VIEW);
    });

    it('pops the outer stack when a previous non-Home route exists', () => {
      mockParentStackState([
        { name: 'SomeOtherRoute', params: { test: 'data' } },
        { name: 'Send' },
      ]);

      const { result } = renderHookWithProvider(() => useSendNavbar());
      const { Amount } = result.current;

      const Header = Amount.header;
      const { getByTestId } = render(<Header />);
      const backButton = getByTestId('send-navbar-back-button');

      fireEvent.press(backButton);

      expect(mockParentGoBack).toHaveBeenCalled();
      expect(mockParentNavigate).not.toHaveBeenCalled();
    });

    /**
     * Regression test: entering Send from TokenDetails does not pop 'Asset'
     * off the outer stack first, so the outer stack is [Home, Asset, Send].
     * Exiting the nested Send stack must pop 'Send' (via goBack) to reveal
     * the existing 'Asset' screen, not push a duplicate 'Asset' via
     * navigate(name, params) — a duplicate leaves the original 'Send' screen
     * on the stack underneath, causing TokenDetails' own back press to land
     * back inside Send instead of Home.
     */
    it('pops back to the existing TokenDetails screen instead of duplicating it', () => {
      mockParentStackState([{ name: 'Asset' }, { name: 'Send' }]);

      const { result } = renderHookWithProvider(() => useSendNavbar());
      const { Amount } = result.current;

      const Header = Amount.header;
      const { getByTestId } = render(<Header />);
      const backButton = getByTestId('send-navbar-back-button');

      fireEvent.press(backButton);

      expect(mockParentGoBack).toHaveBeenCalled();
      expect(mockParentNavigate).not.toHaveBeenCalledWith(
        'Asset',
        expect.anything(),
      );
    });

    it('navigates to wallet view when previous route is Home', () => {
      mockParentStackState([{ name: 'Home' }, { name: 'Send' }]);

      const { result } = renderHookWithProvider(() => useSendNavbar());
      const { Amount } = result.current;

      const Header = Amount.header;
      const { getByTestId } = render(<Header />);
      const backButton = getByTestId('send-navbar-back-button');

      fireEvent.press(backButton);

      expect(mockParentNavigate).toHaveBeenCalledWith(Routes.WALLET_VIEW);
    });

    it('pops the nested Send stack when nested history exists', () => {
      (useNavigationState as jest.Mock).mockReturnValue(
        createMockNavigationState(
          [{ name: Routes.SEND.ASSET }, { name: Routes.SEND.AMOUNT }],
          1,
        ),
      );

      const { result } = renderHookWithProvider(() => useSendNavbar());
      const { Amount } = result.current;

      const Header = Amount.header;
      const { getByTestId } = render(<Header />);
      const backButton = getByTestId('send-navbar-back-button');

      fireEvent.press(backButton);

      expect(mockGoBack).toHaveBeenCalled();
      expect(mockParentNavigate).not.toHaveBeenCalled();
    });

    it('exits by popping the outer stack when at first route in nested Send stack', () => {
      mockParentStackState([
        { name: 'SomeOtherRoute', params: { test: 'data' } },
        { name: 'Send' },
      ]);
      (useNavigationState as jest.Mock).mockReturnValue(
        createMockNavigationState([{ name: Routes.SEND.AMOUNT }], 0),
      );

      const { result } = renderHookWithProvider(() => useSendNavbar());
      const { Amount } = result.current;

      const Header = Amount.header;
      const { getByTestId } = render(<Header />);
      const backButton = getByTestId('send-navbar-back-button');

      fireEvent.press(backButton);

      expect(mockGoBack).not.toHaveBeenCalled();
      expect(mockParentGoBack).toHaveBeenCalled();
      expect(mockParentNavigate).not.toHaveBeenCalled();
    });

    it('calls handleCancelPress when close button is pressed', () => {
      const { result } = renderHookWithProvider(() => useSendNavbar());
      const { Amount } = result.current;

      const Header = Amount.header;
      const { getByTestId } = render(<Header />);
      const closeButton = getByTestId('send-navbar-close-button');

      fireEvent.press(closeButton);

      expect(mockHandleCancelPress).toHaveBeenCalled();
    });
  });

  describe('Asset route', () => {
    it('provides header configuration with a header function', () => {
      const { result } = renderHookWithProvider(() => useSendNavbar());
      const { Asset } = result.current;

      expect(Asset.header).toBeDefined();
      expect(typeof Asset.header).toBe('function');
    });

    it('renders back button that calls handleCancelPress', () => {
      const { result } = renderHookWithProvider(() => useSendNavbar());
      const { Asset } = result.current;

      const Header = Asset.header;
      const { getByTestId } = render(<Header />);
      const backButton = getByTestId('send-navbar-back-button');

      fireEvent.press(backButton);

      expect(mockHandleCancelPress).toHaveBeenCalled();
    });

    it('renders title in header', () => {
      const { result } = renderHookWithProvider(() => useSendNavbar());
      const { Asset } = result.current;

      const Header = Asset.header;
      const { getByText } = render(<Header />);

      expect(getByText('send.title')).toBeOnTheScreen();
    });
  });

  describe('Recipient route', () => {
    it('provides header configuration with a header function', () => {
      const { result } = renderHookWithProvider(() => useSendNavbar());
      const { Recipient } = result.current;

      expect(Recipient.header).toBeDefined();
      expect(typeof Recipient.header).toBe('function');
    });

    it('renders back and close buttons in header', () => {
      const { result } = renderHookWithProvider(() => useSendNavbar());
      const { Recipient } = result.current;

      const Header = Recipient.header;
      const { getByTestId } = render(<Header />);

      expect(getByTestId('send-navbar-back-button')).toBeOnTheScreen();
      expect(getByTestId('send-navbar-close-button')).toBeOnTheScreen();
    });

    it('uses same back navigation logic as Amount route', () => {
      mockParentStackState([
        { name: 'SomeOtherRoute', params: { test: 'data' } },
        { name: 'Send' },
      ]);

      const { result } = renderHookWithProvider(() => useSendNavbar());
      const { Recipient } = result.current;

      const Header = Recipient.header;
      const { getByTestId } = render(<Header />);
      const backButton = getByTestId('send-navbar-back-button');

      fireEvent.press(backButton);

      expect(mockParentGoBack).toHaveBeenCalled();
      expect(mockParentNavigate).not.toHaveBeenCalled();
    });

    it('calls handleCancelPress when close button is pressed', () => {
      const { result } = renderHookWithProvider(() => useSendNavbar());
      const { Recipient } = result.current;

      const Header = Recipient.header;
      const { getByTestId } = render(<Header />);
      const closeButton = getByTestId('send-navbar-close-button');

      fireEvent.press(closeButton);

      expect(mockHandleCancelPress).toHaveBeenCalled();
    });

    it('renders title in header', () => {
      const { result } = renderHookWithProvider(() => useSendNavbar());
      const { Recipient } = result.current;

      const Header = Recipient.header;
      const { getByText } = render(<Header />);

      expect(getByText('send.title')).toBeOnTheScreen();
    });
  });
});
