import React from 'react';
import { measureRenders } from 'reassure';
import Homepage from './Homepage';

jest.mock('react-redux', () => ({
  useSelector: () => false,
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useFocusEffect: jest.fn(),
}));

jest.mock('../../UI/Perps', () => ({
  selectPerpsEnabledFlag: () => false,
}));

jest.mock('./Sections/Tokens', () => ({
  __esModule: true,
  default: () => {
    const ReactActual = jest.requireActual('react');
    const { Text, View } = jest.requireActual('react-native');

    return ReactActual.createElement(
      View,
      null,
      ReactActual.createElement(Text, null, 'Tokens'),
    );
  },
}));

jest.mock('./Sections/Predictions', () => ({
  __esModule: true,
  default: () => {
    const ReactActual = jest.requireActual('react');
    const { Text, View } = jest.requireActual('react-native');

    return ReactActual.createElement(
      View,
      null,
      ReactActual.createElement(Text, null, 'Predictions'),
    );
  },
}));

jest.mock('./Sections/More', () => ({
  __esModule: true,
  default: () => {
    const ReactActual = jest.requireActual('react');
    const { Text, View } = jest.requireActual('react-native');

    return ReactActual.createElement(
      View,
      null,
      ReactActual.createElement(Text, null, 'More'),
    );
  },
}));

jest.mock('./Sections/Perpetuals/HomepagePerpsHomeSlot', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('./Sections/TopTraders', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('./Sections/DeFi', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('./Sections/NFTs', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('./Sections/Watchlist', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('./Sections/NFTs/hooks', () => ({
  useOwnedNfts: () => [],
}));

jest.mock('../../hooks/useNetworkEnablement/useNetworkEnablement', () => ({
  useNetworkEnablement: () => ({
    enableAllPopularNetworks: jest.fn(),
    isNetworkEnabled: () => true,
    popularNetworks: [],
  }),
}));

jest.mock('../../hooks/useNftDetection', () => ({
  useNftDetection: () => ({
    detectNfts: jest.fn().mockResolvedValue(undefined),
    abortDetection: jest.fn(),
  }),
}));

jest.mock('../../hooks/useThrottledFocusEffect', () => ({
  useThrottledFocusEffect: jest.fn(),
}));

jest.mock('./hooks/useHomeSessionSummary', () => ({
  __esModule: true,
  default: jest.fn(),
}));

test('Homepage top-level mount performance', async () => {
  await measureRenders(<Homepage />);
});
