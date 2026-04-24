import React from 'react';
import { render, screen } from '@testing-library/react-native';
import SectionPills from './SectionPills';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), dispatch: jest.fn() }),
}));

jest.mock('../../../../sections.config', () => {
  const ReactNative = jest.requireActual('react-native');
  return {
    SECTIONS_CONFIG: {
      tokens: {
        id: 'tokens',
        getItemIdentifier: (item: { assetId: string }) => item.assetId,
        RowItem: ({
          item,
        }: {
          item: unknown;
          index: number;
          navigation: unknown;
          extra?: unknown;
        }) => (
          <ReactNative.View
            testID={`pill-${(item as { assetId: string }).assetId}`}
          >
            <ReactNative.Text>
              {(item as { symbol: string }).symbol}
            </ReactNative.Text>
          </ReactNative.View>
        ),
      },
    },
  };
});

describe('SectionPills', () => {
  it('renders skeleton when loading', () => {
    render(<SectionPills sectionId="tokens" data={[]} isLoading />);

    expect(
      screen.getAllByTestId('section-pills-skeleton-pill').length,
    ).toBeGreaterThan(0);
  });

  it('renders pills up to maxPills and lists test id', () => {
    const data = Array.from({ length: 20 }, (_, i) => ({
      assetId: `id-${i}`,
      symbol: `T${i}`,
    }));

    render(
      <SectionPills
        sectionId="tokens"
        data={data}
        isLoading={false}
        maxPills={4}
      />,
    );

    expect(screen.getByTestId('explore-tokens-pills-list')).toBeOnTheScreen();
    expect(screen.getByTestId('pill-id-0')).toBeOnTheScreen();
    expect(screen.getByTestId('pill-id-3')).toBeOnTheScreen();
    expect(screen.queryByTestId('pill-id-4')).toBeNull();
  });
});
