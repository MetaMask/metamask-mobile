import React, { type ReactElement } from 'react';
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

function render(ui: ReactElement) {
  return renderWithProvider(ui);
}

describe('BuySheet', () => {
  beforeEach(() => {
    mockGoBack.mockClear();
  });

  it('shows the name of the pack it was opened for', () => {
    mockPackCode = pack.code;
    render(<BuySheet />);

    expect(screen.getByText(pack.name)).toBeOnTheScreen();
  });

  it('falls back to the Collectibles title for an unknown pack', () => {
    mockPackCode = 'unknown-pack';
    render(<BuySheet />);

    expect(screen.getByText(strings('collectibles.title'))).toBeOnTheScreen();
  });

  it('goes back when the close button is pressed', async () => {
    mockPackCode = pack.code;
    render(<BuySheet />);

    fireEvent.press(screen.getByTestId(collectiblesTestIds.buySheetClose));

    await waitFor(() => expect(mockGoBack).toHaveBeenCalledTimes(1));
  });
});
