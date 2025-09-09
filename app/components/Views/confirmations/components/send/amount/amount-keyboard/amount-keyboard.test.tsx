import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { merge } from 'lodash';

import { mockTheme } from '../../../../../../../util/theme';
import renderWithProvider, {
  ProviderValues,
} from '../../../../../../../util/test/renderWithProvider';
import {
  ETHEREUM_ADDRESS,
  evmSendStateMock,
  MOCK_NFT1155,
} from '../../../../__mocks__/send.mock';
import { usePercentageAmount } from '../../../../hooks/send/usePercentageAmount';
import { useSendContext } from '../../../../context/send-context';
import { useRouteParams } from '../../../../hooks/send/useRouteParams';
import { getBackgroundColor } from './amount-keyboard.styles';
import { AmountKeyboard } from './amount-keyboard';

jest.mock('../../../../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn().mockReturnValue('mainnet'),
    },
    AssetsContractController: {
      getERC721AssetSymbol: () => Promise.resolve(undefined),
    },
  },
}));

jest.mock(
  '../../../../../../../components/Views/confirmations/hooks/gas/useGasFeeEstimates',
  () => ({
    useGasFeeEstimates: () => ({
      gasFeeEstimates: { medium: { suggestedMaxFeePerGas: 1.5 } },
    }),
  }),
);

jest.mock('../../../../context/send-context', () => ({
  useSendContext: jest.fn(),
}));

jest.mock('../../../../hooks/send/usePercentageAmount', () => ({
  usePercentageAmount: jest.fn(),
}));

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
  useRoute: jest.fn().mockReturnValue({
    params: {
      asset: {
        chainId: '0x1',
      },
    },
    name: 'send_route',
  }),
}));

const MOCK_EVM_ASSET = {
  chainId: '0x1',
  address: ETHEREUM_ADDRESS,
  isNative: true,
  symbol: 'ETH',
  decimals: 18,
};

const mockUseSendContext = useSendContext as jest.MockedFunction<
  typeof useSendContext
>;

const mockUsePercentageAmount = usePercentageAmount as jest.MockedFunction<
  typeof usePercentageAmount
>;

const renderComponent = (
  mockState?: ProviderValues['state'],
  amount = '100',
) => {
  const state = mockState
    ? merge(evmSendStateMock, mockState)
    : evmSendStateMock;

  const Comp = () => {
    useRouteParams();
    return (
      <AmountKeyboard
        amount={amount}
        fiatMode={false}
        updateAmount={() => undefined}
      />
    );
  };

  return renderWithProvider(<Comp />, {
    state,
  });
};

describe('Amount', () => {
  beforeEach(() => {
    mockUsePercentageAmount.mockReturnValue({
      getPercentageAmount: () => 10,
      isMaxAmountSupported: true,
    } as unknown as ReturnType<typeof usePercentageAmount>);
  });

  it('renders correctly', () => {
    mockUseSendContext.mockReturnValue({
      asset: MOCK_EVM_ASSET,
      updateAsset: jest.fn(),
    } as unknown as ReturnType<typeof useSendContext>);

    const { getByText } = renderComponent();
    expect(getByText('Continue')).toBeTruthy();
  });

  it('next button is disabled for NFT if amount is undefined', () => {
    mockUseSendContext.mockReturnValue({
      asset: MOCK_NFT1155,
      updateAsset: jest.fn(),
    } as unknown as ReturnType<typeof useSendContext>);

    const { getByRole } = renderComponent(undefined, '');
    expect(
      getByRole('button', { name: 'Next' }).props.style.backgroundColor,
    ).toEqual('#4459ff1a');
  });

  it('call updateValue with MaxMode true when Max button is pressed', () => {
    const mockUpdateValue = jest.fn();
    mockUseSendContext.mockReturnValue({
      asset: MOCK_EVM_ASSET,
      updateValue: mockUpdateValue,
      updateAsset: jest.fn(),
    } as unknown as ReturnType<typeof useSendContext>);

    const { getByRole } = renderComponent(undefined, '');
    fireEvent.press(getByRole('button', { name: 'Max' }));
    expect(mockUpdateValue).toHaveBeenCalledWith(10, true);
  });
});

describe('getBackgroundColor', () => {
  it('return correct color depending on amount value and error', () => {
    expect(getBackgroundColor(mockTheme, false, false)).toEqual('#4459ff');
    expect(getBackgroundColor(mockTheme, true, false)).toEqual('#ca3542');
    expect(getBackgroundColor(mockTheme, false, true)).toEqual('#4459ff1a');
    expect(getBackgroundColor(mockTheme, true, true)).toEqual('#ca3542');
  });
});
