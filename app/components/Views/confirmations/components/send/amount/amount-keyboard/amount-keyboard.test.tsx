import React from 'react';
import { ParamListBase, RouteProp, useRoute } from '@react-navigation/native';
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
import { SendContextProvider } from '../../../../context/send-context';
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

  return renderWithProvider(
    <SendContextProvider>
      <Comp />
    </SendContextProvider>,
    {
      state,
    },
  );
};

describe('Amount', () => {
  const mockUseRoute = useRoute as jest.MockedFunction<typeof useRoute>;

  it('renders correctly', () => {
    mockUseRoute.mockReturnValue({
      params: {
        asset: {
          chainId: '0x1',
          address: ETHEREUM_ADDRESS,
          isNative: true,
          symbol: 'ETH',
          decimals: 18,
        },
      },
    } as RouteProp<ParamListBase, string>);
    const { getByText } = renderComponent();
    expect(getByText('Continue')).toBeTruthy();
  });

  it('next button is disabled for NFT if amount is undefined', () => {
    mockUseRoute.mockReturnValue({
      params: {
        asset: MOCK_NFT1155,
      },
    } as RouteProp<ParamListBase, string>);

    const { getByRole } = renderComponent(undefined, '');
    expect(
      getByRole('button', { name: 'Next' }).props.style.backgroundColor,
    ).toEqual('#4459ff1a');
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
