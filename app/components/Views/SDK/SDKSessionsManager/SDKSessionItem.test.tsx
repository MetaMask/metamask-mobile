import { render } from '@testing-library/react-native';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getPermittedAccounts } from '../../../../core/Permissions';
import SDKSessionItem from './SDKSessionItem';

// Mock external hooks and functions
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn(),
}));
jest.mock('../../../../util/theme', () => ({
  useTheme: jest.fn(),
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({ navigate: jest.fn() })),
}));
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));
jest.mock('../../../../core/Permissions', () => ({
  getPermittedAccounts: jest.fn(),
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

describe('SDKSessionItem', () => {
  const mockUseSafeAreaInsets = useSafeAreaInsets as jest.Mock;
  const mockGetPermittedAccounts = getPermittedAccounts as jest.Mock;

  const defaultProps = {
    connection: {
      id: '1',
      originatorInfo: {
        title: 'Test App',
        url: 'http://test.com',
        icon: 'http://icon-url.com',
        platform: 'test',
        connected: true,
        dappId: '123',
      },
    },
    trigger: 0,
  };

  beforeEach(() => {
    mockUseSafeAreaInsets.mockReturnValue({
      top: 10,
      bottom: 10,
      left: 0,
      right: 0,
    });

    mockGetPermittedAccounts.mockResolvedValue([
      '0xe64dD0AB5ad7e8C5F2bf6Ce75C34e187af8b920A',
    ]);
  });

  it('renders correctly', () => {
    const { getByText } = render(<SDKSessionItem {...defaultProps} />);
    expect(getByText('test.com')).toBeTruthy();
    expect(
      getByText('sdk_session_item.connected_accounts', { exact: false }),
    ).toBeTruthy(); // Checks for partial text based on localization key
  });
});
