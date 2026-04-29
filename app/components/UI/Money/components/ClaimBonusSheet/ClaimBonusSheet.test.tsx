import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import ClaimBonusSheet from './ClaimBonusSheet';
import { ClaimBonusSheetTestIds } from './ClaimBonusSheet.testIds';

const mockOnCloseBottomSheet = jest.fn((cb?: () => void) => cb?.());
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockOnConfirm = jest.fn();

const mockRouteParams: {
  claimableReward: string | null;
  onConfirm: () => void;
} = { claimableReward: '3.65', onConfirm: () => mockOnConfirm() };

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: mockRouteParams }),
}));

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

describe('ClaimBonusSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams.claimableReward = '3.65';
    mockRouteParams.onConfirm = () => mockOnConfirm();
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

  it('invokes the onConfirm route param on Confirm and closes the sheet', () => {
    const { getByTestId } = renderWithProvider(<ClaimBonusSheet />);
    fireEvent.press(getByTestId(ClaimBonusSheetTestIds.CONFIRM_BUTTON));
    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it('closes the sheet without invoking onConfirm when Cancel is pressed', () => {
    const { getByTestId } = renderWithProvider(<ClaimBonusSheet />);
    fireEvent.press(getByTestId(ClaimBonusSheetTestIds.CANCEL_BUTTON));
    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('disables Confirm when there is no claimable reward', () => {
    mockRouteParams.claimableReward = null;
    const { getByTestId } = renderWithProvider(<ClaimBonusSheet />);
    fireEvent.press(getByTestId(ClaimBonusSheetTestIds.CONFIRM_BUTTON));
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });
});
