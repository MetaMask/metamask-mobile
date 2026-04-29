import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import ClaimBonusSheet from './ClaimBonusSheet';
import { ClaimBonusSheetTestIds } from './ClaimBonusSheet.testIds';
import { useMerklBonusClaim } from '../../../Earn/components/MerklRewards/hooks/useMerklBonusClaim';

const mockOnCloseBottomSheet = jest.fn((cb?: () => void) => cb?.());
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockClaimRewards = jest.fn(() => Promise.resolve(undefined));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

jest.mock(
  '../../../Earn/components/MerklRewards/hooks/useMerklBonusClaim',
  () => ({
    useMerklBonusClaim: jest.fn(),
  }),
);

jest.mock('../../../../../selectors/accountsController', () => ({
  ...jest.requireActual('../../../../../selectors/accountsController'),
  selectSelectedInternalAccount: () => ({
    metadata: { name: 'Account 1' },
  }),
}));

jest.mock('../../../../../selectors/networkController', () => ({
  ...jest.requireActual('../../../../../selectors/networkController'),
  selectNetworkConfigurationByChainId: () => ({ name: 'Linea' }),
}));

jest.mock('../../../../../util/networks', () => ({
  ...jest.requireActual('../../../../../util/networks'),
  getNetworkImageSource: () => 1,
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const { forwardRef, useImperativeHandle } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const MockBottomSheet = forwardRef(
    (
      { children, testID }: { children: React.ReactNode; testID?: string },
      ref: React.Ref<{ onCloseBottomSheet: (cb?: () => void) => void }>,
    ) => {
      useImperativeHandle(ref, () => ({
        onCloseBottomSheet: mockOnCloseBottomSheet,
        onOpenBottomSheet: jest.fn(),
      }));
      return <View testID={testID}>{children}</View>;
    },
  );
  const MockBottomSheetHeader = ({
    children,
  }: {
    children: React.ReactNode;
  }) => <View>{children}</View>;
  return {
    ...actual,
    BottomSheet: MockBottomSheet,
    BottomSheetHeader: MockBottomSheetHeader,
  };
});

const mockUseMerklBonusClaim = jest.mocked(useMerklBonusClaim);

const baseClaimData = {
  claimableReward: '3.65',
  lifetimeBonusClaimed: '0.00',
  hasPendingClaim: false,
  isClaiming: false,
  error: null,
  claimRewards: mockClaimRewards,
  refetch: jest.fn(),
};

describe('ClaimBonusSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMerklBonusClaim.mockReturnValue(baseClaimData);
  });

  it('renders the title, account, network and amount', () => {
    const { getByText, getByTestId } = renderWithProvider(<ClaimBonusSheet />);
    expect(getByText('Claim bonus')).toBeOnTheScreen();
    expect(getByText('Bonus will be paid out on Linea.')).toBeOnTheScreen();
    expect(getByTestId(ClaimBonusSheetTestIds.AMOUNT_TOKEN)).toHaveTextContent(
      '3.65 mUSD',
    );
    expect(getByTestId(ClaimBonusSheetTestIds.AMOUNT_FIAT)).toHaveTextContent(
      '$3.65',
    );
    expect(getByTestId(ClaimBonusSheetTestIds.ACCOUNT_VALUE)).toHaveTextContent(
      'Account 1',
    );
    expect(getByTestId(ClaimBonusSheetTestIds.NETWORK_VALUE)).toHaveTextContent(
      'Linea',
    );
  });

  it('triggers claimRewards on Confirm and closes the sheet', () => {
    const { getByTestId } = renderWithProvider(<ClaimBonusSheet />);
    fireEvent.press(getByTestId(ClaimBonusSheetTestIds.CONFIRM_BUTTON));
    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockClaimRewards).toHaveBeenCalledTimes(1);
  });

  it('closes the sheet without claiming when Cancel is pressed', () => {
    const { getByTestId } = renderWithProvider(<ClaimBonusSheet />);
    fireEvent.press(getByTestId(ClaimBonusSheetTestIds.CANCEL_BUTTON));
    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockClaimRewards).not.toHaveBeenCalled();
  });

  it('disables Confirm when there is no claimable reward', () => {
    mockUseMerklBonusClaim.mockReturnValue({
      ...baseClaimData,
      claimableReward: null,
    });
    const { getByTestId } = renderWithProvider(<ClaimBonusSheet />);
    fireEvent.press(getByTestId(ClaimBonusSheetTestIds.CONFIRM_BUTTON));
    expect(mockClaimRewards).not.toHaveBeenCalled();
  });
});
