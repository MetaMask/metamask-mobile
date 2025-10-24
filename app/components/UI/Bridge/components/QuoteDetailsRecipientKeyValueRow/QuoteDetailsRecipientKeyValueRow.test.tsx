import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import QuoteDetailsRecipientKeyValueRow from './QuoteDetailsRecipientKeyValueRow';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { Hex } from '@metamask/utils';
import { AvatarAccountType } from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarAccount/AvatarAccount.types';
import Routes from '../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../hooks/useRecipientDisplayData', () => ({
  useRecipientDisplayData: jest.fn(),
}));

jest.mock('../../../../../util/notifications', () => ({
  ...jest.requireActual('../../../../../util/notifications'),
  shortenString: jest.fn((address, options) => {
    if (!address) return '';
    const start = address.slice(0, options.truncatedStartChars);
    const end = address.slice(-options.truncatedEndChars);
    return `${start}...${end}`;
  }),
}));

import { useRecipientDisplayData } from '../../hooks/useRecipientDisplayData';

const mockUseRecipientDisplayData =
  useRecipientDisplayData as jest.MockedFunction<
    typeof useRecipientDisplayData
  >;

describe('QuoteDetailsRecipientKeyValueRow', () => {
  const mockDestAddress = '0x1234567890123456789012345678901234567890' as Hex;

  // Simplify typing for tests
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createMockState = (overrides: any = {}): any => ({
    engine: {
      backgroundState: {
        BridgeController: {
          destAddress: mockDestAddress,
        },
        KeyringController: {
          keyrings: [],
        },
      },
    },
    bridge: {
      isSwap: false,
      destAddress: mockDestAddress,
      ...overrides.bridge,
    },
    settings: {
      avatarAccountType: AvatarAccountType.Maskicon,
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRecipientDisplayData.mockReturnValue({
      destinationDisplayName: undefined,
      destinationWalletName: undefined,
      destinationAccountAddress: undefined,
    });
  });

  it('returns null when isSwap is true', () => {
    const state = createMockState({
      bridge: {
        sourceToken: { chainId: 1, symbol: 'ETH' },
        destToken: { chainId: 1, symbol: 'USDC' },
      },
    });

    const { toJSON } = renderWithProvider(
      <QuoteDetailsRecipientKeyValueRow />,
      { state },
    );

    expect(toJSON()).toBeNull();
  });

  it('renders select recipient text when destAddress is undefined', () => {
    const state = createMockState({
      bridge: { destAddress: undefined },
    });

    const { getByText } = renderWithProvider(
      <QuoteDetailsRecipientKeyValueRow />,
      { state },
    );

    expect(getByText('Recipient')).toBeTruthy();
    expect(getByText('Select recipient')).toBeTruthy();
  });

  it('renders recipient row with internal account display name', () => {
    mockUseRecipientDisplayData.mockReturnValue({
      destinationDisplayName: 'Account 1',
      destinationWalletName: undefined,
      destinationAccountAddress: mockDestAddress,
    });

    const state = createMockState();

    const { getByText, getByTestId } = renderWithProvider(
      <QuoteDetailsRecipientKeyValueRow />,
      { state },
    );

    expect(getByText('Recipient')).toBeTruthy();
    expect(getByText('Account 1')).toBeTruthy();
    expect(getByTestId('recipient-selector-button')).toBeTruthy();
  });

  it('renders recipient row with account display name and wallet name', () => {
    mockUseRecipientDisplayData.mockReturnValue({
      destinationDisplayName: 'Account 1',
      destinationWalletName: 'Wallet 1',
      destinationAccountAddress: mockDestAddress,
    });

    const state = createMockState();

    const { getByText } = renderWithProvider(
      <QuoteDetailsRecipientKeyValueRow />,
      { state },
    );

    expect(getByText(/Wallet 1.*Account 1/)).toBeTruthy();
  });

  it('renders recipient row with shortened external address when no display name', () => {
    mockUseRecipientDisplayData.mockReturnValue({
      destinationDisplayName: undefined,
      destinationWalletName: undefined,
      destinationAccountAddress: mockDestAddress,
    });

    const state = createMockState();

    const { getByText } = renderWithProvider(
      <QuoteDetailsRecipientKeyValueRow />,
      { state },
    );

    expect(getByText('0x12345...67890')).toBeTruthy();
  });

  it('navigates to recipient selector modal when button is pressed', () => {
    mockUseRecipientDisplayData.mockReturnValue({
      destinationDisplayName: 'Account 1',
      destinationWalletName: undefined,
      destinationAccountAddress: mockDestAddress,
    });

    const state = createMockState();

    const { getByTestId } = renderWithProvider(
      <QuoteDetailsRecipientKeyValueRow />,
      { state },
    );

    const button = getByTestId('recipient-selector-button');
    fireEvent.press(button);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.RECIPIENT_SELECTOR_MODAL,
    });
  });

  it('renders select recipient text when destinationAccountAddress is undefined', () => {
    mockUseRecipientDisplayData.mockReturnValue({
      destinationDisplayName: undefined,
      destinationWalletName: undefined,
      destinationAccountAddress: undefined,
    });

    const state = createMockState();

    const { getByTestId, getByText, queryByText } = renderWithProvider(
      <QuoteDetailsRecipientKeyValueRow />,
      { state },
    );

    expect(getByTestId('recipient-selector-button')).toBeTruthy();
    expect(getByText('Select recipient')).toBeTruthy();
    expect(queryByText('0x12345...67890')).toBeNull();
  });
});
