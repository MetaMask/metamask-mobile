import React from 'react';
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
      AssetsController: {
        assetsInfo: {},
        assetsBalance: {},
        assetsPrice: {},
        assetPreferences: {},
        customAssets: {},
        selectedCurrency: 'usd',
      },
    },
  },
};

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
  });

  it('should renders correctly', () => {
    const { getByText } = renderWithProvider(
      <SDKSessionAccountListItem {...defaultProps} />,
      { state: mockInitialState },
    );

    expect(getByText('faketitle')).toBeTruthy();
  });
});
