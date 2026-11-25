import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { strings } from '../../../../../locales/i18n';
import { collectiblesRoutes } from '../routeNames';
import { collectiblesTestIds } from '../Collectibles.testIds';
import { NavButtons } from './NavButtons';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate }),
}));

describe('NavButtons', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it.each([
    ['packs', 'collectibles.landing.packs', collectiblesRoutes.packs],
    [
      'collection',
      'collectibles.landing.collection',
      collectiblesRoutes.collection,
    ],
    ['market', 'collectibles.landing.market', collectiblesRoutes.market],
  ])('opens the %s screen', (name, labelKey, route) => {
    renderWithProvider(<NavButtons />);

    expect(screen.getByText(strings(labelKey))).toBeOnTheScreen();
    fireEvent.press(
      screen.getByTestId(collectiblesTestIds.landingNavButton(name)),
    );

    expect(mockNavigate).toHaveBeenCalledWith(route);
  });
});
