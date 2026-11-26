import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import render from '#app/util/test/renderWithProvider';
import { strings } from '../../../../../locales/i18n';
import { collectiblesTestIds } from '#app/components/UI/Collectibles/Collectibles.testIds';
import { mockEpicOddsMachines } from '#app/components/UI/Collectibles/mocks/epicOdds';
import { BuySheet } from './BuySheet';

const mockGoBack = jest.fn();
const [mockPack] = mockEpicOddsMachines;

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => ({
    params: {
      packCode: mockPack.code,
      name: mockPack.name,
      priceUsd: mockPack.priceUsd,
    },
  }),
}));

describe('BuySheet', () => {
  beforeEach(() => {
    mockGoBack.mockClear();
  });

  it('shows the buy form for a pack outside the Home list', () => {
    render(<BuySheet />);

    expect(screen.getByText(mockPack.name)).toBeOnTheScreen();
    expect(
      screen.getByText(
        strings('collectibles.buy_sheet.open_packs', { count: 1 }),
      ),
    ).toBeOnTheScreen();
  });

  it('goes back when the close button is pressed', async () => {
    render(<BuySheet />);

    fireEvent.press(screen.getByTestId(collectiblesTestIds.buySheetClose));

    await waitFor(() => expect(mockGoBack).toHaveBeenCalledTimes(1));
  });
});
