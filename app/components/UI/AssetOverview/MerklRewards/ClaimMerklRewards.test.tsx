import React from 'react';
import { TouchableOpacity } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import ClaimMerklRewards from './ClaimMerklRewards';
import { useMerklClaim } from '../hooks/useMerklClaim';

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const mockStrings: Record<string, string> = {
      'asset_overview.merkl_rewards.claim': 'Claim',
    };
    return mockStrings[key] || key;
  },
}));

jest.mock('../hooks/useMerklClaim');

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { Text, TouchableOpacity } = jest.requireActual('react-native');
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
        TouchableOpacity,
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

jest.mock('../../../../component-library/hooks', () => ({
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

describe('ClaimMerklRewards', () => {
  const mockClaimRewards = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMerklClaim.mockReturnValue({
      claimRewards: mockClaimRewards,
      isClaiming: false,
      error: null,
    });
  });

  it('renders claim button', () => {
    const { getByText } = render(<ClaimMerklRewards />);

    expect(getByText('Claim')).toBeTruthy();
  });

  it('calls claimRewards when button is pressed', async () => {
    mockClaimRewards.mockResolvedValue(undefined);

    const { getByText } = render(<ClaimMerklRewards />);
    const claimButton = getByText('Claim');

    fireEvent.press(claimButton);

    await waitFor(() => {
      expect(mockClaimRewards).toHaveBeenCalledTimes(1);
    });
  });

  it('disables button when isClaiming is true', () => {
    mockUseMerklClaim.mockReturnValue({
      claimRewards: mockClaimRewards,
      isClaiming: true,
      error: null,
    });

    const { UNSAFE_root } = render(<ClaimMerklRewards />);
    const buttonElement = UNSAFE_root.findByType(TouchableOpacity);

    expect(buttonElement.props.disabled).toBe(true);
  });

  it('displays error message when error is present', () => {
    const errorMessage = 'Failed to claim rewards';
    mockUseMerklClaim.mockReturnValue({
      claimRewards: mockClaimRewards,
      isClaiming: false,
      error: errorMessage,
    });

    const { getByText } = render(<ClaimMerklRewards />);

    expect(getByText(errorMessage)).toBeTruthy();
  });

  it('does not display error message when error is null', () => {
    mockUseMerklClaim.mockReturnValue({
      claimRewards: mockClaimRewards,
      isClaiming: false,
      error: null,
    });

    const { queryByText } = render(<ClaimMerklRewards />);

    expect(queryByText('Failed')).toBeNull();
  });

  it('handles claim error gracefully', async () => {
    const error = new Error('Claim failed');
    mockClaimRewards.mockRejectedValue(error);

    const { getByText } = render(<ClaimMerklRewards />);
    const claimButton = getByText('Claim');

    fireEvent.press(claimButton);

    // Error is handled by useMerklClaim hook and displayed via error state
    await waitFor(() => {
      expect(mockClaimRewards).toHaveBeenCalled();
    });
  });
});
