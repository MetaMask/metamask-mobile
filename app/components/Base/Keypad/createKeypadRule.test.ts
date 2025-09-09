import createKeypadRule from './createKeypadRule';
import { Keys } from './constants';

describe('createKeypadRule', () => {
  it('should return a function', () => {
    expect(createKeypadRule()).toBeInstanceOf(Function);
  });

  it.each`
    decimalSeparator | decimals     | currentAmount | inputKey        | result
    ${undefined}     | ${undefined} | ${''}         | ${Keys.Digit0}  | ${'0'}
    ${undefined}     | ${undefined} | ${''}         | ${Keys.Digit1}  | ${'1'}
    ${undefined}     | ${undefined} | ${''}         | ${Keys.Digit2}  | ${'2'}
    ${undefined}     | ${undefined} | ${''}         | ${Keys.Digit3}  | ${'3'}
    ${undefined}     | ${undefined} | ${''}         | ${Keys.Digit4}  | ${'4'}
    ${undefined}     | ${undefined} | ${''}         | ${Keys.Digit5}  | ${'5'}
    ${undefined}     | ${undefined} | ${''}         | ${Keys.Digit6}  | ${'6'}
    ${undefined}     | ${undefined} | ${''}         | ${Keys.Digit7}  | ${'7'}
    ${undefined}     | ${undefined} | ${''}         | ${Keys.Digit8}  | ${'8'}
    ${undefined}     | ${undefined} | ${''}         | ${Keys.Digit9}  | ${'9'}
    ${undefined}     | ${undefined} | ${''}         | ${Keys.Back}    | ${'0'}
    ${undefined}     | ${undefined} | ${''}         | ${Keys.Initial} | ${'0'}
    ${undefined}     | ${undefined} | ${''}         | ${Keys.Period}  | ${'0'}
  `(
    'should return correct amount with default values and empty currentAmount',
    ({
      decimalSeparator,
      decimals,
      currentAmount,
      inputKey,
      result,
    }: {
      decimalSeparator: string | undefined;
      decimals: number | undefined;
      currentAmount: string;
      inputKey: Keys;
      result: string;
    }) => {
      const handler = createKeypadRule({ decimalSeparator, decimals });
      expect(handler(currentAmount, inputKey)).toBe(result);
    },
  );
  it.each`
    decimalSeparator | decimals     | currentAmount | inputKey        | result
    ${undefined}     | ${undefined} | ${'0'}        | ${Keys.Digit0}  | ${'0'}
    ${undefined}     | ${undefined} | ${'0'}        | ${Keys.Digit1}  | ${'1'}
    ${undefined}     | ${undefined} | ${'0'}        | ${Keys.Digit2}  | ${'2'}
    ${undefined}     | ${undefined} | ${'0'}        | ${Keys.Digit3}  | ${'3'}
    ${undefined}     | ${undefined} | ${'0'}        | ${Keys.Digit4}  | ${'4'}
    ${undefined}     | ${undefined} | ${'0'}        | ${Keys.Digit5}  | ${'5'}
    ${undefined}     | ${undefined} | ${'0'}        | ${Keys.Digit6}  | ${'6'}
    ${undefined}     | ${undefined} | ${'0'}        | ${Keys.Digit7}  | ${'7'}
    ${undefined}     | ${undefined} | ${'0'}        | ${Keys.Digit8}  | ${'8'}
    ${undefined}     | ${undefined} | ${'0'}        | ${Keys.Digit9}  | ${'9'}
    ${undefined}     | ${undefined} | ${'0'}        | ${Keys.Back}    | ${'0'}
    ${undefined}     | ${undefined} | ${'0'}        | ${Keys.Initial} | ${'0'}
    ${undefined}     | ${undefined} | ${'0'}        | ${Keys.Period}  | ${'0'}
    ${undefined}     | ${undefined} | ${'1'}        | ${Keys.Digit0}  | ${'10'}
    ${undefined}     | ${undefined} | ${'1'}        | ${Keys.Digit1}  | ${'11'}
    ${undefined}     | ${undefined} | ${'1'}        | ${Keys.Digit2}  | ${'12'}
    ${undefined}     | ${undefined} | ${'1'}        | ${Keys.Digit3}  | ${'13'}
    ${undefined}     | ${undefined} | ${'1'}        | ${Keys.Digit4}  | ${'14'}
    ${undefined}     | ${undefined} | ${'1'}        | ${Keys.Digit5}  | ${'15'}
    ${undefined}     | ${undefined} | ${'1'}        | ${Keys.Digit6}  | ${'16'}
    ${undefined}     | ${undefined} | ${'1'}        | ${Keys.Digit7}  | ${'17'}
    ${undefined}     | ${undefined} | ${'1'}        | ${Keys.Digit8}  | ${'18'}
    ${undefined}     | ${undefined} | ${'1'}        | ${Keys.Digit9}  | ${'19'}
    ${undefined}     | ${undefined} | ${'1'}        | ${Keys.Back}    | ${'0'}
    ${undefined}     | ${undefined} | ${'1'}        | ${Keys.Initial} | ${'0'}
    ${undefined}     | ${undefined} | ${'1'}        | ${Keys.Period}  | ${'1'}
  `(
    'should return correct amount with default decimalSeparator and decimals values',
    ({
      decimalSeparator,
      decimals,
      currentAmount,
      inputKey,
      result,
    }: {
      decimalSeparator: string | undefined;
      decimals: number | undefined;
      currentAmount: string;
      inputKey: Keys;
      result: string;
    }) => {
      const handler = createKeypadRule({ decimalSeparator, decimals });
      expect(handler(currentAmount, inputKey)).toBe(result);
    },
  );

  it.each`
    decimalSeparator | decimals     | currentAmount | inputKey        | result
    ${'.'}           | ${undefined} | ${'0'}        | ${Keys.Digit0}  | ${'0'}
    ${'.'}           | ${undefined} | ${'0'}        | ${Keys.Digit1}  | ${'1'}
    ${'.'}           | ${undefined} | ${'0'}        | ${Keys.Digit2}  | ${'2'}
    ${'.'}           | ${undefined} | ${'0'}        | ${Keys.Digit3}  | ${'3'}
    ${'.'}           | ${undefined} | ${'0'}        | ${Keys.Digit4}  | ${'4'}
    ${'.'}           | ${undefined} | ${'0'}        | ${Keys.Digit5}  | ${'5'}
    ${'.'}           | ${undefined} | ${'0'}        | ${Keys.Digit6}  | ${'6'}
    ${'.'}           | ${undefined} | ${'0'}        | ${Keys.Digit7}  | ${'7'}
    ${'.'}           | ${undefined} | ${'0'}        | ${Keys.Digit8}  | ${'8'}
    ${'.'}           | ${undefined} | ${'0'}        | ${Keys.Digit9}  | ${'9'}
    ${'.'}           | ${undefined} | ${'0'}        | ${Keys.Back}    | ${'0'}
    ${'.'}           | ${undefined} | ${'0'}        | ${Keys.Initial} | ${'0'}
    ${'.'}           | ${undefined} | ${'0'}        | ${Keys.Period}  | ${'0.'}
    ${'.'}           | ${undefined} | ${'1'}        | ${Keys.Digit0}  | ${'10'}
    ${'.'}           | ${undefined} | ${'1'}        | ${Keys.Digit1}  | ${'11'}
    ${'.'}           | ${undefined} | ${'1'}        | ${Keys.Digit2}  | ${'12'}
    ${'.'}           | ${undefined} | ${'1'}        | ${Keys.Digit3}  | ${'13'}
    ${'.'}           | ${undefined} | ${'1'}        | ${Keys.Digit4}  | ${'14'}
    ${'.'}           | ${undefined} | ${'1'}        | ${Keys.Digit5}  | ${'15'}
    ${'.'}           | ${undefined} | ${'1'}        | ${Keys.Digit6}  | ${'16'}
    ${'.'}           | ${undefined} | ${'1'}        | ${Keys.Digit7}  | ${'17'}
    ${'.'}           | ${undefined} | ${'1'}        | ${Keys.Digit8}  | ${'18'}
    ${'.'}           | ${undefined} | ${'1'}        | ${Keys.Digit9}  | ${'19'}
    ${'.'}           | ${undefined} | ${'1'}        | ${Keys.Back}    | ${'0'}
    ${'.'}           | ${undefined} | ${'1'}        | ${Keys.Initial} | ${'0'}
    ${'.'}           | ${undefined} | ${'1'}        | ${Keys.Period}  | ${'1.'}
    ${'.'}           | ${undefined} | ${'1.'}       | ${Keys.Digit0}  | ${'1.0'}
    ${'.'}           | ${undefined} | ${'1.'}       | ${Keys.Digit1}  | ${'1.1'}
    ${'.'}           | ${undefined} | ${'1.'}       | ${Keys.Digit2}  | ${'1.2'}
    ${'.'}           | ${undefined} | ${'1.'}       | ${Keys.Digit3}  | ${'1.3'}
    ${'.'}           | ${undefined} | ${'1.'}       | ${Keys.Digit4}  | ${'1.4'}
    ${'.'}           | ${undefined} | ${'1.'}       | ${Keys.Digit5}  | ${'1.5'}
    ${'.'}           | ${undefined} | ${'1.'}       | ${Keys.Digit6}  | ${'1.6'}
    ${'.'}           | ${undefined} | ${'1.'}       | ${Keys.Digit7}  | ${'1.7'}
    ${'.'}           | ${undefined} | ${'1.'}       | ${Keys.Digit8}  | ${'1.8'}
    ${'.'}           | ${undefined} | ${'1.'}       | ${Keys.Digit9}  | ${'1.9'}
    ${'.'}           | ${undefined} | ${'1.'}       | ${Keys.Back}    | ${'1'}
    ${'.'}           | ${undefined} | ${'1.'}       | ${Keys.Initial} | ${'0'}
    ${'.'}           | ${undefined} | ${'1.'}       | ${Keys.Period}  | ${'1.'}
    ${'.'}           | ${undefined} | ${'1.1'}      | ${Keys.Digit0}  | ${'1.10'}
    ${'.'}           | ${undefined} | ${'1.1'}      | ${Keys.Digit1}  | ${'1.11'}
    ${'.'}           | ${undefined} | ${'1.1'}      | ${Keys.Digit2}  | ${'1.12'}
    ${'.'}           | ${undefined} | ${'1.1'}      | ${Keys.Digit3}  | ${'1.13'}
    ${'.'}           | ${undefined} | ${'1.1'}      | ${Keys.Digit4}  | ${'1.14'}
    ${'.'}           | ${undefined} | ${'1.1'}      | ${Keys.Digit5}  | ${'1.15'}
    ${'.'}           | ${undefined} | ${'1.1'}      | ${Keys.Digit6}  | ${'1.16'}
    ${'.'}           | ${undefined} | ${'1.1'}      | ${Keys.Digit7}  | ${'1.17'}
    ${'.'}           | ${undefined} | ${'1.1'}      | ${Keys.Digit8}  | ${'1.18'}
    ${'.'}           | ${undefined} | ${'1.1'}      | ${Keys.Digit9}  | ${'1.19'}
    ${'.'}           | ${undefined} | ${'1.1'}      | ${Keys.Back}    | ${'1.'}
    ${'.'}           | ${undefined} | ${'1.1'}      | ${Keys.Initial} | ${'0'}
    ${'.'}           | ${undefined} | ${'1.1'}      | ${Keys.Period}  | ${'1.1'}
  `(
    'should return correct amount with decimalSeparator . and default decimals',
    ({
      decimalSeparator,
      decimals,
      currentAmount,
      inputKey,
      result,
    }: {
      decimalSeparator: string;
      decimals: number | undefined;
      currentAmount: string;
      inputKey: Keys;
      result: string;
    }) => {
      const handler = createKeypadRule({ decimalSeparator, decimals });
      expect(handler(currentAmount, inputKey)).toBe(result);
    },
  );

  it.each`
    decimalSeparator | decimals | currentAmount | inputKey        | result
    ${'.'}           | ${3}     | ${'1.'}       | ${Keys.Digit0}  | ${'1.0'}
    ${'.'}           | ${3}     | ${'1.'}       | ${Keys.Digit1}  | ${'1.1'}
    ${'.'}           | ${3}     | ${'1.'}       | ${Keys.Digit2}  | ${'1.2'}
    ${'.'}           | ${3}     | ${'1.'}       | ${Keys.Digit3}  | ${'1.3'}
    ${'.'}           | ${3}     | ${'1.'}       | ${Keys.Digit4}  | ${'1.4'}
    ${'.'}           | ${3}     | ${'1.'}       | ${Keys.Digit5}  | ${'1.5'}
    ${'.'}           | ${3}     | ${'1.'}       | ${Keys.Digit6}  | ${'1.6'}
    ${'.'}           | ${3}     | ${'1.'}       | ${Keys.Digit7}  | ${'1.7'}
    ${'.'}           | ${3}     | ${'1.'}       | ${Keys.Digit8}  | ${'1.8'}
    ${'.'}           | ${3}     | ${'1.'}       | ${Keys.Digit9}  | ${'1.9'}
    ${'.'}           | ${3}     | ${'1.'}       | ${Keys.Back}    | ${'1'}
    ${'.'}           | ${3}     | ${'1.'}       | ${Keys.Initial} | ${'0'}
    ${'.'}           | ${3}     | ${'1.'}       | ${Keys.Period}  | ${'1.'}
    ${'.'}           | ${3}     | ${'1.1'}      | ${Keys.Digit0}  | ${'1.10'}
    ${'.'}           | ${3}     | ${'1.1'}      | ${Keys.Digit1}  | ${'1.11'}
    ${'.'}           | ${3}     | ${'1.1'}      | ${Keys.Digit2}  | ${'1.12'}
    ${'.'}           | ${3}     | ${'1.1'}      | ${Keys.Digit3}  | ${'1.13'}
    ${'.'}           | ${3}     | ${'1.1'}      | ${Keys.Digit4}  | ${'1.14'}
    ${'.'}           | ${3}     | ${'1.1'}      | ${Keys.Digit5}  | ${'1.15'}
    ${'.'}           | ${3}     | ${'1.1'}      | ${Keys.Digit6}  | ${'1.16'}
    ${'.'}           | ${3}     | ${'1.1'}      | ${Keys.Digit7}  | ${'1.17'}
    ${'.'}           | ${3}     | ${'1.1'}      | ${Keys.Digit8}  | ${'1.18'}
    ${'.'}           | ${3}     | ${'1.1'}      | ${Keys.Digit9}  | ${'1.19'}
    ${'.'}           | ${3}     | ${'1.1'}      | ${Keys.Back}    | ${'1.'}
    ${'.'}           | ${3}     | ${'1.1'}      | ${Keys.Initial} | ${'0'}
    ${'.'}           | ${3}     | ${'1.1'}      | ${Keys.Period}  | ${'1.1'}
    ${'.'}           | ${3}     | ${'1.11'}     | ${Keys.Digit0}  | ${'1.110'}
    ${'.'}           | ${3}     | ${'1.11'}     | ${Keys.Digit1}  | ${'1.111'}
    ${'.'}           | ${3}     | ${'1.11'}     | ${Keys.Digit2}  | ${'1.112'}
    ${'.'}           | ${3}     | ${'1.11'}     | ${Keys.Digit3}  | ${'1.113'}
    ${'.'}           | ${3}     | ${'1.11'}     | ${Keys.Digit4}  | ${'1.114'}
    ${'.'}           | ${3}     | ${'1.11'}     | ${Keys.Digit5}  | ${'1.115'}
    ${'.'}           | ${3}     | ${'1.11'}     | ${Keys.Digit6}  | ${'1.116'}
    ${'.'}           | ${3}     | ${'1.11'}     | ${Keys.Digit7}  | ${'1.117'}
    ${'.'}           | ${3}     | ${'1.11'}     | ${Keys.Digit8}  | ${'1.118'}
    ${'.'}           | ${3}     | ${'1.11'}     | ${Keys.Digit9}  | ${'1.119'}
    ${'.'}           | ${3}     | ${'1.11'}     | ${Keys.Back}    | ${'1.1'}
    ${'.'}           | ${3}     | ${'1.11'}     | ${Keys.Initial} | ${'0'}
    ${'.'}           | ${3}     | ${'1.11'}     | ${Keys.Period}  | ${'1.11'}
    ${'.'}           | ${3}     | ${'1.111'}    | ${Keys.Digit0}  | ${'1.111'}
    ${'.'}           | ${3}     | ${'1.111'}    | ${Keys.Digit1}  | ${'1.111'}
    ${'.'}           | ${3}     | ${'1.111'}    | ${Keys.Digit2}  | ${'1.111'}
    ${'.'}           | ${3}     | ${'1.111'}    | ${Keys.Digit3}  | ${'1.111'}
    ${'.'}           | ${3}     | ${'1.111'}    | ${Keys.Digit4}  | ${'1.111'}
    ${'.'}           | ${3}     | ${'1.111'}    | ${Keys.Digit5}  | ${'1.111'}
    ${'.'}           | ${3}     | ${'1.111'}    | ${Keys.Digit6}  | ${'1.111'}
    ${'.'}           | ${3}     | ${'1.111'}    | ${Keys.Digit7}  | ${'1.111'}
    ${'.'}           | ${3}     | ${'1.111'}    | ${Keys.Digit8}  | ${'1.111'}
    ${'.'}           | ${3}     | ${'1.111'}    | ${Keys.Digit9}  | ${'1.111'}
    ${'.'}           | ${3}     | ${'1.111'}    | ${Keys.Back}    | ${'1.11'}
    ${'.'}           | ${3}     | ${'1.111'}    | ${Keys.Initial} | ${'0'}
    ${'.'}           | ${3}     | ${'1.111'}    | ${Keys.Period}  | ${'1.111'}
  `(
    'should return correct amount with decimalSeparator . and a number decimals',
    ({
      decimalSeparator,
      decimals,
      currentAmount,
      inputKey,
      result,
    }: {
      decimalSeparator: string;
      decimals: number;
      currentAmount: string;
      inputKey: Keys;
      result: string;
    }) => {
      const handler = createKeypadRule({ decimalSeparator, decimals });
      expect(handler(currentAmount, inputKey)).toBe(result);
    },
  );
  it.each`
    decimalSeparator | decimals     | currentAmount | inputKey        | result
    ${','}           | ${undefined} | ${'0'}        | ${Keys.Digit0}  | ${'0'}
    ${','}           | ${undefined} | ${'0'}        | ${Keys.Digit1}  | ${'1'}
    ${','}           | ${undefined} | ${'0'}        | ${Keys.Digit2}  | ${'2'}
    ${','}           | ${undefined} | ${'0'}        | ${Keys.Digit3}  | ${'3'}
    ${','}           | ${undefined} | ${'0'}        | ${Keys.Digit4}  | ${'4'}
    ${','}           | ${undefined} | ${'0'}        | ${Keys.Digit5}  | ${'5'}
    ${','}           | ${undefined} | ${'0'}        | ${Keys.Digit6}  | ${'6'}
    ${','}           | ${undefined} | ${'0'}        | ${Keys.Digit7}  | ${'7'}
    ${','}           | ${undefined} | ${'0'}        | ${Keys.Digit8}  | ${'8'}
    ${','}           | ${undefined} | ${'0'}        | ${Keys.Digit9}  | ${'9'}
    ${','}           | ${undefined} | ${'0'}        | ${Keys.Back}    | ${'0'}
    ${','}           | ${undefined} | ${'0'}        | ${Keys.Initial} | ${'0'}
    ${','}           | ${undefined} | ${'0'}        | ${Keys.Period}  | ${'0,'}
    ${','}           | ${undefined} | ${'1'}        | ${Keys.Digit0}  | ${'10'}
    ${','}           | ${undefined} | ${'1'}        | ${Keys.Digit1}  | ${'11'}
    ${','}           | ${undefined} | ${'1'}        | ${Keys.Digit2}  | ${'12'}
    ${','}           | ${undefined} | ${'1'}        | ${Keys.Digit3}  | ${'13'}
    ${','}           | ${undefined} | ${'1'}        | ${Keys.Digit4}  | ${'14'}
    ${','}           | ${undefined} | ${'1'}        | ${Keys.Digit5}  | ${'15'}
    ${','}           | ${undefined} | ${'1'}        | ${Keys.Digit6}  | ${'16'}
    ${','}           | ${undefined} | ${'1'}        | ${Keys.Digit7}  | ${'17'}
    ${','}           | ${undefined} | ${'1'}        | ${Keys.Digit8}  | ${'18'}
    ${','}           | ${undefined} | ${'1'}        | ${Keys.Digit9}  | ${'19'}
    ${','}           | ${undefined} | ${'1'}        | ${Keys.Back}    | ${'0'}
    ${','}           | ${undefined} | ${'1'}        | ${Keys.Initial} | ${'0'}
    ${','}           | ${undefined} | ${'1'}        | ${Keys.Period}  | ${'1,'}
    ${','}           | ${undefined} | ${'1,'}       | ${Keys.Digit0}  | ${'1,0'}
    ${','}           | ${undefined} | ${'1,'}       | ${Keys.Digit1}  | ${'1,1'}
    ${','}           | ${undefined} | ${'1,'}       | ${Keys.Digit2}  | ${'1,2'}
    ${','}           | ${undefined} | ${'1,'}       | ${Keys.Digit3}  | ${'1,3'}
    ${','}           | ${undefined} | ${'1,'}       | ${Keys.Digit4}  | ${'1,4'}
    ${','}           | ${undefined} | ${'1,'}       | ${Keys.Digit5}  | ${'1,5'}
    ${','}           | ${undefined} | ${'1,'}       | ${Keys.Digit6}  | ${'1,6'}
    ${','}           | ${undefined} | ${'1,'}       | ${Keys.Digit7}  | ${'1,7'}
    ${','}           | ${undefined} | ${'1,'}       | ${Keys.Digit8}  | ${'1,8'}
    ${','}           | ${undefined} | ${'1,'}       | ${Keys.Digit9}  | ${'1,9'}
    ${','}           | ${undefined} | ${'1,'}       | ${Keys.Back}    | ${'1'}
    ${','}           | ${undefined} | ${'1,'}       | ${Keys.Initial} | ${'0'}
    ${','}           | ${undefined} | ${'1,'}       | ${Keys.Period}  | ${'1,'}
    ${','}           | ${undefined} | ${'1,1'}      | ${Keys.Digit0}  | ${'1,10'}
    ${','}           | ${undefined} | ${'1,1'}      | ${Keys.Digit1}  | ${'1,11'}
    ${','}           | ${undefined} | ${'1,1'}      | ${Keys.Digit2}  | ${'1,12'}
    ${','}           | ${undefined} | ${'1,1'}      | ${Keys.Digit3}  | ${'1,13'}
    ${','}           | ${undefined} | ${'1,1'}      | ${Keys.Digit4}  | ${'1,14'}
    ${','}           | ${undefined} | ${'1,1'}      | ${Keys.Digit5}  | ${'1,15'}
    ${','}           | ${undefined} | ${'1,1'}      | ${Keys.Digit6}  | ${'1,16'}
    ${','}           | ${undefined} | ${'1,1'}      | ${Keys.Digit7}  | ${'1,17'}
    ${','}           | ${undefined} | ${'1,1'}      | ${Keys.Digit8}  | ${'1,18'}
    ${','}           | ${undefined} | ${'1,1'}      | ${Keys.Digit9}  | ${'1,19'}
    ${','}           | ${undefined} | ${'1,1'}      | ${Keys.Back}    | ${'1,'}
    ${','}           | ${undefined} | ${'1,1'}      | ${Keys.Initial} | ${'0'}
    ${','}           | ${undefined} | ${'1,1'}      | ${Keys.Period}  | ${'1,1'}
  `(
    'should return correct amount with decimalSeparator , and default decimals',
    ({
      decimalSeparator,
      decimals,
      currentAmount,
      inputKey,
      result,
    }: {
      decimalSeparator: string;
      decimals: number | undefined;
      currentAmount: string;
      inputKey: Keys;
      result: string;
    }) => {
      const handler = createKeypadRule({ decimalSeparator, decimals });
      expect(handler(currentAmount, inputKey)).toBe(result);
    },
  );

  it.each`
    decimalSeparator | decimals | currentAmount | inputKey        | result
    ${','}           | ${3}     | ${'1,'}       | ${Keys.Digit0}  | ${'1,0'}
    ${','}           | ${3}     | ${'1,'}       | ${Keys.Digit1}  | ${'1,1'}
    ${','}           | ${3}     | ${'1,'}       | ${Keys.Digit2}  | ${'1,2'}
    ${','}           | ${3}     | ${'1,'}       | ${Keys.Digit3}  | ${'1,3'}
    ${','}           | ${3}     | ${'1,'}       | ${Keys.Digit4}  | ${'1,4'}
    ${','}           | ${3}     | ${'1,'}       | ${Keys.Digit5}  | ${'1,5'}
    ${','}           | ${3}     | ${'1,'}       | ${Keys.Digit6}  | ${'1,6'}
    ${','}           | ${3}     | ${'1,'}       | ${Keys.Digit7}  | ${'1,7'}
    ${','}           | ${3}     | ${'1,'}       | ${Keys.Digit8}  | ${'1,8'}
    ${','}           | ${3}     | ${'1,'}       | ${Keys.Digit9}  | ${'1,9'}
    ${','}           | ${3}     | ${'1,'}       | ${Keys.Back}    | ${'1'}
    ${','}           | ${3}     | ${'1,'}       | ${Keys.Initial} | ${'0'}
    ${','}           | ${3}     | ${'1,'}       | ${Keys.Period}  | ${'1,'}
    ${','}           | ${3}     | ${'1,1'}      | ${Keys.Digit0}  | ${'1,10'}
    ${','}           | ${3}     | ${'1,1'}      | ${Keys.Digit1}  | ${'1,11'}
    ${','}           | ${3}     | ${'1,1'}      | ${Keys.Digit2}  | ${'1,12'}
    ${','}           | ${3}     | ${'1,1'}      | ${Keys.Digit3}  | ${'1,13'}
    ${','}           | ${3}     | ${'1,1'}      | ${Keys.Digit4}  | ${'1,14'}
    ${','}           | ${3}     | ${'1,1'}      | ${Keys.Digit5}  | ${'1,15'}
    ${','}           | ${3}     | ${'1,1'}      | ${Keys.Digit6}  | ${'1,16'}
    ${','}           | ${3}     | ${'1,1'}      | ${Keys.Digit7}  | ${'1,17'}
    ${','}           | ${3}     | ${'1,1'}      | ${Keys.Digit8}  | ${'1,18'}
    ${','}           | ${3}     | ${'1,1'}      | ${Keys.Digit9}  | ${'1,19'}
    ${','}           | ${3}     | ${'1,1'}      | ${Keys.Back}    | ${'1,'}
    ${','}           | ${3}     | ${'1,1'}      | ${Keys.Initial} | ${'0'}
    ${','}           | ${3}     | ${'1,1'}      | ${Keys.Period}  | ${'1,1'}
    ${','}           | ${3}     | ${'1,11'}     | ${Keys.Digit0}  | ${'1,110'}
    ${','}           | ${3}     | ${'1,11'}     | ${Keys.Digit1}  | ${'1,111'}
    ${','}           | ${3}     | ${'1,11'}     | ${Keys.Digit2}  | ${'1,112'}
    ${','}           | ${3}     | ${'1,11'}     | ${Keys.Digit3}  | ${'1,113'}
    ${','}           | ${3}     | ${'1,11'}     | ${Keys.Digit4}  | ${'1,114'}
    ${','}           | ${3}     | ${'1,11'}     | ${Keys.Digit5}  | ${'1,115'}
    ${','}           | ${3}     | ${'1,11'}     | ${Keys.Digit6}  | ${'1,116'}
    ${','}           | ${3}     | ${'1,11'}     | ${Keys.Digit7}  | ${'1,117'}
    ${','}           | ${3}     | ${'1,11'}     | ${Keys.Digit8}  | ${'1,118'}
    ${','}           | ${3}     | ${'1,11'}     | ${Keys.Digit9}  | ${'1,119'}
    ${','}           | ${3}     | ${'1,11'}     | ${Keys.Back}    | ${'1,1'}
    ${','}           | ${3}     | ${'1,11'}     | ${Keys.Initial} | ${'0'}
    ${','}           | ${3}     | ${'1,11'}     | ${Keys.Period}  | ${'1,11'}
    ${','}           | ${3}     | ${'1,111'}    | ${Keys.Digit0}  | ${'1,111'}
    ${','}           | ${3}     | ${'1,111'}    | ${Keys.Digit1}  | ${'1,111'}
    ${','}           | ${3}     | ${'1,111'}    | ${Keys.Digit2}  | ${'1,111'}
    ${','}           | ${3}     | ${'1,111'}    | ${Keys.Digit3}  | ${'1,111'}
    ${','}           | ${3}     | ${'1,111'}    | ${Keys.Digit4}  | ${'1,111'}
    ${','}           | ${3}     | ${'1,111'}    | ${Keys.Digit5}  | ${'1,111'}
    ${','}           | ${3}     | ${'1,111'}    | ${Keys.Digit6}  | ${'1,111'}
    ${','}           | ${3}     | ${'1,111'}    | ${Keys.Digit7}  | ${'1,111'}
    ${','}           | ${3}     | ${'1,111'}    | ${Keys.Digit8}  | ${'1,111'}
    ${','}           | ${3}     | ${'1,111'}    | ${Keys.Digit9}  | ${'1,111'}
    ${','}           | ${3}     | ${'1,111'}    | ${Keys.Back}    | ${'1,11'}
    ${','}           | ${3}     | ${'1,111'}    | ${Keys.Initial} | ${'0'}
    ${','}           | ${3}     | ${'1,111'}    | ${Keys.Period}  | ${'1,111'}
  `(
    'should return correct amount with decimalSeparator , and a number decimals',
    ({
      decimalSeparator,
      decimals,
      currentAmount,
      inputKey,
      result,
    }: {
      decimalSeparator: string;
      decimals: number;
      currentAmount: string;
      inputKey: Keys;
      result: string;
    }) => {
      const handler = createKeypadRule({ decimalSeparator, decimals });
      expect(handler(currentAmount, inputKey)).toBe(result);
    },
  );

  it.each`
    decimalSeparator | decimals | currentAmount | inputKey        | result
    ${','}           | ${0}     | ${'1'}        | ${Keys.Digit1}  | ${'11'}
    ${','}           | ${0}     | ${'1'}        | ${Keys.Period}  | ${'1'}
    ${','}           | ${0}     | ${'1'}        | ${Keys.Back}    | ${'0'}
    ${','}           | ${0}     | ${'1'}        | ${Keys.Initial} | ${'0'}
  `(
    'should return correct amount with decimalSeparator , and 0 decimals',
    ({
      decimalSeparator,
      decimals,
      currentAmount,
      inputKey,
      result,
    }: {
      decimalSeparator: string;
      decimals: number;
      currentAmount: string;
      inputKey: Keys;
      result: string;
    }) => {
      const handler = createKeypadRule({ decimalSeparator, decimals });
      expect(handler(currentAmount, inputKey)).toBe(result);
    },
  );

  it.each`
    decimalSeparator | decimals | currentAmount | inputKey        | result
    ${undefined}     | ${3}     | ${'1'}        | ${Keys.Digit1}  | ${'11'}
    ${undefined}     | ${3}     | ${'1'}        | ${Keys.Period}  | ${'1'}
    ${undefined}     | ${3}     | ${'1'}        | ${Keys.Back}    | ${'0'}
    ${undefined}     | ${3}     | ${'1'}        | ${Keys.Initial} | ${'0'}
    ${null}          | ${3}     | ${'1'}        | ${Keys.Digit1}  | ${'11'}
    ${null}          | ${3}     | ${'1'}        | ${Keys.Period}  | ${'1'}
    ${null}          | ${3}     | ${'1'}        | ${Keys.Back}    | ${'0'}
    ${null}          | ${3}     | ${'1'}        | ${Keys.Initial} | ${'0'}
  `(
    'should return correct amount with falsy decimalSeparator and number decimals',
    ({
      decimalSeparator,
      decimals,
      currentAmount,
      inputKey,
      result,
    }: {
      decimalSeparator: string | null | undefined;
      decimals: number;
      currentAmount: string;
      inputKey: Keys;
      result: string;
    }) => {
      const handler = createKeypadRule({ decimalSeparator, decimals });
      expect(handler(currentAmount, inputKey)).toBe(result);
    },
  );
});
