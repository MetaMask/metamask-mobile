import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import {
  ExploreActiveTabProvider,
  useExploreActiveTab,
} from './ExploreActiveTabContext';

const ActiveTabProbe: React.FC = () => {
  const activeTab = useExploreActiveTab();
  return <Text testID="active-tab">{activeTab}</Text>;
};

describe('ExploreActiveTabContext', () => {
  it('defaults to "Now" when rendered outside a provider', () => {
    render(<ActiveTabProbe />);

    expect(screen.getByTestId('active-tab')).toHaveTextContent('Now');
  });

  it('exposes the provided active tab to descendants', () => {
    render(
      <ExploreActiveTabProvider activeTab="Macro">
        <ActiveTabProbe />
      </ExploreActiveTabProvider>,
    );

    expect(screen.getByTestId('active-tab')).toHaveTextContent('Macro');
  });

  it('updates descendants when the active tab changes', () => {
    const { rerender } = render(
      <ExploreActiveTabProvider activeTab="Now">
        <ActiveTabProbe />
      </ExploreActiveTabProvider>,
    );

    expect(screen.getByTestId('active-tab')).toHaveTextContent('Now');

    rerender(
      <ExploreActiveTabProvider activeTab="Sports">
        <ActiveTabProbe />
      </ExploreActiveTabProvider>,
    );

    expect(screen.getByTestId('active-tab')).toHaveTextContent('Sports');
  });
});
