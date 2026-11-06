import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { createProfileDrawerNavDetails } from '../../../Views/SocialProfile/ProfileDrawer';
import { WalletViewSelectorsIDs } from '../../../Views/Wallet/WalletView.testIds';
import HubProfileButton from './HubProfileButton';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../../../component-library/components-temp/CapsuleGlass', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => (
      <View>{children}</View>
    ),
  };
});

jest.mock(
  '../../../Views/Wallet/components/WalletHeader/WalletHeaderProfileAvatar',
  () => {
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: () => <View />,
      SOCIAL_HEADER_PROFILE_AVATAR_DIAMETER: 40,
    };
  },
);

describe('HubProfileButton', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('opens the profile drawer', () => {
    const { getByTestId } = render(<HubProfileButton />);

    fireEvent.press(getByTestId(WalletViewSelectorsIDs.PROFILE_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(
      ...createProfileDrawerNavDetails({}),
    );
  });
});
