import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { backgroundState } from '../../../../util/test/initial-root-state';
import renderWithProvider, {
  DeepPartial,
} from '../../../../util/test/renderWithProvider';
import SDKSessionAccountListItem from './SDKSessionAccountListItem';
import { RootState } from '../../../../reducers';

const mockInitialState: DeepPartial<RootState> = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountTrackerController: {
        accountsByChainId: {
          '0x1': {
            '0xe64dD0AB5ad7e8C5F2bf6Ce75C34e187af8b920A': {
              balance: '200',
            },
            '0x519d2CE57898513F676a5C3b66496c3C394c9CC7': {
              balance: '200',
            },
          },
        },
      },
      TokenBalancesController: {
        tokenBalances: {},
      },
      PreferencesController: {
        selectedAddress: '0xe64dD0AB5ad7e8C5F2bf6Ce75C34e187af8b920A',
        identities: {
          '0xe64dD0AB5ad7e8C5F2bf6Ce75C34e187af8b920A': {
            address: '0xe64dD0AB5ad7e8C5F2bf6Ce75C34e187af8b920A',
            name: 'Account 1',
          },
          '0x519d2CE57898513F676a5C3b66496c3C394c9CC7': {
            address: '0x519d2CE57898513F676a5C3b66496c3C394c9CC7',
            name: 'Account 2',
          },
        },
      },
    },
  },
};

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(),
}));

jest.mock('../../../../util/theme', () => ({
  useTheme: jest.fn(),
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn(),
}));

jest.mock('../../../../component-library/components/Badges/Badge', () => ({
  __esModule: true,
  default: jest.fn(() => <></>),
  BadgeVariant: {
    Status: 'status',
  },
  BadgeStatusState: {
    Active: 'active',
  },
}));

jest.mock(
  '../../../../component-library/components/Avatars/Avatar/variants/AvatarFavicon',
  () => ({
    __esModule: true,
    default: jest.fn(() => <></>),
  }),
);

jest.mock(
  '../../../../component-library/components/Avatars/Avatar/variants/AvatarToken',
  () => ({
    __esModule: true,
    default: jest.fn(() => <></>),
  }),
);

describe('SDKSessionAccountListItem', () => {
  const mockDisconnect = jest.fn();
  const mockUseSafeAreaInsets = useSafeAreaInsets as jest.Mock;

  const defaultProps = {
    connection: {
      id: 'test-id',
      originatorInfo: {
        url: 'url',
        title: 'faketitle',
        platform: 'platform',
        dappId: '1',
      },
    },
    connected: true,
    onDisconnect: mockDisconnect,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSafeAreaInsets.mockReturnValue({
      top: 10,
      bottom: 10,
      left: 0,
      right: 0,
    });
  });

  it('should renders correctly', () => {
    const { getByText } = renderWithProvider(
      <SDKSessionAccountListItem {...defaultProps} />,
      { state: mockInitialState },
    );

    expect(getByText('faketitle')).toBeTruthy();
  });
});
