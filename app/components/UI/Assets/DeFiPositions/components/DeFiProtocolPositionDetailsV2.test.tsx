import React from 'react';
import type { DeFiProtocolPositionGroup } from '@metamask/assets-controllers';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import DeFiProtocolPositionDetailsV2, {
  DEFI_PROTOCOL_POSITION_DETAILS_BALANCE_TEST_ID,
} from './DeFiProtocolPositionDetailsV2';
import { WalletViewSelectorsIDs } from '../../../../Views/Wallet/WalletView.testIds';
import { CommonSelectorsIDs } from '../../../../../util/Common.testIds';

const mockUseParams = jest.fn();
jest.mock('../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../util/navigation/navUtils'),
  useParams: () => mockUseParams(),
}));

const mockSelectPrivacyMode = jest.fn();
jest.mock('../../../../../selectors/preferencesController', () => ({
  ...jest.requireActual('../../../../../selectors/preferencesController'),
  selectPrivacyMode: () => mockSelectPrivacyMode(),
}));

const mockPop = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ pop: mockPop }),
}));

let mockLastGroupsProps: Record<string, unknown> | null = null;
jest.mock('./DeFiProtocolPositionGroupsV2', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    const { View } = jest.requireActual('react-native');
    mockLastGroupsProps = props;
    return <View testID="position-groups" />;
  },
}));

const mockInitialState = { engine: { backgroundState } };

const mockGroup: DeFiProtocolPositionGroup = {
  protocolId: 'Aave V3',
  productName: 'Aave V3',
  protocolIconUrl: 'https://example.com/aave.png',
  chainId: 'eip155:1',
  marketValue: 4100.5,
  iconGroup: [],
  sections: [],
};

const renderWithGroup = (
  group: DeFiProtocolPositionGroup | undefined = mockGroup,
  networkIconAvatar: number | undefined = 42,
) => {
  mockUseParams.mockReturnValue({
    protocolPositionGroup: group,
    networkIconAvatar,
  });
  return renderWithProvider(<DeFiProtocolPositionDetailsV2 />, {
    state: mockInitialState,
  });
};

describe('DeFiProtocolPositionDetailsV2', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLastGroupsProps = null;
    mockSelectPrivacyMode.mockReturnValue(false);
  });

  it('renders nothing when no protocol position group is provided', () => {
    mockUseParams.mockReturnValue({
      protocolPositionGroup: undefined,
      networkIconAvatar: undefined,
    });

    const { queryByTestId } = renderWithProvider(
      <DeFiProtocolPositionDetailsV2 />,
      { state: mockInitialState },
    );

    expect(
      queryByTestId(WalletViewSelectorsIDs.DEFI_POSITIONS_DETAILS_CONTAINER),
    ).toBeNull();
    expect(queryByTestId('position-groups')).toBeNull();
  });

  it('renders the container, title, formatted market value and groups', () => {
    const { getByTestId, getByText } = renderWithGroup();

    expect(
      getByTestId(WalletViewSelectorsIDs.DEFI_POSITIONS_DETAILS_CONTAINER),
    ).toBeOnTheScreen();
    expect(getByText('Aave V3')).toBeOnTheScreen();
    expect(
      getByTestId(DEFI_PROTOCOL_POSITION_DETAILS_BALANCE_TEST_ID),
    ).toHaveTextContent('$4,100.50');
    expect(getByTestId('position-groups')).toBeOnTheScreen();
  });

  it('formats an undefined market value as zero', () => {
    const { getByTestId } = renderWithGroup({
      ...mockGroup,
      marketValue: undefined as unknown as number,
    });

    expect(
      getByTestId(DEFI_PROTOCOL_POSITION_DETAILS_BALANCE_TEST_ID),
    ).toHaveTextContent('$0.00');
  });

  it('hides the market value in privacy mode', () => {
    mockSelectPrivacyMode.mockReturnValue(true);

    const { getByTestId, queryByText } = renderWithGroup();

    expect(queryByText('$4,100.50')).toBeNull();
    expect(
      getByTestId(DEFI_PROTOCOL_POSITION_DETAILS_BALANCE_TEST_ID),
    ).toBeOnTheScreen();
  });

  it('forwards the group, network avatar and privacy mode to the groups component', () => {
    mockSelectPrivacyMode.mockReturnValue(true);
    renderWithGroup();

    expect(mockLastGroupsProps).toMatchObject({
      protocolPositionGroup: mockGroup,
      networkIconAvatar: 42,
      privacyMode: true,
    });
  });

  it('navigates back when the back button is pressed', () => {
    const { getByTestId } = renderWithGroup();

    fireEvent.press(getByTestId(CommonSelectorsIDs.BACK_ARROW_BUTTON));

    expect(mockPop).toHaveBeenCalledTimes(1);
  });
});
