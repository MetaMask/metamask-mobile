import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import ClaimMerklRewards from './ClaimMerklRewards';
import { useMerklClaim } from './hooks/useMerklClaim';
import { usePendingMerklClaim } from './hooks/usePendingMerklClaim';
import { TokenI } from '../../../Tokens/types';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();

jest.mock('../../../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
  MetaMetricsEvents: {
    MUSD_CLAIM_BONUS_BUTTON_CLICKED: {
      category: 'mUSD Claim Bonus Button Clicked',
    },
  },
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(() => ({ name: 'Ethereum Mainnet' })),
}));

jest.mock('./hooks/useMerklClaim', () => ({
  useMerklClaim: jest.fn(),
}));

jest.mock('./hooks/usePendingMerklClaim', () => ({
  usePendingMerklClaim: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('../../../../../core/NavigationService', () => ({
  __esModule: true,
  default: {
    navigation: {
      navigate: (...args: unknown[]) => mockNavigate(...args),
    },
  },
}));

jest.mock('../../../../../constants/navigation/Routes', () => ({
  WALLET: {
    HOME: 'WalletTabHome',
    TOKENS_FULL_VIEW: 'TokensFullView',
  },
  MODAL: {
    ROOT_MODAL_FLOW: 'RootModalFlow',
    CLAIM_ON_LINEA: 'ClaimOnLineaModal',
  },
}));

const mockNavigateToModal = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigateToModal,
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { Text, TouchableOpacity: RNTouchableOpacity } =
    jest.requireActual('react-native');
  return {
    Button: ({
      children,
      onPress,
      isDisabled,
      isLoading,
      testID,
      ...props
    }: {
      children?: React.ReactNode;
      onPress?: () => void;
      isDisabled?: boolean;
      isLoading?: boolean;
      testID?: string;
      [key: string]: unknown;
    }) =>
      ReactActual.createElement(
        RNTouchableOpacity,
        {
          onPress,
          disabled: isDisabled || isLoading,
          testID,
          ...props,
        },
        ReactActual.createElement(Text, {}, children),
      ),
    Text: ({
      children,
      ...props
    }: {
      children?: React.ReactNode;
      [key: string]: unknown;
    }) => ReactActual.createElement(Text, props, children),
    ButtonSize: {
      Lg: 'lg',
    },
    ButtonVariant: {
      Secondary: 'secondary',
    },
    TextVariant: {
      BodySm: 'BodySm',
    },
  };
});

jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      claimButtonContainer: {
        paddingHorizontal: 16,
        marginBottom: 16,
      },
    },
  }),
}));

const mockUseMerklClaim = useMerklClaim as jest.MockedFunction<
  typeof useMerklClaim
>;

const mockUsePendingMerklClaim = usePendingMerklClaim as jest.MockedFunction<
  typeof usePendingMerklClaim
>;

const mockAsset: TokenI = {
  name: 'Angle Merkl',
  symbol: 'aglaMerkl',
  address: '0x8d652c6d4A8F3Db96Cd866C1a9220B1447F29898' as const,
  chainId: CHAIN_IDS.MAINNET,
  decimals: 18,
  aggregators: [],
  image: '',
  balance: '1000',
  balanceFiat: '$100',
  logo: '',
  isETH: false,
  isNative: false,
};

