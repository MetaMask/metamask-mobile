import React from 'react';
import { View, Text } from 'react-native';
import AssetListBottomSheet from './AssetListBottomSheet';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { CardTokenAllowance, AllowanceState } from '../../types';
import { BottomSheetRef } from '../../../../../component-library/components/BottomSheets/BottomSheet';
import { ethers } from 'ethers';
import CardAssetItem from '../CardAssetItem';

jest.mock('../CardAssetItem', () => jest.fn());

const mockCardAssetItem = CardAssetItem as jest.MockedFunction<
  typeof CardAssetItem
>;

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const translations: { [key: string]: string } = {
      'card.select_asset': 'Select Asset',
    };
    return translations[key] || key;
  }),
}));

function renderWithProvider(component: React.ComponentType) {
  return renderScreen(
    component,
    {
      name: 'AssetListBottomSheet',
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );
}

describe('AssetListBottomSheet Component', () => {
  const mockSetOpenAssetListBottomSheet = jest.fn();
  const mockSheetRef = React.createRef<BottomSheetRef>();

  const mockBalance1: CardTokenAllowance = {
    address: '0x1234567890123456789012345678901234567890',
    chainId: '0x1',
    isStaked: false,
    decimals: 18,
    symbol: 'ETH',
    name: 'Ethereum',
    allowanceState: AllowanceState.NotActivated,
    allowance: ethers.BigNumber.from('0'),
  };

  const mockBalance2: CardTokenAllowance = {
    address: '0xa0b86a33e6c8e2c3c5b5f7ae5f7c5b5f7ae5f7c5b5f',
    chainId: '0x1',
    isStaked: false,
    decimals: 6,
    symbol: 'USDC',
    name: 'USD Coin',
    allowanceState: AllowanceState.Limited,
    allowance: ethers.BigNumber.from('1000000'),
  };

  const mockBalances = [mockBalance1, mockBalance2];

  beforeEach(() => {
    jest.clearAllMocks();

    mockCardAssetItem.mockImplementation(({ assetKey }) => (
      <View testID={`card-asset-item-${assetKey.address}`}>
        <Text>Mock CardAssetItem - {assetKey.address}</Text>
      </View>
    ));
  });

  it('renders with required props and matches snapshot', () => {
    const { toJSON } = renderWithProvider(() => (
      <AssetListBottomSheet
        setOpenAssetListBottomSheet={mockSetOpenAssetListBottomSheet}
        sheetRef={mockSheetRef}
        balances={mockBalances}
        privacyMode={false}
      />
    ));
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders with privacy mode enabled and matches snapshot', () => {
    const { toJSON } = renderWithProvider(() => (
      <AssetListBottomSheet
        setOpenAssetListBottomSheet={mockSetOpenAssetListBottomSheet}
        sheetRef={mockSheetRef}
        balances={mockBalances}
        privacyMode
      />
    ));
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders with empty balances array and matches snapshot', () => {
    const { toJSON } = renderWithProvider(() => (
      <AssetListBottomSheet
        setOpenAssetListBottomSheet={mockSetOpenAssetListBottomSheet}
        sheetRef={mockSheetRef}
        balances={[]}
        privacyMode={false}
      />
    ));
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders with single balance and matches snapshot', () => {
    const { toJSON } = renderWithProvider(() => (
      <AssetListBottomSheet
        setOpenAssetListBottomSheet={mockSetOpenAssetListBottomSheet}
        sheetRef={mockSheetRef}
        balances={[mockBalance1]}
        privacyMode={false}
      />
    ));
    expect(toJSON()).toMatchSnapshot();
  });

  it('displays the correct header text', () => {
    const { getByText } = renderWithProvider(() => (
      <AssetListBottomSheet
        setOpenAssetListBottomSheet={mockSetOpenAssetListBottomSheet}
        sheetRef={mockSheetRef}
        balances={mockBalances}
        privacyMode={false}
      />
    ));

    expect(getByText('Select Asset')).toBeTruthy();
  });

  it('renders all provided balances as CardAssetItems', () => {
    const { getByTestId } = renderWithProvider(() => (
      <AssetListBottomSheet
        setOpenAssetListBottomSheet={mockSetOpenAssetListBottomSheet}
        sheetRef={mockSheetRef}
        balances={mockBalances}
        privacyMode={false}
      />
    ));

    expect(getByTestId(`card-asset-item-${mockBalance1.address}`)).toBeTruthy();
    expect(getByTestId(`card-asset-item-${mockBalance2.address}`)).toBeTruthy();
  });

  it('renders CardAssetItems with correct props', () => {
    const { getByText } = renderWithProvider(() => (
      <AssetListBottomSheet
        setOpenAssetListBottomSheet={mockSetOpenAssetListBottomSheet}
        sheetRef={mockSheetRef}
        balances={mockBalances}
        privacyMode={false}
      />
    ));

    expect(
      getByText(`Mock CardAssetItem - ${mockBalance1.address}`),
    ).toBeTruthy();
    expect(
      getByText(`Mock CardAssetItem - ${mockBalance2.address}`),
    ).toBeTruthy();
  });

  it('calls setOpenAssetListBottomSheet when BottomSheet onClose is triggered', () => {
    const { toJSON } = renderWithProvider(() => (
      <AssetListBottomSheet
        setOpenAssetListBottomSheet={mockSetOpenAssetListBottomSheet}
        sheetRef={mockSheetRef}
        balances={mockBalances}
        privacyMode={false}
      />
    ));

    expect(toJSON()).toBeTruthy();
  });

  it('calls setOpenAssetListBottomSheet when BottomSheetHeader onClose is triggered', () => {
    const { toJSON } = renderWithProvider(() => (
      <AssetListBottomSheet
        setOpenAssetListBottomSheet={mockSetOpenAssetListBottomSheet}
        sheetRef={mockSheetRef}
        balances={mockBalances}
        privacyMode={false}
      />
    ));

    expect(toJSON()).toBeTruthy();
  });
  it('generates unique keys for each CardAssetItem', () => {
    const duplicateBalance = { ...mockBalance1 };
    const balancesWithDuplicate = [
      mockBalance1,
      duplicateBalance,
      mockBalance2,
    ];

    const { getAllByText } = renderWithProvider(() => (
      <AssetListBottomSheet
        setOpenAssetListBottomSheet={mockSetOpenAssetListBottomSheet}
        sheetRef={mockSheetRef}
        balances={balancesWithDuplicate}
        privacyMode={false}
      />
    ));

    const ethItems = getAllByText(
      `Mock CardAssetItem - ${mockBalance1.address}`,
    );
    expect(ethItems).toHaveLength(2); // Two ETH items

    const usdcItems = getAllByText(
      `Mock CardAssetItem - ${mockBalance2.address}`,
    );
    expect(usdcItems).toHaveLength(1); // One USDC item
  });

  it('passes privacyMode prop to CardAssetItems correctly', () => {
    const { toJSON } = renderWithProvider(() => (
      <AssetListBottomSheet
        setOpenAssetListBottomSheet={mockSetOpenAssetListBottomSheet}
        sheetRef={mockSheetRef}
        balances={[mockBalance1]}
        privacyMode
      />
    ));

    expect(toJSON()).toBeTruthy();
  });

  it('handles ref prop correctly', () => {
    const { toJSON } = renderWithProvider(() => (
      <AssetListBottomSheet
        setOpenAssetListBottomSheet={mockSetOpenAssetListBottomSheet}
        sheetRef={mockSheetRef}
        balances={mockBalances}
        privacyMode={false}
      />
    ));

    expect(toJSON()).toBeTruthy();
  });
});
