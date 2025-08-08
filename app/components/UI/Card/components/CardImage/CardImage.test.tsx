import React from 'react';
import CardImage from './CardImage';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';

function renderWithProvider(component: React.ComponentType) {
  return renderScreen(
    component,
    {
      name: 'CardImage',
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );
}

describe('CardImage Component', () => {
  it('renders correctly and matches snapshot', () => {
    const { toJSON } = renderWithProvider(() => <CardImage />);

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders with custom props and matches snapshot', () => {
    const { toJSON } = renderWithProvider(() => (
      <CardImage width={200} height={100} testID="custom-card-image" />
    ));

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders with SVG properties', () => {
    const { toJSON } = renderWithProvider(() => (
      <CardImage fill="red" stroke="blue" opacity={0.5} />
    ));

    expect(toJSON()).toMatchSnapshot();
  });
});