describe('ClaimMerklRewards', () => {
  const mockClaimRewards = jest.fn();
  const mockEventBuilder = {
    addProperties: jest.fn().mockReturnThis(),
    build: jest.fn().mockReturnValue({ event: 'mock-event' }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateEventBuilder.mockReturnValue(mockEventBuilder);
    mockUseMerklClaim.mockReturnValue({
      claimRewards: mockClaimRewards,
      isClaiming: false,
      error: null,
    });
    mockUsePendingMerklClaim.mockReturnValue({
      hasPendingClaim: false,
    });
  });

  it('renders claim button', () => {
    const { getByText } = render(<ClaimMerklRewards asset={mockAsset} />);

    expect(getByText('Claim')).toBeTruthy();
  });

  it('navigates to bottom sheet modal when claim button is pressed', () => {
    const { getByText } = render(<ClaimMerklRewards asset={mockAsset} />);

    fireEvent.press(getByText('Claim'));

    expect(mockNavigateToModal).toHaveBeenCalledWith(
      'RootModalFlow',
      expect.objectContaining({
        screen: 'ClaimOnLineaModal',
        params: expect.objectContaining({
          onContinue: expect.any(Function),
        }),
      }),
    );
  });

  it('disables button when isClaiming is true', () => {
    mockUseMerklClaim.mockReturnValue({
      claimRewards: mockClaimRewards,
      isClaiming: true,
      error: null,
    });

    const { getByTestId } = render(<ClaimMerklRewards asset={mockAsset} />);
    const buttonElement = getByTestId('claim-merkl-rewards-button');

    expect(buttonElement.props.disabled).toBe(true);
  });

  it('displays generic error message when error is present', () => {
    mockUseMerklClaim.mockReturnValue({
      claimRewards: mockClaimRewards,
      isClaiming: false,
      error: 'Some internal error details',
    });

    const { getByText, queryByText } = render(
      <ClaimMerklRewards asset={mockAsset} />,
    );

    // Should display generic error message, not the actual error
    expect(getByText('Unexpected error. Please try again.')).toBeTruthy();
    expect(queryByText('Some internal error details')).toBeNull();
  });

  it('does not display error message when error is null', () => {
    mockUseMerklClaim.mockReturnValue({
      claimRewards: mockClaimRewards,
      isClaiming: false,
      error: null,
    });

    const { queryByText } = render(<ClaimMerklRewards asset={mockAsset} />);

    expect(queryByText('Unexpected error. Please try again.')).toBeNull();
  });

  it('tracks analytics event when claim button is clicked', () => {
    const { getByText } = render(<ClaimMerklRewards asset={mockAsset} />);
    const claimButton = getByText('Claim');

    fireEvent.press(claimButton);

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.MUSD_CLAIM_BONUS_BUTTON_CLICKED,
    );
    expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
      location: 'asset_overview',
      action_type: 'claim_bonus',
      button_text: 'Claim',
      network_chain_id: mockAsset.chainId,
      network_name: 'Ethereum Mainnet',
      asset_symbol: mockAsset.symbol,
    });
    expect(mockEventBuilder.build).toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalledWith({ event: 'mock-event' });
  });

  it('navigates to home page after successful claim via onContinue callback', async () => {
    mockClaimRewards.mockResolvedValue({ txHash: '0x123abc' });

    const { getByText } = render(<ClaimMerklRewards asset={mockAsset} />);

    // Press claim button
    fireEvent.press(getByText('Claim'));

    // Get the onContinue callback that was passed to the modal
    const navigateCall = mockNavigateToModal.mock.calls[0];
    const onContinue = navigateCall[1].params.onContinue;

    // Call the onContinue callback (simulating Continue button press in modal)
    await onContinue();

    await waitFor(() => {
      expect(mockClaimRewards).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('WalletTabHome');
    });

    // Note: After navigation, a scroll event is also emitted via DeviceEventEmitter
    // to scroll the token list to the Linea mUSD token (tested via integration tests)
  });

  it('does not navigate to home page when claim submission fails', async () => {
    const error = new Error('Claim failed');
    mockClaimRewards.mockRejectedValue(error);

    const { getByText } = render(<ClaimMerklRewards asset={mockAsset} />);

    // Press claim button
    fireEvent.press(getByText('Claim'));

    // Get the onContinue callback
    const navigateCall = mockNavigateToModal.mock.calls[0];
    const onContinue = navigateCall[1].params.onContinue;

    // Call onContinue (simulating Continue press)
    await onContinue();

    await waitFor(() => {
      expect(mockClaimRewards).toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it('does not navigate to home page when claim returns undefined', async () => {
    mockClaimRewards.mockResolvedValue(undefined);

    const { getByText } = render(<ClaimMerklRewards asset={mockAsset} />);

    // Press claim button
    fireEvent.press(getByText('Claim'));

    // Get the onContinue callback
    const navigateCall = mockNavigateToModal.mock.calls[0];
    const onContinue = navigateCall[1].params.onContinue;

    // Call onContinue
    await onContinue();

    await waitFor(() => {
      expect(mockClaimRewards).toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it('disables button when there is a pending claim transaction', () => {
    mockUsePendingMerklClaim.mockReturnValue({
      hasPendingClaim: true,
    });

    const { getByTestId } = render(<ClaimMerklRewards asset={mockAsset} />);
    const buttonElement = getByTestId('claim-merkl-rewards-button');

    expect(buttonElement.props.disabled).toBe(true);
  });

  it('disables button when both isClaiming and hasPendingClaim are true', () => {
    mockUseMerklClaim.mockReturnValue({
      claimRewards: mockClaimRewards,
      isClaiming: true,
      error: null,
    });
    mockUsePendingMerklClaim.mockReturnValue({
      hasPendingClaim: true,
    });

    const { getByTestId } = render(<ClaimMerklRewards asset={mockAsset} />);
    const buttonElement = getByTestId('claim-merkl-rewards-button');

    expect(buttonElement.props.disabled).toBe(true);
  });
});
