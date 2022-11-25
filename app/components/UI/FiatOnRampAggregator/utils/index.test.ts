import { timeToDescription, TimeDescriptions, formatAmount } from '.';
describe('timeToDescription', () => {
  it('should return a function', () => {
    expect(timeToDescription).toBeInstanceOf(Function);
  });
  it.each`
    lower | upper   | result
    ${0}  | ${0}    | ${[TimeDescriptions.instant]}
    ${0}  | ${3000} | ${[TimeDescriptions.less_than, '2', TimeDescriptions.business_days]}
    ${60} | ${120}  | ${['1', TimeDescriptions.separator, '2', TimeDescriptions.hours]}
    ${0}  | ${1}    | ${[TimeDescriptions.less_than, '1', TimeDescriptions.minute]}
    ${0}  | ${1440} | ${[TimeDescriptions.less_than, '1', TimeDescriptions.business_day]}
    ${0}  | ${60}   | ${[TimeDescriptions.less_than, '1', TimeDescriptions.hour]}
    ${0}  | ${120}  | ${[TimeDescriptions.less_than, '2', TimeDescriptions.hours]}
  `(
    'should return correct time description for range',
    ({ lower, upper, result }) => {
      expect(timeToDescription([lower, upper])).toStrictEqual(result);
    },
  );
});

describe('formatAmount', () => {
  it('should format amount', () => {
    jest.spyOn(Intl, 'NumberFormat').mockImplementation(
      () =>
        ({
          format: jest.fn().mockImplementation(() => '123,123'),
        } as any),
    );
    expect(formatAmount(123123)).toBe('123,123');
    jest.spyOn(Intl, 'NumberFormat').mockClear();
  });

  it('should return input amount as string if Intl throws', () => {
    jest.spyOn(Intl, 'NumberFormat').mockImplementation(
      () =>
        ({
          format: jest.fn().mockImplementation(() => {
            throw Error();
          }),
        } as any),
    );
    expect(formatAmount(123123)).toBe('123123');
    jest.spyOn(Intl, 'NumberFormat').mockClear();
  });
});
