import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { EVENT_DETAIL_TABS, EventDetailTabs } from './EventDetailTabs';
import { EventDetailTabsTestIds } from './EventDetailTabs.testIds';

describe('EventDetailTabs', () => {
  it('renders Outcomes and About without a Positions tab', () => {
    render(
      <EventDetailTabs
        selectedTab={EVENT_DETAIL_TABS.OUTCOMES}
        tabs={[EVENT_DETAIL_TABS.OUTCOMES, EVENT_DETAIL_TABS.ABOUT]}
        onSelectTab={jest.fn()}
      />,
    );

    expect(screen.getByTestId(EventDetailTabsTestIds.BAR)).toBeOnTheScreen();
    expect(
      screen.getByTestId(
        EventDetailTabsTestIds.tab(EVENT_DETAIL_TABS.OUTCOMES),
      ),
    ).toHaveTextContent(strings('predict.tabs.outcomes'));
    expect(
      screen.getByTestId(EventDetailTabsTestIds.tab(EVENT_DETAIL_TABS.ABOUT)),
    ).toHaveTextContent(strings('predict.tabs.about'));
    expect(screen.queryByText(strings('predict.tabs.positions'))).toBeNull();
  });

  it('omits the tab bar when only one tab is available', () => {
    render(
      <EventDetailTabs
        selectedTab={EVENT_DETAIL_TABS.OUTCOMES}
        tabs={[EVENT_DETAIL_TABS.OUTCOMES]}
        onSelectTab={jest.fn()}
      />,
    );

    expect(screen.queryByTestId(EventDetailTabsTestIds.BAR)).toBeNull();
  });

  it('selects the About tab', () => {
    const onSelectTab = jest.fn();

    render(
      <EventDetailTabs
        selectedTab={EVENT_DETAIL_TABS.OUTCOMES}
        tabs={[EVENT_DETAIL_TABS.OUTCOMES, EVENT_DETAIL_TABS.ABOUT]}
        onSelectTab={onSelectTab}
      />,
    );
    fireEvent.press(
      screen.getByTestId(EventDetailTabsTestIds.tab(EVENT_DETAIL_TABS.ABOUT)),
    );

    expect(onSelectTab).toHaveBeenCalledWith(EVENT_DETAIL_TABS.ABOUT);
  });
});
