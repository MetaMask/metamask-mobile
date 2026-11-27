import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import render from '#app/util/test/renderWithProvider';
import { collectiblesTestIds } from '#app/components/UI/Collectibles/Collectibles.testIds';
import { PackArt } from '#app/components/UI/Collectibles/components/PackArt';

const code = 'pack-1';

describe('PackArt', () => {
  it('shows the artwork fallback when there is no image', () => {
    render(<PackArt code={code} openedCount={1} />);

    expect(
      screen.getByTestId(collectiblesTestIds.packsTileArtPlaceholder(code)),
    ).toBeOnTheScreen();
  });

  it('shows the artwork fallback when the image fails to load', () => {
    render(
      <PackArt
        code={code}
        openedCount={1}
        imageUrl="https://example.com/pack.png"
      />,
    );

    fireEvent(
      screen.getByTestId(collectiblesTestIds.packsTileArt(code)),
      'error',
    );

    expect(
      screen.getByTestId(collectiblesTestIds.packsTileArtPlaceholder(code)),
    ).toBeOnTheScreen();
  });
});
