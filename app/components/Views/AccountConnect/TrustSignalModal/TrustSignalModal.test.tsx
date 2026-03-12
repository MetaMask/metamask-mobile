import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import TrustSignalModal from './TrustSignalModal';
import { TrustSignalModalSelectorsIDs } from './TrustSignalModal.testIds';

const mockOnConnectAnyway = jest.fn();
const mockOnClose = jest.fn();

const MOCK_URL = 'https://suspicious-dapp.example.com';

const renderModal = (url = MOCK_URL) =>
  renderWithProvider(
    <TrustSignalModal
      url={url}
      onConnectAnyway={mockOnConnectAnyway}
      onClose={mockOnClose}
    />,
  );

describe('TrustSignalModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all expected elements', () => {
    const { getByTestId } = renderModal();

    expect(
      getByTestId(TrustSignalModalSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      getByTestId(TrustSignalModalSelectorsIDs.CLOSE_BUTTON),
    ).toBeOnTheScreen();
    expect(getByTestId(TrustSignalModalSelectorsIDs.TITLE)).toBeOnTheScreen();
    expect(getByTestId(TrustSignalModalSelectorsIDs.URL)).toBeOnTheScreen();
    expect(
      getByTestId(TrustSignalModalSelectorsIDs.DESCRIPTION_BOX),
    ).toBeOnTheScreen();
    expect(
      getByTestId(TrustSignalModalSelectorsIDs.CONNECT_ANYWAY_BUTTON),
    ).toBeOnTheScreen();
  });

  it('displays the malicious title', () => {
    const { getByText } = renderModal();

    expect(getByText('Malicious site detected')).toBeOnTheScreen();
  });

  it('displays the malicious description', () => {
    const { getByText } = renderModal();

    expect(
      getByText(
        'This site has been flagged as malicious. Connecting may put your assets at risk.',
      ),
    ).toBeOnTheScreen();
  });

  it('displays the dapp URL', () => {
    const { getByText } = renderModal();

    expect(getByText(MOCK_URL)).toBeOnTheScreen();
  });

  it('renders with a different URL', () => {
    const otherUrl = 'https://another-dapp.example.com';
    const { getByText } = renderModal(otherUrl);

    expect(getByText(otherUrl)).toBeOnTheScreen();
  });

  it('calls onConnectAnyway when the Connect Anyway button is pressed', () => {
    const { getByTestId } = renderModal();

    fireEvent.press(
      getByTestId(TrustSignalModalSelectorsIDs.CONNECT_ANYWAY_BUTTON),
    );

    expect(mockOnConnectAnyway).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the close button is pressed', () => {
    const { getByTestId } = renderModal();

    fireEvent.press(getByTestId(TrustSignalModalSelectorsIDs.CLOSE_BUTTON));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onConnectAnyway when close is pressed', () => {
    const { getByTestId } = renderModal();

    fireEvent.press(getByTestId(TrustSignalModalSelectorsIDs.CLOSE_BUTTON));

    expect(mockOnConnectAnyway).not.toHaveBeenCalled();
  });

  it('does not call onClose when Connect Anyway is pressed', () => {
    const { getByTestId } = renderModal();

    fireEvent.press(
      getByTestId(TrustSignalModalSelectorsIDs.CONNECT_ANYWAY_BUTTON),
    );

    expect(mockOnClose).not.toHaveBeenCalled();
  });
});
