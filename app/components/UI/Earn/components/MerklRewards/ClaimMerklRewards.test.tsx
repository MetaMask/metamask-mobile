import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import ClaimMerklRewards from './ClaimMerklRewards';
import { useMerklClaim } from './hooks/useMerklClaim';
import { TokenI } from '../../../Tokens/types';
import { CHAIN_IDS } from '@metamask/transaction-controller';

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

// Add this to track calls
let mockUseMerklClaimCalls: Parameters<typeof useMerklClaim>[] = [];

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

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMerklClaimCalls = [];
    mockUseMerklClaim.mockImplementation((options) => {
      mockUseMerklClaimCalls.push(options);
      return {
        claimRewards: mockClaimRewards,
        isClaiming: false,
        error: null,
      };
    });
  });

  it('renders claim button', () => {
    const { getByText } = render(<ClaimMerklRewards asset={mockAsset} />);

    expect(getByText('Claim')).toBeTruthy();
  });

  it('calls claimRewards when button is pressed', async () => {
    mockClaimRewards.mockResolvedValue(undefined);

    const { getByText } = render(<ClaimMerklRewards asset={mockAsset} />);
    const claimButton = getByText('Claim');

    fireEvent.press(claimButton);

    await waitFor(() => {
      expect(mockClaimRewards).toHaveBeenCalledTimes(1);
    });
  });

  it('disables button when isClaiming is true', () => {
    const { TouchableOpacity: RNTouchableOpacity } =
      jest.requireActual('react-native');

    mockUseMerklClaim.mockReturnValue({
      claimRewards: mockClaimRewards,
      isClaiming: true,
      error: null,
    });

    const { UNSAFE_root } = render(<ClaimMerklRewards asset={mockAsset} />);
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

    const { getByText } = render(<ClaimMerklRewards asset={mockAsset} />);

    expect(getByText(errorMessage)).toBeTruthy();
  });

  it('does not display error message when error is null', () => {
    mockUseMerklClaim.mockReturnValue({
      claimRewards: mockClaimRewards,
      isClaiming: false,
      error: null,
    });

    const { queryByText } = render(<ClaimMerklRewards asset={mockAsset} />);

    expect(queryByText('Failed')).toBeNull();
  });

  it('handles claim error gracefully', async () => {
    const error = new Error('Claim failed');
    mockClaimRewards.mockRejectedValue(error);

    const { getByText } = render(<ClaimMerklRewards asset={mockAsset} />);
    const claimButton = getByText('Claim');

    fireEvent.press(claimButton);

    // Error is handled by useMerklClaim hook and displayed via error state
    await waitFor(() => {
      expect(mockClaimRewards).toHaveBeenCalled();
    });
  });

  it('passes onRefetch to useMerklClaim as onClaimSuccess', () => {
    const mockOnRefetch = jest.fn();

    render(<ClaimMerklRewards asset={mockAsset} onRefetch={mockOnRefetch} />);

    expect(mockUseMerklClaimCalls.length).toBe(1);
    expect(mockUseMerklClaimCalls[0]).toEqual({
      asset: mockAsset,
      onClaimSuccess: mockOnRefetch,
    });
  });

  it('works without onRefetch prop', () => {
    render(<ClaimMerklRewards asset={mockAsset} />);

    expect(mockUseMerklClaimCalls.length).toBe(1);
    expect(mockUseMerklClaimCalls[0]).toEqual({
      asset: mockAsset,
      onClaimSuccess: undefined,
    });
  });
});
