import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { EventMarketSection } from './EventMarketSection';
import { EventMarketSectionTestIds as TestIds } from './EventMarketSection.testIds';

const CONTENT = 'Moneyline cards';

const renderSection = (
  props: Partial<React.ComponentProps<typeof EventMarketSection>> = {},
) =>
  render(
    <EventMarketSection title="Moneyline" volume="$1.2K" {...props}>
      <Text>{CONTENT}</Text>
    </EventMarketSection>,
  );

const header = () => screen.getByTestId(TestIds.HEADER);

describe('EventMarketSection', () => {
  it('shows the title, volume and content when it starts open', () => {
    renderSection({ initialOpen: true });

    expect(screen.getByText('Moneyline')).toBeOnTheScreen();
    expect(screen.getByTestId(TestIds.VOLUME)).toHaveTextContent('$1.2K');
    expect(screen.getByText(CONTENT)).toBeOnTheScreen();
    expect(screen.getByTestId(TestIds.CHEVRON('up'))).toBeOnTheScreen();
    expect(header()).toHaveProp('accessibilityState', { expanded: true });
  });

  it('starts closed by default and does not render its content', () => {
    renderSection();

    expect(screen.queryByText(CONTENT)).not.toBeOnTheScreen();
    expect(screen.getByTestId(TestIds.CHEVRON('down'))).toBeOnTheScreen();
    expect(header()).toHaveProp('accessibilityState', { expanded: false });
  });

  it('omits the volume when none is given', () => {
    renderSection({ volume: undefined });

    expect(screen.queryByTestId(TestIds.VOLUME)).not.toBeOnTheScreen();
  });

  it('opens and closes on header press and reports each change', () => {
    const onToggle = jest.fn();
    renderSection({ onToggle });

    fireEvent.press(header());

    expect(screen.getByText(CONTENT)).toBeOnTheScreen();
    expect(screen.getByTestId(TestIds.CHEVRON('up'))).toBeOnTheScreen();
    expect(header()).toHaveProp('accessibilityState', { expanded: true });

    fireEvent.press(header());

    expect(screen.queryByText(CONTENT)).not.toBeOnTheScreen();
    expect(screen.getByTestId(TestIds.CHEVRON('down'))).toBeOnTheScreen();
    expect(onToggle.mock.calls).toEqual([[true], [false]]);
  });

  it('applies initialOpen only to the first render', () => {
    const { rerender } = renderSection({ initialOpen: true });

    fireEvent.press(header());
    rerender(
      <EventMarketSection title="Moneyline" volume="$1.2K" initialOpen>
        <Text>{CONTENT}</Text>
      </EventMarketSection>,
    );

    expect(screen.queryByText(CONTENT)).not.toBeOnTheScreen();
  });

  it('labels the header button with its title and volume', () => {
    renderSection();

    expect(header()).toHaveProp('accessibilityRole', 'button');
    expect(header()).toHaveProp('accessibilityLabel', 'Moneyline, $1.2K');
  });

  it('labels the header button with its title alone without a volume', () => {
    renderSection({ volume: undefined });

    expect(header()).toHaveProp('accessibilityLabel', 'Moneyline');
  });
});
