import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import AccountConnectMaliciousWarning from './AccountConnectMaliciousWarning';
import { AccountConnectMaliciousWarningSelectorsIDs } from './AccountConnectMaliciousWarning.testIds';

const mockOnConnectAnyway = jest.fn();
const mockOnClose = jest.fn();

const MOCK_URL = 'https://app.monkeyswap.io';

const renderWarning = (url = MOCK_URL) =>
  renderWithProvider(
    <AccountConnectMaliciousWarning
      url={url}
      onConnectAnyway={mockOnConnectAnyway}
      onClose={mockOnClose}
    />,
  );

describe('AccountConnectMaliciousWarning', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the malicious site warning screen', () => {
    const { getByTestId } = renderWarning();

    expect(
      getByTestId(AccountConnectMaliciousWarningSelectorsIDs.CONTAINER),
    ).toBeDefined();
    expect(
      getByTestId(AccountConnectMaliciousWarningSelectorsIDs.WARNING_TITLE),
    ).toBeDefined();
    expect(
      getByTestId(AccountConnectMaliciousWarningSelectorsIDs.WARNING_URL),
    ).toBeDefined();
    expect(
      getByTestId(AccountConnectMaliciousWarningSelectorsIDs.WARNING_BOX),
    ).toBeDefined();
    expect(
      getByTestId(
        AccountConnectMaliciousWarningSelectorsIDs.CONNECT_ANYWAY_BUTTON,
      ),
    ).toBeDefined();
    expect(
      getByTestId(AccountConnectMaliciousWarningSelectorsIDs.CLOSE_BUTTON),
    ).toBeDefined();
  });

  it('displays the correct title text', () => {
    const { getByText } = renderWarning();

    expect(getByText('Malicious site detected')).toBeDefined();
  });

  it('displays the dapp URL', () => {
    const { getByText } = renderWarning();

    expect(getByText(MOCK_URL)).toBeDefined();
  });

  it('displays the warning message', () => {
    const { getByText } = renderWarning();

    expect(
      getByText('If you connect to this site, you could lose all your assets.'),
    ).toBeDefined();
  });

  it('displays the Connect Anyway button', () => {
    const { getByText } = renderWarning();

    expect(getByText('Connect Anyway')).toBeDefined();
  });

  it('calls onConnectAnyway when the Connect Anyway button is pressed', () => {
    const { getByTestId } = renderWarning();

    fireEvent.press(
      getByTestId(
        AccountConnectMaliciousWarningSelectorsIDs.CONNECT_ANYWAY_BUTTON,
      ),
    );

    expect(mockOnConnectAnyway).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the close button is pressed', () => {
    const { getByTestId } = renderWarning();

    fireEvent.press(
      getByTestId(AccountConnectMaliciousWarningSelectorsIDs.CLOSE_BUTTON),
    );

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onConnectAnyway when close is pressed', () => {
    const { getByTestId } = renderWarning();

    fireEvent.press(
      getByTestId(AccountConnectMaliciousWarningSelectorsIDs.CLOSE_BUTTON),
    );

    expect(mockOnConnectAnyway).not.toHaveBeenCalled();
  });

  it('does not call onClose when Connect Anyway is pressed', () => {
    const { getByTestId } = renderWarning();

    fireEvent.press(
      getByTestId(
        AccountConnectMaliciousWarningSelectorsIDs.CONNECT_ANYWAY_BUTTON,
      ),
    );

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it('renders with a different URL', () => {
    const otherUrl = 'https://evil-dapp.example.com';
    const { getByText } = renderWarning(otherUrl);

    expect(getByText(otherUrl)).toBeDefined();
  });
});
