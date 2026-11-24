import { renderHook } from '@testing-library/react-native';
import { getProtoEvent, type ProtoGameEvent } from './fixtures';
import { useLiveGame } from './simulation';

jest.mock('../../../../util/deviceCapability', () => ({
  getHardwareTier: () => 'HIGH',
}));
jest.mock('../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: () => 'WIFI',
}));

const panthersGame = () => getProtoEvent('car-phi') as ProtoGameEvent;

describe('team colors', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('paints Panthers and Eagles market rows in each team color', () => {
    const event = panthersGame();
    const moneyline = event.sections[0].markets[0].outcomes;
    const spread = event.sections.find((section) => section.id === 'spread')
      ?.markets[0].outcomes;

    expect(moneyline.map((outcome) => outcome.color)).toStrictEqual([
      event.away.color,
      event.home.color,
    ]);
    expect(spread?.map((outcome) => outcome.color)).toStrictEqual([
      event.away.color,
      event.home.color,
    ]);
  });

  it('paints the live chart in each team color', () => {
    const event = panthersGame();
    const { result, unmount } = renderHook(() => useLiveGame(event));

    expect(
      result.current.buildSeries('LIVE').map((series) => series.color),
    ).toStrictEqual([event.away.color, event.home.color]);
    unmount();
  });
});
