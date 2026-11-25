import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import renderWithProvider from '#app/util/test/renderWithProvider';
import { strings } from '../../../../../locales/i18n';
import { collectiblesTestIds } from '#app/components/UI/Collectibles/Collectibles.testIds';
import { mockHomePacks } from '#app/components/UI/Collectibles/mocks/homePacks';
import { BuySheet } from './BuySheet';

const mockGoBack = jest.fn();
let mockPackCode = '';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => ({ params: { packCode: mockPackCode } }),
}));

jest.mock('#app/components/UI/Collectibles/hooks/useHomePacks', () => ({
  useHomePacks: () => ({ data: mockHomePacks }),
}));

const [pack] = mockHomePacks;

function renderSheet(packCode: string) {
  mockPackCode = packCode;
  return renderWithProvider(<BuySheet />);
}

describe('BuySheet', () => {
  beforeEach(() => {
    mockGoBack.mockClear();
  });

  it('shows the name of the pack it was opened for', () => {
    renderSheet(pack.code);

    expect(screen.getByText(pack.name)).toBeOnTheScreen();
    expect(
      screen.getByText(strings('collectibles.buy_sheet.placeholder')),
    ).toBeOnTheScreen();
  });

  it('falls back to the Collectibles title for an unknown pack', () => {
    renderSheet('unknown-pack');

    expect(screen.getByText(strings('collectibles.title'))).toBeOnTheScreen();
  });

  it('goes back when the close button is pressed', async () => {
    renderSheet(pack.code);

    fireEvent.press(screen.getByTestId(collectiblesTestIds.buySheetClose));

    await waitFor(() => expect(mockGoBack).toHaveBeenCalledTimes(1));
  });
});
