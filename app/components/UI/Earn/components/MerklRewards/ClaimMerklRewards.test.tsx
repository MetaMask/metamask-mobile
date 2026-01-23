import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import ClaimMerklRewards from './ClaimMerklRewards';
import { useMerklClaim } from './hooks/useMerklClaim';
import { TokenI } from '../../../Tokens/types';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import { EARN_EXPERIENCES } from '../../constants/experiences';

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();

jest.mock('../../../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
  MetaMetricsEvents: {
    EARN_LENDING_WITHDRAW_BUTTON_CLICKED:
      'Earn Lending Withdraw Button Clicked',
  },
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => ({ name: 'Ethereum Mainnet' })),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const mockStrings: Record<string, string> = {
      'asset_overview.merkl_rewards.claim': 'Claim',
    };
    return mockStrings[key] || key;
  },
}));

jest.mock('./hooks/useMerklClaim', () => ({
  useMerklClaim: jest.fn(),
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
  const mockOnClaimSuccess = jest.fn();
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
  });

  it('renders claim button', () => {
    const { getByText } = render(
      <ClaimMerklRewards
        asset={mockAsset}
        onClaimSuccess={mockOnClaimSuccess}
      />,
    );

    expect(getByText('Claim')).toBeTruthy();
  });

  it('calls claimRewards when button is pressed and onClaimSuccess on transaction confirmation', async () => {
    // Capture the onTransactionConfirmed callback passed to useMerklClaim
    let capturedOnTransactionConfirmed: (() => void) | undefined;
    mockUseMerklClaim.mockImplementation(
      ({
        onTransactionConfirmed,
      }: {
        asset: TokenI;
        onTransactionConfirmed?: () => void;
      }) => {
        capturedOnTransactionConfirmed = onTransactionConfirmed;
        return {
          claimRewards: mockClaimRewards,
          isClaiming: false,
          error: null,
        };
      },
    );

    mockClaimRewards.mockResolvedValue(undefined);

    const { getByText } = render(
      <ClaimMerklRewards
        asset={mockAsset}
        onClaimSuccess={mockOnClaimSuccess}
      />,
    );
    const claimButton = getByText('Claim');

    fireEvent.press(claimButton);

    // Wait for claimRewards to be called
    await waitFor(() => {
      expect(mockClaimRewards).toHaveBeenCalledTimes(1);
    });

    // Simulate transaction confirmation by calling the captured callback
    expect(capturedOnTransactionConfirmed).toBeDefined();
    capturedOnTransactionConfirmed?.();

    // onClaimSuccess should be called when transaction is confirmed
    expect(mockOnClaimSuccess).toHaveBeenCalledTimes(1);
  });

  it('disables button when isClaiming is true', () => {
    const { TouchableOpacity: RNTouchableOpacity } =
      jest.requireActual('react-native');

    mockUseMerklClaim.mockReturnValue({
      claimRewards: mockClaimRewards,
      isClaiming: true,
      error: null,
    });

    const { UNSAFE_root } = render(
      <ClaimMerklRewards
        asset={mockAsset}
        onClaimSuccess={mockOnClaimSuccess}
      />,
    );
    const buttonElement = UNSAFE_root.findByType(RNTouchableOpacity);

    expect(buttonElement.props.disabled).toBe(true);
  });

  it('displays error message when error is present', () => {
    const errorMessage = 'Failed to claim rewards';
    mockUseMerklClaim.mockReturnValue({
      claimRewards: mockClaimRewards,
      isClaiming: false,
      error: errorMessage,
    });

    const { getByText } = render(
      <ClaimMerklRewards
        asset={mockAsset}
        onClaimSuccess={mockOnClaimSuccess}
      />,
    );

    expect(getByText(errorMessage)).toBeTruthy();
  });

  it('does not display error message when error is null', () => {
    mockUseMerklClaim.mockReturnValue({
      claimRewards: mockClaimRewards,
      isClaiming: false,
      error: null,
    });

    const { queryByText } = render(
      <ClaimMerklRewards
        asset={mockAsset}
        onClaimSuccess={mockOnClaimSuccess}
      />,
    );

    expect(queryByText('Failed')).toBeNull();
  });

  it('does not call onClaimSuccess when claim fails', async () => {
    const error = new Error('Claim failed');
    mockClaimRewards.mockRejectedValue(error);

    const { getByText } = render(
      <ClaimMerklRewards
        asset={mockAsset}
        onClaimSuccess={mockOnClaimSuccess}
      />,
    );
    const claimButton = getByText('Claim');

    fireEvent.press(claimButton);

    await waitFor(() => {
      expect(mockClaimRewards).toHaveBeenCalled();
      expect(mockOnClaimSuccess).not.toHaveBeenCalled();
    });
  });

  it('tracks analytics event when claim button is clicked', async () => {
    mockClaimRewards.mockResolvedValue(undefined);

    const { getByText } = render(
      <ClaimMerklRewards
        asset={mockAsset}
        onClaimSuccess={mockOnClaimSuccess}
      />,
    );
    const claimButton = getByText('Claim');

    fireEvent.press(claimButton);

    await waitFor(() => {
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.EARN_LENDING_WITHDRAW_BUTTON_CLICKED,
      );
      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
        action_type: 'claim_rewards',
        token: mockAsset.symbol,
        chain_id: mockAsset.chainId,
        network: 'Ethereum Mainnet',
        location: 'asset_details',
        experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
      });
      expect(mockEventBuilder.build).toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalledWith({ event: 'mock-event' });
    });
  });
});
