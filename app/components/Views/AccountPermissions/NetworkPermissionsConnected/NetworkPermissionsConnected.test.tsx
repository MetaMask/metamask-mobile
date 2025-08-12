import React from 'react';
import renderWithProvider, {
  DeepPartial,
} from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { RootState } from '../../../../reducers';
import NetworkPermissionsConnected from './NetworkPermissionsConnected';
import { Caip25CaveatType, Caip25EndowmentPermissionName } from '@metamask/chain-agnostic-permission';
import { SAMPLE_AVATARFAVICON_IMAGESOURCE_LOCAL } from '../../../../component-library/components/Avatars/Avatar/variants/AvatarFavicon/AvatarFavicon.constants';


const mockedNavigate = jest.fn();
const mockedGoBack = jest.fn();
const mockedTrackEvent = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      setActiveNetwork: jest.fn(),
    },
    KeyringController: {
      state: {
        keyrings: [],
      }
    },
    AccountsController: {
      state: {
        internalAccounts: {
          accounts: {}
        }
      }
    }
  },
}));

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockedNavigate,
      goBack: mockedGoBack,
    }),
  };
});

jest.mock('../../../../components/hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockedTrackEvent,
  }),
}));


const mockInitialState: DeepPartial<RootState> = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      PermissionController: {
        subjects: {
          'test': {
            permissions: {
              [Caip25EndowmentPermissionName]: {
                caveats: [{
                  type: Caip25CaveatType,
                  value: {
                    requiredScopes: {},
                    optionalScopes: {
                      'eip155:1': {
                        accounts: ['eip155:1:0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272']
                      }
                    }
                  }
                }]
              }
            }
          }
        }
      }
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any
  },
};

describe('NetworkPermissionsConnected', () => {
  it('renders correctly', () => {
    const { toJSON } = renderWithProvider(
      <NetworkPermissionsConnected
        onSetPermissionsScreen={jest.fn()}
        onDismissSheet={jest.fn()}
        hostname="test"
        favicon={SAMPLE_AVATARFAVICON_IMAGESOURCE_LOCAL}
      />,
      { state: mockInitialState },
    );

    expect(toJSON()).toMatchSnapshot();
  });
});
