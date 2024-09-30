import createKeypadRule from './createKeypadRule';
import { KEYS } from './constants';

describe('createKeypadRule', () => {
  it('should return a function', () => {
    expect(createKeypadRule()).toBeInstanceOf(Function);
  });

  it.each`
    decimalSeparator | decimals     | currentAmount | inputKey        | result
    ${undefined}     | ${undefined} | ${undefined}  | ${KEYS.DIGIT_0} | ${'0'}
    ${undefined}     | ${undefined} | ${undefined}  | ${KEYS.DIGIT_1} | ${'1'}
    ${undefined}     | ${undefined} | ${undefined}  | ${KEYS.DIGIT_2} | ${'2'}
    ${undefined}     | ${undefined} | ${undefined}  | ${KEYS.DIGIT_3} | ${'3'}
    ${undefined}     | ${undefined} | ${undefined}  | ${KEYS.DIGIT_4} | ${'4'}
    ${undefined}     | ${undefined} | ${undefined}  | ${KEYS.DIGIT_5} | ${'5'}
    ${undefined}     | ${undefined} | ${undefined}  | ${KEYS.DIGIT_6} | ${'6'}
    ${undefined}     | ${undefined} | ${undefined}  | ${KEYS.DIGIT_7} | ${'7'}
    ${undefined}     | ${undefined} | ${undefined}  | ${KEYS.DIGIT_8} | ${'8'}
    ${undefined}     | ${undefined} | ${undefined}  | ${KEYS.DIGIT_9} | ${'9'}
    ${undefined}     | ${undefined} | ${undefined}  | ${KEYS.BACK}    | ${'0'}
    ${undefined}     | ${undefined} | ${undefined}  | ${KEYS.INITIAL} | ${'0'}
    ${undefined}     | ${undefined} | ${undefined}  | ${KEYS.PERIOD}  | ${'0'}
    ${undefined}     | ${undefined} | ${''}         | ${KEYS.DIGIT_0} | ${'0'}
    ${undefined}     | ${undefined} | ${''}         | ${KEYS.DIGIT_1} | ${'1'}
    ${undefined}     | ${undefined} | ${''}         | ${KEYS.DIGIT_2} | ${'2'}
    ${undefined}     | ${undefined} | ${''}         | ${KEYS.DIGIT_3} | ${'3'}
    ${undefined}     | ${undefined} | ${''}         | ${KEYS.DIGIT_4} | ${'4'}
    ${undefined}     | ${undefined} | ${''}         | ${KEYS.DIGIT_5} | ${'5'}
    ${undefined}     | ${undefined} | ${''}         | ${KEYS.DIGIT_6} | ${'6'}
    ${undefined}     | ${undefined} | ${''}         | ${KEYS.DIGIT_7} | ${'7'}
    ${undefined}     | ${undefined} | ${''}         | ${KEYS.DIGIT_8} | ${'8'}
    ${undefined}     | ${undefined} | ${''}         | ${KEYS.DIGIT_9} | ${'9'}
    ${undefined}     | ${undefined} | ${''}         | ${KEYS.BACK}    | ${'0'}
    ${undefined}     | ${undefined} | ${''}         | ${KEYS.INITIAL} | ${'0'}
    ${undefined}     | ${undefined} | ${''}         | ${KEYS.PERIOD}  | ${'0'}
  `(
    'should return correct amount with default values and falsy currentAmount',
    ({ decimalSeparator, decimals, currentAmount, inputKey, result }) => {
      const handler = createKeypadRule({ decimalSeparator, decimals });
      expect(handler(currentAmount, inputKey)).toBe(result);
    },
  );
  it.each`
    decimalSeparator | decimals     | currentAmount | inputKey        | result
    ${undefined}     | ${undefined} | ${'0'}        | ${KEYS.DIGIT_0} | ${'0'}
    ${undefined}     | ${undefined} | ${'0'}        | ${KEYS.DIGIT_1} | ${'1'}
    ${undefined}     | ${undefined} | ${'0'}        | ${KEYS.DIGIT_2} | ${'2'}
    ${undefined}     | ${undefined} | ${'0'}        | ${KEYS.DIGIT_3} | ${'3'}
    ${undefined}     | ${undefined} | ${'0'}        | ${KEYS.DIGIT_4} | ${'4'}
    ${undefined}     | ${undefined} | ${'0'}        | ${KEYS.DIGIT_5} | ${'5'}
    ${undefined}     | ${undefined} | ${'0'}        | ${KEYS.DIGIT_6} | ${'6'}
    ${undefined}     | ${undefined} | ${'0'}        | ${KEYS.DIGIT_7} | ${'7'}
    ${undefined}     | ${undefined} | ${'0'}        | ${KEYS.DIGIT_8} | ${'8'}
    ${undefined}     | ${undefined} | ${'0'}        | ${KEYS.DIGIT_9} | ${'9'}
    ${undefined}     | ${undefined} | ${'0'}        | ${KEYS.BACK}    | ${'0'}
    ${undefined}     | ${undefined} | ${'0'}        | ${KEYS.INITIAL} | ${'0'}
    ${undefined}     | ${undefined} | ${'0'}        | ${KEYS.PERIOD}  | ${'0'}
    ${undefined}     | ${undefined} | ${'1'}        | ${KEYS.DIGIT_0} | ${'10'}
    ${undefined}     | ${undefined} | ${'1'}        | ${KEYS.DIGIT_1} | ${'11'}
    ${undefined}     | ${undefined} | ${'1'}        | ${KEYS.DIGIT_2} | ${'12'}
    ${undefined}     | ${undefined} | ${'1'}        | ${KEYS.DIGIT_3} | ${'13'}
    ${undefined}     | ${undefined} | ${'1'}        | ${KEYS.DIGIT_4} | ${'14'}
    ${undefined}     | ${undefined} | ${'1'}        | ${KEYS.DIGIT_5} | ${'15'}
    ${undefined}     | ${undefined} | ${'1'}        | ${KEYS.DIGIT_6} | ${'16'}
    ${undefined}     | ${undefined} | ${'1'}        | ${KEYS.DIGIT_7} | ${'17'}
    ${undefined}     | ${undefined} | ${'1'}        | ${KEYS.DIGIT_8} | ${'18'}
    ${undefined}     | ${undefined} | ${'1'}        | ${KEYS.DIGIT_9} | ${'19'}
    ${undefined}     | ${undefined} | ${'1'}        | ${KEYS.BACK}    | ${'0'}
    ${undefined}     | ${undefined} | ${'1'}        | ${KEYS.INITIAL} | ${'0'}
    ${undefined}     | ${undefined} | ${'1'}        | ${KEYS.PERIOD}  | ${'1'}
  `(
    'should return correct amount with default decimalSeparator and decimals values',
    ({ decimalSeparator, decimals, currentAmount, inputKey, result }) => {
      const handler = createKeypadRule({ decimalSeparator, decimals });
      expect(handler(currentAmount, inputKey)).toBe(result);
    },
  );

  it.each`
    decimalSeparator | decimals     | currentAmount | inputKey        | result
    ${'.'}           | ${undefined} | ${'0'}        | ${KEYS.DIGIT_0} | ${'0'}
    ${'.'}           | ${undefined} | ${'0'}        | ${KEYS.DIGIT_1} | ${'1'}
    ${'.'}           | ${undefined} | ${'0'}        | ${KEYS.DIGIT_2} | ${'2'}
    ${'.'}           | ${undefined} | ${'0'}        | ${KEYS.DIGIT_3} | ${'3'}
    ${'.'}           | ${undefined} | ${'0'}        | ${KEYS.DIGIT_4} | ${'4'}
    ${'.'}           | ${undefined} | ${'0'}        | ${KEYS.DIGIT_5} | ${'5'}
    ${'.'}           | ${undefined} | ${'0'}        | ${KEYS.DIGIT_6} | ${'6'}
    ${'.'}           | ${undefined} | ${'0'}        | ${KEYS.DIGIT_7} | ${'7'}
    ${'.'}           | ${undefined} | ${'0'}        | ${KEYS.DIGIT_8} | ${'8'}
    ${'.'}           | ${undefined} | ${'0'}        | ${KEYS.DIGIT_9} | ${'9'}
    ${'.'}           | ${undefined} | ${'0'}        | ${KEYS.BACK}    | ${'0'}
    ${'.'}           | ${undefined} | ${'0'}        | ${KEYS.INITIAL} | ${'0'}
    ${'.'}           | ${undefined} | ${'0'}        | ${KEYS.PERIOD}  | ${'0.'}
    ${'.'}           | ${undefined} | ${'1'}        | ${KEYS.DIGIT_0} | ${'10'}
    ${'.'}           | ${undefined} | ${'1'}        | ${KEYS.DIGIT_1} | ${'11'}
    ${'.'}           | ${undefined} | ${'1'}        | ${KEYS.DIGIT_2} | ${'12'}
    ${'.'}           | ${undefined} | ${'1'}        | ${KEYS.DIGIT_3} | ${'13'}
    ${'.'}           | ${undefined} | ${'1'}        | ${KEYS.DIGIT_4} | ${'14'}
    ${'.'}           | ${undefined} | ${'1'}        | ${KEYS.DIGIT_5} | ${'15'}
    ${'.'}           | ${undefined} | ${'1'}        | ${KEYS.DIGIT_6} | ${'16'}
    ${'.'}           | ${undefined} | ${'1'}        | ${KEYS.DIGIT_7} | ${'17'}
    ${'.'}           | ${undefined} | ${'1'}        | ${KEYS.DIGIT_8} | ${'18'}
    ${'.'}           | ${undefined} | ${'1'}        | ${KEYS.DIGIT_9} | ${'19'}
    ${'.'}           | ${undefined} | ${'1'}        | ${KEYS.BACK}    | ${'0'}
    ${'.'}           | ${undefined} | ${'1'}        | ${KEYS.INITIAL} | ${'0'}
    ${'.'}           | ${undefined} | ${'1'}        | ${KEYS.PERIOD}  | ${'1.'}
    ${'.'}           | ${undefined} | ${'1.'}       | ${KEYS.DIGIT_0} | ${'1.0'}
    ${'.'}           | ${undefined} | ${'1.'}       | ${KEYS.DIGIT_1} | ${'1.1'}
    ${'.'}           | ${undefined} | ${'1.'}       | ${KEYS.DIGIT_2} | ${'1.2'}
    ${'.'}           | ${undefined} | ${'1.'}       | ${KEYS.DIGIT_3} | ${'1.3'}
    ${'.'}           | ${undefined} | ${'1.'}       | ${KEYS.DIGIT_4} | ${'1.4'}
    ${'.'}           | ${undefined} | ${'1.'}       | ${KEYS.DIGIT_5} | ${'1.5'}
    ${'.'}           | ${undefined} | ${'1.'}       | ${KEYS.DIGIT_6} | ${'1.6'}
    ${'.'}           | ${undefined} | ${'1.'}       | ${KEYS.DIGIT_7} | ${'1.7'}
    ${'.'}           | ${undefined} | ${'1.'}       | ${KEYS.DIGIT_8} | ${'1.8'}
    ${'.'}           | ${undefined} | ${'1.'}       | ${KEYS.DIGIT_9} | ${'1.9'}
    ${'.'}           | ${undefined} | ${'1.'}       | ${KEYS.BACK}    | ${'1'}
    ${'.'}           | ${undefined} | ${'1.'}       | ${KEYS.INITIAL} | ${'0'}
    ${'.'}           | ${undefined} | ${'1.'}       | ${KEYS.PERIOD}  | ${'1.'}
    ${'.'}           | ${undefined} | ${'1.1'}      | ${KEYS.DIGIT_0} | ${'1.10'}
    ${'.'}           | ${undefined} | ${'1.1'}      | ${KEYS.DIGIT_1} | ${'1.11'}
    ${'.'}           | ${undefined} | ${'1.1'}      | ${KEYS.DIGIT_2} | ${'1.12'}
    ${'.'}           | ${undefined} | ${'1.1'}      | ${KEYS.DIGIT_3} | ${'1.13'}
    ${'.'}           | ${undefined} | ${'1.1'}      | ${KEYS.DIGIT_4} | ${'1.14'}
    ${'.'}           | ${undefined} | ${'1.1'}      | ${KEYS.DIGIT_5} | ${'1.15'}
    ${'.'}           | ${undefined} | ${'1.1'}      | ${KEYS.DIGIT_6} | ${'1.16'}
    ${'.'}           | ${undefined} | ${'1.1'}      | ${KEYS.DIGIT_7} | ${'1.17'}
    ${'.'}           | ${undefined} | ${'1.1'}      | ${KEYS.DIGIT_8} | ${'1.18'}
    ${'.'}           | ${undefined} | ${'1.1'}      | ${KEYS.DIGIT_9} | ${'1.19'}
    ${'.'}           | ${undefined} | ${'1.1'}      | ${KEYS.BACK}    | ${'1.'}
    ${'.'}           | ${undefined} | ${'1.1'}      | ${KEYS.INITIAL} | ${'0'}
    ${'.'}           | ${undefined} | ${'1.1'}      | ${KEYS.PERIOD}  | ${'1.1'}
  `(
    'should return correct amount with decimalSeparator . and default decimals',
    ({ decimalSeparator, decimals, currentAmount, inputKey, result }) => {
      const handler = createKeypadRule({ decimalSeparator, decimals });
      expect(handler(currentAmount, inputKey)).toBe(result);
    },
  );

  it.each`
    decimalSeparator | decimals | currentAmount | inputKey        | result
    ${'.'}           | ${3}     | ${'1.'}       | ${KEYS.DIGIT_0} | ${'1.0'}
    ${'.'}           | ${3}     | ${'1.'}       | ${KEYS.DIGIT_1} | ${'1.1'}
    ${'.'}           | ${3}     | ${'1.'}       | ${KEYS.DIGIT_2} | ${'1.2'}
    ${'.'}           | ${3}     | ${'1.'}       | ${KEYS.DIGIT_3} | ${'1.3'}
    ${'.'}           | ${3}     | ${'1.'}       | ${KEYS.DIGIT_4} | ${'1.4'}
    ${'.'}           | ${3}     | ${'1.'}       | ${KEYS.DIGIT_5} | ${'1.5'}
    ${'.'}           | ${3}     | ${'1.'}       | ${KEYS.DIGIT_6} | ${'1.6'}
    ${'.'}           | ${3}     | ${'1.'}       | ${KEYS.DIGIT_7} | ${'1.7'}
    ${'.'}           | ${3}     | ${'1.'}       | ${KEYS.DIGIT_8} | ${'1.8'}
    ${'.'}           | ${3}     | ${'1.'}       | ${KEYS.DIGIT_9} | ${'1.9'}
    ${'.'}           | ${3}     | ${'1.'}       | ${KEYS.BACK}    | ${'1'}
    ${'.'}           | ${3}     | ${'1.'}       | ${KEYS.INITIAL} | ${'0'}
    ${'.'}           | ${3}     | ${'1.'}       | ${KEYS.PERIOD}  | ${'1.'}
    ${'.'}           | ${3}     | ${'1.1'}      | ${KEYS.DIGIT_0} | ${'1.10'}
    ${'.'}           | ${3}     | ${'1.1'}      | ${KEYS.DIGIT_1} | ${'1.11'}
    ${'.'}           | ${3}     | ${'1.1'}      | ${KEYS.DIGIT_2} | ${'1.12'}
    ${'.'}           | ${3}     | ${'1.1'}      | ${KEYS.DIGIT_3} | ${'1.13'}
    ${'.'}           | ${3}     | ${'1.1'}      | ${KEYS.DIGIT_4} | ${'1.14'}
    ${'.'}           | ${3}     | ${'1.1'}      | ${KEYS.DIGIT_5} | ${'1.15'}
    ${'.'}           | ${3}     | ${'1.1'}      | ${KEYS.DIGIT_6} | ${'1.16'}
    ${'.'}           | ${3}     | ${'1.1'}      | ${KEYS.DIGIT_7} | ${'1.17'}
    ${'.'}           | ${3}     | ${'1.1'}      | ${KEYS.DIGIT_8} | ${'1.18'}
    ${'.'}           | ${3}     | ${'1.1'}      | ${KEYS.DIGIT_9} | ${'1.19'}
    ${'.'}           | ${3}     | ${'1.1'}      | ${KEYS.BACK}    | ${'1.'}
    ${'.'}           | ${3}     | ${'1.1'}      | ${KEYS.INITIAL} | ${'0'}
    ${'.'}           | ${3}     | ${'1.1'}      | ${KEYS.PERIOD}  | ${'1.1'}
    ${'.'}           | ${3}     | ${'1.11'}     | ${KEYS.DIGIT_0} | ${'1.110'}
    ${'.'}           | ${3}     | ${'1.11'}     | ${KEYS.DIGIT_1} | ${'1.111'}
    ${'.'}           | ${3}     | ${'1.11'}     | ${KEYS.DIGIT_2} | ${'1.112'}
    ${'.'}           | ${3}     | ${'1.11'}     | ${KEYS.DIGIT_3} | ${'1.113'}
    ${'.'}           | ${3}     | ${'1.11'}     | ${KEYS.DIGIT_4} | ${'1.114'}
    ${'.'}           | ${3}     | ${'1.11'}     | ${KEYS.DIGIT_5} | ${'1.115'}
    ${'.'}           | ${3}     | ${'1.11'}     | ${KEYS.DIGIT_6} | ${'1.116'}
    ${'.'}           | ${3}     | ${'1.11'}     | ${KEYS.DIGIT_7} | ${'1.117'}
    ${'.'}           | ${3}     | ${'1.11'}     | ${KEYS.DIGIT_8} | ${'1.118'}
    ${'.'}           | ${3}     | ${'1.11'}     | ${KEYS.DIGIT_9} | ${'1.119'}
    ${'.'}           | ${3}     | ${'1.11'}     | ${KEYS.BACK}    | ${'1.1'}
    ${'.'}           | ${3}     | ${'1.11'}     | ${KEYS.INITIAL} | ${'0'}
    ${'.'}           | ${3}     | ${'1.11'}     | ${KEYS.PERIOD}  | ${'1.11'}
    ${'.'}           | ${3}     | ${'1.111'}    | ${KEYS.DIGIT_0} | ${'1.111'}
    ${'.'}           | ${3}     | ${'1.111'}    | ${KEYS.DIGIT_1} | ${'1.111'}
    ${'.'}           | ${3}     | ${'1.111'}    | ${KEYS.DIGIT_2} | ${'1.111'}
    ${'.'}           | ${3}     | ${'1.111'}    | ${KEYS.DIGIT_3} | ${'1.111'}
    ${'.'}           | ${3}     | ${'1.111'}    | ${KEYS.DIGIT_4} | ${'1.111'}
    ${'.'}           | ${3}     | ${'1.111'}    | ${KEYS.DIGIT_5} | ${'1.111'}
    ${'.'}           | ${3}     | ${'1.111'}    | ${KEYS.DIGIT_6} | ${'1.111'}
    ${'.'}           | ${3}     | ${'1.111'}    | ${KEYS.DIGIT_7} | ${'1.111'}
    ${'.'}           | ${3}     | ${'1.111'}    | ${KEYS.DIGIT_8} | ${'1.111'}
    ${'.'}           | ${3}     | ${'1.111'}    | ${KEYS.DIGIT_9} | ${'1.111'}
    ${'.'}           | ${3}     | ${'1.111'}    | ${KEYS.BACK}    | ${'1.11'}
    ${'.'}           | ${3}     | ${'1.111'}    | ${KEYS.INITIAL} | ${'0'}
    ${'.'}           | ${3}     | ${'1.111'}    | ${KEYS.PERIOD}  | ${'1.111'}
  `(
    'should return correct amount with decimalSeparator . and a number decimals',
    ({ decimalSeparator, decimals, currentAmount, inputKey, result }) => {
      const handler = createKeypadRule({ decimalSeparator, decimals });
      expect(handler(currentAmount, inputKey)).toBe(result);
    },
  );
  it.each`
    decimalSeparator | decimals     | currentAmount | inputKey        | result
    ${','}           | ${undefined} | ${'0'}        | ${KEYS.DIGIT_0} | ${'0'}
    ${','}           | ${undefined} | ${'0'}        | ${KEYS.DIGIT_1} | ${'1'}
    ${','}           | ${undefined} | ${'0'}        | ${KEYS.DIGIT_2} | ${'2'}
    ${','}           | ${undefined} | ${'0'}        | ${KEYS.DIGIT_3} | ${'3'}
    ${','}           | ${undefined} | ${'0'}        | ${KEYS.DIGIT_4} | ${'4'}
    ${','}           | ${undefined} | ${'0'}        | ${KEYS.DIGIT_5} | ${'5'}
    ${','}           | ${undefined} | ${'0'}        | ${KEYS.DIGIT_6} | ${'6'}
    ${','}           | ${undefined} | ${'0'}        | ${KEYS.DIGIT_7} | ${'7'}
    ${','}           | ${undefined} | ${'0'}        | ${KEYS.DIGIT_8} | ${'8'}
    ${','}           | ${undefined} | ${'0'}        | ${KEYS.DIGIT_9} | ${'9'}
    ${','}           | ${undefined} | ${'0'}        | ${KEYS.BACK}    | ${'0'}
    ${','}           | ${undefined} | ${'0'}        | ${KEYS.INITIAL} | ${'0'}
    ${','}           | ${undefined} | ${'0'}        | ${KEYS.PERIOD}  | ${'0,'}
    ${','}           | ${undefined} | ${'1'}        | ${KEYS.DIGIT_0} | ${'10'}
    ${','}           | ${undefined} | ${'1'}        | ${KEYS.DIGIT_1} | ${'11'}
    ${','}           | ${undefined} | ${'1'}        | ${KEYS.DIGIT_2} | ${'12'}
    ${','}           | ${undefined} | ${'1'}        | ${KEYS.DIGIT_3} | ${'13'}
    ${','}           | ${undefined} | ${'1'}        | ${KEYS.DIGIT_4} | ${'14'}
    ${','}           | ${undefined} | ${'1'}        | ${KEYS.DIGIT_5} | ${'15'}
    ${','}           | ${undefined} | ${'1'}        | ${KEYS.DIGIT_6} | ${'16'}
    ${','}           | ${undefined} | ${'1'}        | ${KEYS.DIGIT_7} | ${'17'}
    ${','}           | ${undefined} | ${'1'}        | ${KEYS.DIGIT_8} | ${'18'}
    ${','}           | ${undefined} | ${'1'}        | ${KEYS.DIGIT_9} | ${'19'}
    ${','}           | ${undefined} | ${'1'}        | ${KEYS.BACK}    | ${'0'}
    ${','}           | ${undefined} | ${'1'}        | ${KEYS.INITIAL} | ${'0'}
    ${','}           | ${undefined} | ${'1'}        | ${KEYS.PERIOD}  | ${'1,'}
    ${','}           | ${undefined} | ${'1,'}       | ${KEYS.DIGIT_0} | ${'1,0'}
    ${','}           | ${undefined} | ${'1,'}       | ${KEYS.DIGIT_1} | ${'1,1'}
    ${','}           | ${undefined} | ${'1,'}       | ${KEYS.DIGIT_2} | ${'1,2'}
    ${','}           | ${undefined} | ${'1,'}       | ${KEYS.DIGIT_3} | ${'1,3'}
    ${','}           | ${undefined} | ${'1,'}       | ${KEYS.DIGIT_4} | ${'1,4'}
    ${','}           | ${undefined} | ${'1,'}       | ${KEYS.DIGIT_5} | ${'1,5'}
    ${','}           | ${undefined} | ${'1,'}       | ${KEYS.DIGIT_6} | ${'1,6'}
    ${','}           | ${undefined} | ${'1,'}       | ${KEYS.DIGIT_7} | ${'1,7'}
    ${','}           | ${undefined} | ${'1,'}       | ${KEYS.DIGIT_8} | ${'1,8'}
    ${','}           | ${undefined} | ${'1,'}       | ${KEYS.DIGIT_9} | ${'1,9'}
    ${','}           | ${undefined} | ${'1,'}       | ${KEYS.BACK}    | ${'1'}
    ${','}           | ${undefined} | ${'1,'}       | ${KEYS.INITIAL} | ${'0'}
    ${','}           | ${undefined} | ${'1,'}       | ${KEYS.PERIOD}  | ${'1,'}
    ${','}           | ${undefined} | ${'1,1'}      | ${KEYS.DIGIT_0} | ${'1,10'}
    ${','}           | ${undefined} | ${'1,1'}      | ${KEYS.DIGIT_1} | ${'1,11'}
    ${','}           | ${undefined} | ${'1,1'}      | ${KEYS.DIGIT_2} | ${'1,12'}
    ${','}           | ${undefined} | ${'1,1'}      | ${KEYS.DIGIT_3} | ${'1,13'}
    ${','}           | ${undefined} | ${'1,1'}      | ${KEYS.DIGIT_4} | ${'1,14'}
    ${','}           | ${undefined} | ${'1,1'}      | ${KEYS.DIGIT_5} | ${'1,15'}
    ${','}           | ${undefined} | ${'1,1'}      | ${KEYS.DIGIT_6} | ${'1,16'}
    ${','}           | ${undefined} | ${'1,1'}      | ${KEYS.DIGIT_7} | ${'1,17'}
    ${','}           | ${undefined} | ${'1,1'}      | ${KEYS.DIGIT_8} | ${'1,18'}
    ${','}           | ${undefined} | ${'1,1'}      | ${KEYS.DIGIT_9} | ${'1,19'}
    ${','}           | ${undefined} | ${'1,1'}      | ${KEYS.BACK}    | ${'1,'}
    ${','}           | ${undefined} | ${'1,1'}      | ${KEYS.INITIAL} | ${'0'}
    ${','}           | ${undefined} | ${'1,1'}      | ${KEYS.PERIOD}  | ${'1,1'}
  `(
    'should return correct amount with decimalSeparator , and default decimals',
    ({ decimalSeparator, decimals, currentAmount, inputKey, result }) => {
      const handler = createKeypadRule({ decimalSeparator, decimals });
      expect(handler(currentAmount, inputKey)).toBe(result);
    },
  );

  it.each`
    decimalSeparator | decimals | currentAmount | inputKey        | result
    ${','}           | ${3}     | ${'1,'}       | ${KEYS.DIGIT_0} | ${'1,0'}
    ${','}           | ${3}     | ${'1,'}       | ${KEYS.DIGIT_1} | ${'1,1'}
    ${','}           | ${3}     | ${'1,'}       | ${KEYS.DIGIT_2} | ${'1,2'}
    ${','}           | ${3}     | ${'1,'}       | ${KEYS.DIGIT_3} | ${'1,3'}
    ${','}           | ${3}     | ${'1,'}       | ${KEYS.DIGIT_4} | ${'1,4'}
    ${','}           | ${3}     | ${'1,'}       | ${KEYS.DIGIT_5} | ${'1,5'}
    ${','}           | ${3}     | ${'1,'}       | ${KEYS.DIGIT_6} | ${'1,6'}
    ${','}           | ${3}     | ${'1,'}       | ${KEYS.DIGIT_7} | ${'1,7'}
    ${','}           | ${3}     | ${'1,'}       | ${KEYS.DIGIT_8} | ${'1,8'}
    ${','}           | ${3}     | ${'1,'}       | ${KEYS.DIGIT_9} | ${'1,9'}
    ${','}           | ${3}     | ${'1,'}       | ${KEYS.BACK}    | ${'1'}
    ${','}           | ${3}     | ${'1,'}       | ${KEYS.INITIAL} | ${'0'}
    ${','}           | ${3}     | ${'1,'}       | ${KEYS.PERIOD}  | ${'1,'}
    ${','}           | ${3}     | ${'1,1'}      | ${KEYS.DIGIT_0} | ${'1,10'}
    ${','}           | ${3}     | ${'1,1'}      | ${KEYS.DIGIT_1} | ${'1,11'}
    ${','}           | ${3}     | ${'1,1'}      | ${KEYS.DIGIT_2} | ${'1,12'}
    ${','}           | ${3}     | ${'1,1'}      | ${KEYS.DIGIT_3} | ${'1,13'}
    ${','}           | ${3}     | ${'1,1'}      | ${KEYS.DIGIT_4} | ${'1,14'}
    ${','}           | ${3}     | ${'1,1'}      | ${KEYS.DIGIT_5} | ${'1,15'}
    ${','}           | ${3}     | ${'1,1'}      | ${KEYS.DIGIT_6} | ${'1,16'}
    ${','}           | ${3}     | ${'1,1'}      | ${KEYS.DIGIT_7} | ${'1,17'}
    ${','}           | ${3}     | ${'1,1'}      | ${KEYS.DIGIT_8} | ${'1,18'}
    ${','}           | ${3}     | ${'1,1'}      | ${KEYS.DIGIT_9} | ${'1,19'}
    ${','}           | ${3}     | ${'1,1'}      | ${KEYS.BACK}    | ${'1,'}
    ${','}           | ${3}     | ${'1,1'}      | ${KEYS.INITIAL} | ${'0'}
    ${','}           | ${3}     | ${'1,1'}      | ${KEYS.PERIOD}  | ${'1,1'}
    ${','}           | ${3}     | ${'1,11'}     | ${KEYS.DIGIT_0} | ${'1,110'}
    ${','}           | ${3}     | ${'1,11'}     | ${KEYS.DIGIT_1} | ${'1,111'}
    ${','}           | ${3}     | ${'1,11'}     | ${KEYS.DIGIT_2} | ${'1,112'}
    ${','}           | ${3}     | ${'1,11'}     | ${KEYS.DIGIT_3} | ${'1,113'}
    ${','}           | ${3}     | ${'1,11'}     | ${KEYS.DIGIT_4} | ${'1,114'}
    ${','}           | ${3}     | ${'1,11'}     | ${KEYS.DIGIT_5} | ${'1,115'}
    ${','}           | ${3}     | ${'1,11'}     | ${KEYS.DIGIT_6} | ${'1,116'}
    ${','}           | ${3}     | ${'1,11'}     | ${KEYS.DIGIT_7} | ${'1,117'}
    ${','}           | ${3}     | ${'1,11'}     | ${KEYS.DIGIT_8} | ${'1,118'}
    ${','}           | ${3}     | ${'1,11'}     | ${KEYS.DIGIT_9} | ${'1,119'}
    ${','}           | ${3}     | ${'1,11'}     | ${KEYS.BACK}    | ${'1,1'}
    ${','}           | ${3}     | ${'1,11'}     | ${KEYS.INITIAL} | ${'0'}
    ${','}           | ${3}     | ${'1,11'}     | ${KEYS.PERIOD}  | ${'1,11'}
    ${','}           | ${3}     | ${'1,111'}    | ${KEYS.DIGIT_0} | ${'1,111'}
    ${','}           | ${3}     | ${'1,111'}    | ${KEYS.DIGIT_1} | ${'1,111'}
    ${','}           | ${3}     | ${'1,111'}    | ${KEYS.DIGIT_2} | ${'1,111'}
    ${','}           | ${3}     | ${'1,111'}    | ${KEYS.DIGIT_3} | ${'1,111'}
    ${','}           | ${3}     | ${'1,111'}    | ${KEYS.DIGIT_4} | ${'1,111'}
    ${','}           | ${3}     | ${'1,111'}    | ${KEYS.DIGIT_5} | ${'1,111'}
    ${','}           | ${3}     | ${'1,111'}    | ${KEYS.DIGIT_6} | ${'1,111'}
    ${','}           | ${3}     | ${'1,111'}    | ${KEYS.DIGIT_7} | ${'1,111'}
    ${','}           | ${3}     | ${'1,111'}    | ${KEYS.DIGIT_8} | ${'1,111'}
    ${','}           | ${3}     | ${'1,111'}    | ${KEYS.DIGIT_9} | ${'1,111'}
    ${','}           | ${3}     | ${'1,111'}    | ${KEYS.BACK}    | ${'1,11'}
    ${','}           | ${3}     | ${'1,111'}    | ${KEYS.INITIAL} | ${'0'}
    ${','}           | ${3}     | ${'1,111'}    | ${KEYS.PERIOD}  | ${'1,111'}
  `(
    'should return correct amount with decimalSeparator , and a number decimals',
    ({ decimalSeparator, decimals, currentAmount, inputKey, result }) => {
      const handler = createKeypadRule({ decimalSeparator, decimals });
      expect(handler(currentAmount, inputKey)).toBe(result);
    },
  );

  it.each`
    decimalSeparator | decimals | currentAmount | inputKey        | result
    ${','}           | ${0}     | ${'1'}        | ${KEYS.DIGIT_1} | ${'11'}
    ${','}           | ${0}     | ${'1'}        | ${KEYS.PERIOD}  | ${'1'}
    ${','}           | ${0}     | ${'1'}        | ${KEYS.BACK}    | ${'0'}
    ${','}           | ${0}     | ${'1'}        | ${KEYS.INITIAL} | ${'0'}
    ${','}           | ${false} | ${'1'}        | ${KEYS.DIGIT_1} | ${'11'}
    ${','}           | ${false} | ${'1'}        | ${KEYS.PERIOD}  | ${'1'}
    ${','}           | ${false} | ${'1'}        | ${KEYS.BACK}    | ${'0'}
    ${','}           | ${false} | ${'1'}        | ${KEYS.INITIAL} | ${'0'}
  `(
    'should return correct amount with decimalSeparator , and 0/false decimals',
    ({ decimalSeparator, decimals, currentAmount, inputKey, result }) => {
      const handler = createKeypadRule({ decimalSeparator, decimals });
      expect(handler(currentAmount, inputKey)).toBe(result);
    },
  );

  it.each`
    decimalSeparator | decimals | currentAmount | inputKey        | result
    ${undefined}     | ${3}     | ${'1'}        | ${KEYS.DIGIT_1} | ${'11'}
    ${undefined}     | ${3}     | ${'1'}        | ${KEYS.PERIOD}  | ${'1'}
    ${undefined}     | ${3}     | ${'1'}        | ${KEYS.BACK}    | ${'0'}
    ${undefined}     | ${3}     | ${'1'}        | ${KEYS.INITIAL} | ${'0'}
    ${null}          | ${3}     | ${'1'}        | ${KEYS.DIGIT_1} | ${'11'}
    ${null}          | ${3}     | ${'1'}        | ${KEYS.PERIOD}  | ${'1'}
    ${null}          | ${3}     | ${'1'}        | ${KEYS.BACK}    | ${'0'}
    ${null}          | ${3}     | ${'1'}        | ${KEYS.INITIAL} | ${'0'}
    ${false}         | ${3}     | ${'1'}        | ${KEYS.DIGIT_1} | ${'11'}
    ${false}         | ${3}     | ${'1'}        | ${KEYS.PERIOD}  | ${'1'}
    ${false}         | ${3}     | ${'1'}        | ${KEYS.BACK}    | ${'0'}
    ${false}         | ${3}     | ${'1'}        | ${KEYS.INITIAL} | ${'0'}
  `(
    'should return correct amount with falsy decimalSeparator and number decimals',
    ({ decimalSeparator, decimals, currentAmount, inputKey, result }) => {
      const handler = createKeypadRule({ decimalSeparator, decimals });
      expect(handler(currentAmount, inputKey)).toBe(result);
    },
  );
});
