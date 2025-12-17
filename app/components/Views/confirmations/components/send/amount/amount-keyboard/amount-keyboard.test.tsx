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
  SOLANA_ASSET,
} from '../../../../__mocks__/send.mock';
import { usePercentageAmount } from '../../../../hooks/send/usePercentageAmount';
import { useSendContext } from '../../../../context/send-context';
import { useRouteParams } from '../../../../hooks/send/useRouteParams';
import { useSendType } from '../../../../hooks/send/useSendType';
import { useParams } from '../../../../../../../util/navigation/navUtils';
import { useSendActions } from '../../../../hooks/send/useSendActions';
// eslint-disable-next-line import/no-namespace
import * as AmountValidation from '../../../../hooks/send/useAmountValidation';
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

jest.mock('../../../../hooks/send/useSendType', () => ({
  useSendType: jest.fn(),
}));

jest.mock('../../../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(),
}));

jest.mock('../../../../hooks/send/useSendActions', () => ({
  useSendActions: jest.fn(),
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

const mockUseParams = jest.mocked(useParams);
const mockUseSendActions = jest.mocked(useSendActions);

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
  const mockUseSendType = jest.mocked(useSendType);
  const mockHandleSubmitPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSendType.mockReturnValue({
      isNonEvmSendType: false,
    } as unknown as ReturnType<typeof useSendType>);
    mockUsePercentageAmount.mockReturnValue({
      getPercentageAmount: () => 10,
      isMaxAmountSupported: true,
    } as unknown as ReturnType<typeof usePercentageAmount>);
    mockUseParams.mockReturnValue({});
    mockUseSendActions.mockReturnValue({
      handleSubmitPress: mockHandleSubmitPress,
    } as unknown as ReturnType<typeof useSendActions>);
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
    ).toEqual('#b7bbc8');
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

  it('call validateNonEvmAmountAsync when continue button is pressed', () => {
    const mockValidateNonEvmAmountAsync = jest.fn();
    mockUseSendType.mockReturnValue({
      isNonEvmSendType: true,
    } as unknown as ReturnType<typeof useSendType>);
    mockUseSendContext.mockReturnValue({
      asset: SOLANA_ASSET,
      updateAsset: jest.fn(),
    } as unknown as ReturnType<typeof useSendContext>);
    jest.spyOn(AmountValidation, 'useAmountValidation').mockReturnValue({
      validateNonEvmAmountAsync: mockValidateNonEvmAmountAsync,
    } as unknown as ReturnType<typeof AmountValidation.useAmountValidation>);
    const { getByText } = renderComponent();
    fireEvent.press(getByText('Continue'));
    expect(mockValidateNonEvmAmountAsync).toHaveBeenCalled();
  });

  it('calls updateTo and handleSubmitPress when predefinedRecipient is provided', () => {
    const mockUpdateTo = jest.fn();
    const predefinedRecipientAddress =
      '0x1234567890123456789012345678901234567890';

    mockUseParams.mockReturnValue({
      predefinedRecipient: {
        address: predefinedRecipientAddress,
        chainType: 'evm',
      },
    });
    mockUseSendContext.mockReturnValue({
      asset: MOCK_EVM_ASSET,
      updateAsset: jest.fn(),
      updateTo: mockUpdateTo,
    } as unknown as ReturnType<typeof useSendContext>);

    const { getByText } = renderComponent();
    fireEvent.press(getByText('Continue'));

    expect(mockUpdateTo).toHaveBeenCalledWith(predefinedRecipientAddress);
    expect(mockHandleSubmitPress).toHaveBeenCalledWith(
      predefinedRecipientAddress,
    );
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

describe('getBackgroundColor', () => {
  it('return correct color depending on amount value and error', () => {
    expect(getBackgroundColor(mockTheme, false, false)).toEqual('#121314');
    expect(getBackgroundColor(mockTheme, true, false)).toEqual('#ca3542');
    expect(getBackgroundColor(mockTheme, false, true)).toEqual('#b7bbc8');
    expect(getBackgroundColor(mockTheme, true, true)).toEqual('#ca3542');
  });
});
