import React from 'react';
import type { DeFiProtocolPositionGroup } from '@metamask/assets-controllers';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import DeFiProtocolPositionDetailsV2 from './DeFiProtocolPositionDetailsV2';

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

let mockLastDetailsViewProps: Record<string, unknown> | null = null;
jest.mock('./DeFiProtocolPositionDetailsView', () => ({
  __esModule: true,
  default: (props: { children: React.ReactNode }) => {
    const { View } = jest.requireActual('react-native');
    mockLastDetailsViewProps = props;
    return <View testID="details-view">{props.children}</View>;
  },
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

describe('DeFiProtocolPositionDetailsV2', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLastDetailsViewProps = null;
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

    expect(queryByTestId('details-view')).toBeNull();
    expect(queryByTestId('position-groups')).toBeNull();
  });

  it('renders the details view and groups from the navigation params', () => {
    mockUseParams.mockReturnValue({
      protocolPositionGroup: mockGroup,
      networkIconAvatar: 42,
    });

    const { getByTestId } = renderWithProvider(
      <DeFiProtocolPositionDetailsV2 />,
      { state: mockInitialState },
    );

    expect(getByTestId('details-view')).toBeOnTheScreen();
    expect(getByTestId('position-groups')).toBeOnTheScreen();
  });

  it('maps the group fields onto the details view props', () => {
    mockSelectPrivacyMode.mockReturnValue(true);
    mockUseParams.mockReturnValue({
      protocolPositionGroup: mockGroup,
      networkIconAvatar: 42,
    });

    renderWithProvider(<DeFiProtocolPositionDetailsV2 />, {
      state: mockInitialState,
    });

    expect(mockLastDetailsViewProps).toMatchObject({
      title: 'Aave V3',
      marketValue: 4100.5,
      iconUrl: 'https://example.com/aave.png',
      networkIconAvatar: 42,
      privacyMode: true,
    });
  });

  it('forwards the group, network avatar and privacy mode to the groups component', () => {
    mockSelectPrivacyMode.mockReturnValue(true);
    mockUseParams.mockReturnValue({
      protocolPositionGroup: mockGroup,
      networkIconAvatar: 42,
    });

    renderWithProvider(<DeFiProtocolPositionDetailsV2 />, {
      state: mockInitialState,
    });

    expect(mockLastGroupsProps).toMatchObject({
      protocolPositionGroup: mockGroup,
      networkIconAvatar: 42,
      privacyMode: true,
    });
  });
});
