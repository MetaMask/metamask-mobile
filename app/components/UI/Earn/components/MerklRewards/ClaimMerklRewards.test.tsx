import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import ClaimMerklRewards from './ClaimMerklRewards';
import { useMerklClaim } from './hooks/useMerklClaim';
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

const mockNavigate = jest.fn();
jest.mock('../../../../../core/NavigationService', () => ({
  __esModule: true,
  default: {
    navigation: {
      navigate: (route: string) => mockNavigate(route),
    },
  },
}));

jest.mock('../../../../../constants/navigation/Routes', () => ({
  WALLET: {
    HOME: 'WalletTabHome',
  },
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
    const { getByText } = render(<ClaimMerklRewards asset={mockAsset} />);

    expect(getByText('Claim')).toBeTruthy();
  });

  it('calls claimRewards when button is pressed', async () => {
    mockClaimRewards.mockResolvedValue({ txHash: '0x123abc' });

    const { getByText } = render(<ClaimMerklRewards asset={mockAsset} />);
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

    const { getByTestId } = render(<ClaimMerklRewards asset={mockAsset} />);
    const buttonElement = getByTestId('claim-merkl-rewards-button');

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

  it('tracks analytics event when claim button is clicked', async () => {
    mockClaimRewards.mockResolvedValue(undefined);

    const { getByText } = render(<ClaimMerklRewards asset={mockAsset} />);
    const claimButton = getByText('Claim');

    fireEvent.press(claimButton);

    await waitFor(() => {
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
  });

  it('navigates to home page after successful claim submission', async () => {
    mockClaimRewards.mockResolvedValue({ txHash: '0x123abc' });

    const { getByText } = render(<ClaimMerklRewards asset={mockAsset} />);
    const claimButton = getByText('Claim');

    fireEvent.press(claimButton);

    await waitFor(() => {
      expect(mockClaimRewards).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('WalletTabHome');
    });
  });

  it('does not navigate to home page when claim submission fails', async () => {
    const error = new Error('Claim failed');
    mockClaimRewards.mockRejectedValue(error);

    const { getByText } = render(<ClaimMerklRewards asset={mockAsset} />);
    const claimButton = getByText('Claim');

    fireEvent.press(claimButton);

    await waitFor(() => {
      expect(mockClaimRewards).toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it('does not navigate to home page when claim returns undefined', async () => {
    mockClaimRewards.mockResolvedValue(undefined);

    const { getByText } = render(<ClaimMerklRewards asset={mockAsset} />);
    const claimButton = getByText('Claim');

    fireEvent.press(claimButton);

    await waitFor(() => {
      expect(mockClaimRewards).toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});
