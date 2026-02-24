import React from 'react';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import ProviderPickerModal from './ProviderPickerModal';
import Routes from '../../../../../../constants/navigation/Routes';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { fireEvent } from '@testing-library/react-native';

const mockOnCloseBottomSheet = jest.fn();
const mockSetSelectedProvider = jest.fn();

const MOCK_ASSET_ID =
  'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

const createMockProvider = (
  id: string,
  name: string,
  supportedTokens: Record<string, boolean> = {},
) => ({
  id,
  name,
  environmentType: 'PRODUCTION',
  description: `${name} provider`,
  hqAddress: '123 Test St',
  links: [],
  logos: { light: '', dark: '', height: 24, width: 79 },
  supportedCryptoCurrencies: supportedTokens,
  supportedFiatCurrencies: {},
  supportedPaymentMethods: {},
});

const mockProviderWithToken = createMockProvider(
  '/providers/transak',
  'Transak',
  { [MOCK_ASSET_ID]: true },
);

const mockProviderWithoutToken = createMockProvider(
  '/providers/moonpay',
  'MoonPay',
  {},
);

const mockProviderAlsoWithToken = createMockProvider(
  '/providers/mercuryo',
  'Mercuryo',
  { [MOCK_ASSET_ID]: true },
);

let mockProviders = [
  mockProviderWithToken,
  mockProviderWithoutToken,
  mockProviderAlsoWithToken,
];
let mockSelectedProvider = mockProviderWithoutToken;

jest.mock('../../../hooks/useRampsController', () => ({
  useRampsController: () => ({
    providers: mockProviders,
    selectedProvider: mockSelectedProvider,
    setSelectedProvider: mockSetSelectedProvider,
  }),
}));

jest.mock(
  '../../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const ReactActual = jest.requireActual('react');
    return ReactActual.forwardRef(
      (
        {
          children,
        }: {
          children: React.ReactNode;
        },
        ref: React.Ref<{ onCloseBottomSheet: () => void }>,
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: mockOnCloseBottomSheet,
        }));
        return <>{children}</>;
      },
    );
  },
);

function render(
  component: React.ComponentType,
  params = { assetId: MOCK_ASSET_ID },
) {
  return renderScreen(
    component,
    {
      name: Routes.RAMP.MODALS.PROVIDER_PICKER,
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
    params,
  );
}

describe('ProviderPickerModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProviders = [
      mockProviderWithToken,
      mockProviderWithoutToken,
      mockProviderAlsoWithToken,
    ];
    mockSelectedProvider = mockProviderWithoutToken;
  });

  it('matches snapshot with compatible providers', () => {
    const { toJSON } = render(ProviderPickerModal);

    expect(toJSON()).toMatchSnapshot();
  });

  it('only renders providers that support the token', () => {
    const { getByText, queryByText } = render(ProviderPickerModal);

    expect(getByText('Transak')).toBeOnTheScreen();
    expect(getByText('Mercuryo')).toBeOnTheScreen();
    expect(queryByText('MoonPay')).toBeNull();
  });

  it('selects provider and closes modal when a provider is pressed', () => {
    const { getByText } = render(ProviderPickerModal);

    fireEvent.press(getByText('Transak'));

    expect(mockSetSelectedProvider).toHaveBeenCalledWith(mockProviderWithToken);
    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
  });

  it('closes the modal when the close button is pressed', () => {
    const { getByTestId } = render(ProviderPickerModal);
    const closeButton = getByTestId('bottomsheetheader-close-button');

    fireEvent.press(closeButton);

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
  });
});
