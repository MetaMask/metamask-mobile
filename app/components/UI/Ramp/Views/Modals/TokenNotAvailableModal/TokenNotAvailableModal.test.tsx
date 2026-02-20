import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import TokenNotAvailableModal from './TokenNotAvailableModal';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import Routes from '../../../../../../constants/navigation/Routes';

const MOCK_ASSET_ID =
  'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
  };
});

const mockUseParams = jest.fn().mockReturnValue({
  assetId: MOCK_ASSET_ID,
});

jest.mock('../../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../../util/navigation/navUtils'),
  useParams: () => mockUseParams(),
}));

let mockSelectedProvider: unknown = {
  id: '/providers/transak',
  name: 'Transak',
};

let mockSelectedToken: unknown = {
  assetId: MOCK_ASSET_ID,
  name: 'USD Coin',
  symbol: 'USDC',
};

jest.mock('../../../hooks/useRampsController', () => ({
  useRampsController: () => ({
    selectedProvider: mockSelectedProvider,
    selectedToken: mockSelectedToken,
  }),
}));

const mockOnCloseBottomSheet = jest.fn((callback?: () => void) => {
  if (callback) callback();
});

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
        ref: React.Ref<{ onCloseBottomSheet: (cb?: () => void) => void }>,
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: mockOnCloseBottomSheet,
        }));
        return <>{children}</>;
      },
    );
  },
);

function render(component: React.ComponentType) {
  return renderScreen(
    component,
    {
      name: Routes.RAMP.MODALS.TOKEN_NOT_AVAILABLE,
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
    { assetId: MOCK_ASSET_ID },
  );
}

describe('TokenNotAvailableModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectedProvider = {
      id: '/providers/transak',
      name: 'Transak',
    };
    mockSelectedToken = {
      assetId: MOCK_ASSET_ID,
      name: 'USD Coin',
      symbol: 'USDC',
    };
  });

  it('matches snapshot', () => {
    const { toJSON } = render(TokenNotAvailableModal);

    expect(toJSON()).toMatchSnapshot();
  });

  it('navigates to token selection when Change token is pressed', () => {
    const { getByText } = render(TokenNotAvailableModal);

    fireEvent.press(getByText('Change token'));

    expect(mockOnCloseBottomSheet).toHaveBeenCalledWith(expect.any(Function));
    expect(mockNavigate).toHaveBeenCalledWith(Routes.RAMP.TOKEN_SELECTION);
  });

  it('navigates to provider picker when Change provider is pressed', () => {
    const { getByText } = render(TokenNotAvailableModal);

    fireEvent.press(getByText('Change provider'));

    expect(mockOnCloseBottomSheet).toHaveBeenCalledWith(expect.any(Function));
    expect(mockNavigate).toHaveBeenCalledWith(
      'RampModals',
      expect.objectContaining({
        screen: 'RampProviderPickerModal',
        params: { assetId: MOCK_ASSET_ID },
      }),
    );
  });

  it('closes the modal when the close button is pressed', () => {
    const { getByTestId } = render(TokenNotAvailableModal);
    const closeButton = getByTestId('bottomsheetheader-close-button');

    fireEvent.press(closeButton);

    expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
  });

  it('matches snapshot with missing provider and token names', () => {
    mockSelectedProvider = null;
    mockSelectedToken = null;

    const { toJSON } = render(TokenNotAvailableModal);

    expect(toJSON()).toMatchSnapshot();
  });
});
