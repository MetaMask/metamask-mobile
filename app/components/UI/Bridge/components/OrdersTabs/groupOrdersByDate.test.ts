import { groupOrdersByDate } from './groupOrdersByDate';

interface TestOrder {
  id: string;
  createdAt?: string;
}

const NOW = new Date('2026-10-07T16:00:00.000Z');
const getDate = (order: TestOrder) => order.createdAt;

describe('groupOrdersByDate', () => {
  it('labels orders from the current local day as Today and older ones with the full date', () => {
    const orders: TestOrder[] = [
      { id: 'today-1', createdAt: '2026-10-07T15:00:00.000Z' },
      { id: 'today-2', createdAt: '2026-10-07T13:00:00.000Z' },
      { id: 'older', createdAt: '2026-08-13T15:00:00.000Z' },
    ];

    const sections = groupOrdersByDate(orders, getDate, NOW);

    expect(sections.map((section) => section.title)).toStrictEqual([
      'Today',
      'Aug 13, 2026',
    ]);
    expect(sections[0].items).toStrictEqual([
      { item: orders[0], index: 0 },
      { item: orders[1], index: 1 },
    ]);
    expect(sections[1].items).toStrictEqual([{ item: orders[2], index: 2 }]);
  });

  it('groups by the local day rather than the UTC day', () => {
    const orders: TestOrder[] = [
      // 22:00 on Oct 6 in the test timezone (America/Toronto).
      { id: 'late-yesterday', createdAt: '2026-10-07T02:00:00.000Z' },
    ];

    const sections = groupOrdersByDate(orders, getDate, NOW);

    expect(sections.map((section) => section.title)).toStrictEqual([
      'Oct 6, 2026',
    ]);
  });

  it('merges same-day orders that are not adjacent into one section', () => {
    const orders: TestOrder[] = [
      { id: 'a', createdAt: '2026-08-13T15:00:00.000Z' },
      { id: 'b', createdAt: '2026-08-12T15:00:00.000Z' },
      { id: 'c', createdAt: '2026-08-13T12:00:00.000Z' },
    ];

    const sections = groupOrdersByDate(orders, getDate, NOW);

    expect(sections).toHaveLength(2);
    expect(sections[0].items.map(({ item }) => item.id)).toStrictEqual([
      'a',
      'c',
    ]);
  });

  it('puts orders with a missing or unparsable date in an untitled section', () => {
    const orders: TestOrder[] = [
      { id: 'missing' },
      { id: 'invalid', createdAt: 'not-a-date' },
    ];

    const sections = groupOrdersByDate(orders, getDate, NOW);

    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBeUndefined();
    expect(sections[0].items.map(({ item }) => item.id)).toStrictEqual([
      'missing',
      'invalid',
    ]);
  });

  it('returns no sections for no orders', () => {
    expect(groupOrdersByDate([], getDate, NOW)).toStrictEqual([]);
  });
});
