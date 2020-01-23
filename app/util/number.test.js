import { BN } from 'ethereumjs-util';
import {
	BNToHex,
	fromWei,
	fromTokenMinimalUnit,
	toTokenMinimalUnit,
	renderFromTokenMinimalUnit,
	renderFromWei,
	calcTokenValueToSend,
	hexToBN,
	isBN,
	isDecimal,
	toWei,
	weiToFiat,
	weiToFiatNumber,
	fiatNumberToWei,
	fiatNumberToTokenMinimalUnit,
	balanceToFiat,
	balanceToFiatNumber,
	renderFiat
} from './number';
import numberToBN from 'number-to-bn';

describe('Number utils :: BNToHex', () => {
	it('BNToHex', () => {
		expect(BNToHex(new BN('1337'))).toEqual('0x539');
	});
});

describe('Number utils :: fromWei', () => {
	it('fromWei using number', () => {
		expect(fromWei(1337)).toEqual('0.000000000000001337');
	});

	it('fromWei using string', () => {
		expect(fromWei('1337')).toEqual('0.000000000000001337');
	});

	it('fromWei using BN number', () => {
		expect(fromWei(new BN('1337'))).toEqual('0.000000000000001337');
	});
});

describe('Number utils :: fromTokenMinimalUnit', () => {
	it('fromTokenMinimalUnit using number', () => {
		expect(fromTokenMinimalUnit(1337, 6)).toEqual('0.001337');
		expect(fromTokenMinimalUnit(1337, 0)).toEqual('1337');
		expect(fromTokenMinimalUnit(1337, 18)).toEqual('0.000000000000001337');
	});

	it('fromTokenMinimalUnit using string', () => {
		expect(fromTokenMinimalUnit('1337', 6)).toEqual('0.001337');
		expect(fromTokenMinimalUnit('1337', 0)).toEqual('1337');
		expect(fromTokenMinimalUnit('1337', 18)).toEqual('0.000000000000001337');
	});

	it('fromTokenMinimalUnit using BN number', () => {
		expect(fromTokenMinimalUnit(new BN('1337'), 6)).toEqual('0.001337');
		expect(fromTokenMinimalUnit(new BN('1337'), 0)).toEqual('1337');
		expect(fromTokenMinimalUnit(new BN('1337'), 18)).toEqual('0.000000000000001337');
	});
});

describe('Number utils :: toTokenMinimalUnit', () => {
	it('toTokenMinimalUnit using number', () => {
		expect(toTokenMinimalUnit(1337, 6)).toEqual(new BN('1337000000', 10));
		expect(toTokenMinimalUnit(1337, 0)).toEqual(new BN('1337'));
		expect(toTokenMinimalUnit(1337.1, 1)).toEqual(new BN('13371'));
	});

	it('toTokenMinimalUnit using string', () => {
		expect(toTokenMinimalUnit('1337', 6)).toEqual(new BN('1337000000'));
		expect(toTokenMinimalUnit('1337', 0)).toEqual(new BN('1337'));
		expect(toTokenMinimalUnit('1337.1', 2)).toEqual(new BN('133710'));
	});

	it('toTokenMinimalUnit using BN number', () => {
		expect(toTokenMinimalUnit(new BN('1337'), 0)).toEqual(new BN('1337'));
		expect(toTokenMinimalUnit(new BN('1337'), 6)).toEqual(new BN('1337000000'));
	});

	it('toTokenMinimalUnit using invalid inputs', () => {
		expect(() => toTokenMinimalUnit('0.0.0', 0)).toThrow();
		expect(() => toTokenMinimalUnit('.', 0)).toThrow();
		expect(() => toTokenMinimalUnit('0.0001', 0)).toThrow();
	});
});

describe('Number utils :: renderFromTokenMinimalUnit', () => {
	it('renderFromTokenMinimalUnit using number', () => {
		expect(renderFromTokenMinimalUnit(1337, 6)).toEqual('0.00134');
		expect(renderFromTokenMinimalUnit(1337, 0)).toEqual('1337');
		expect(renderFromTokenMinimalUnit(1337, 10)).toEqual('< 0.00001');
		expect(renderFromTokenMinimalUnit(0, 10)).toEqual('0');
	});

	it('renderFromTokenMinimalUnit using string', () => {
		expect(renderFromTokenMinimalUnit('1337', 6)).toEqual('0.00134');
		expect(renderFromTokenMinimalUnit('1337', 0)).toEqual('1337');
		expect(renderFromTokenMinimalUnit('1337', 10)).toEqual('< 0.00001');
		expect(renderFromTokenMinimalUnit('0', 10)).toEqual('0');
	});

	it('renderFromTokenMinimalUnit using BN number', () => {
		expect(renderFromTokenMinimalUnit(new BN('1337'), 0)).toEqual('1337');
		expect(renderFromTokenMinimalUnit(new BN('1337'), 6)).toEqual('0.00134');
		expect(renderFromTokenMinimalUnit(new BN('1337'), 10)).toEqual('< 0.00001');
		expect(renderFromTokenMinimalUnit(new BN('0'), 10)).toEqual('0');
	});
});

describe('Number utils :: renderFromWei', () => {
	it('renderFromWei using number', () => {
		expect(renderFromWei(133700000000000000)).toEqual('0.1337');
		expect(renderFromWei(1337)).toEqual('< 0.00001');
		expect(renderFromWei(0)).toEqual('0');
	});

	it('renderFromWei using string', () => {
		expect(renderFromWei('133700000000000000')).toEqual('0.1337');
		expect(renderFromWei('1337')).toEqual('< 0.00001');
		expect(renderFromWei('0')).toEqual('0');
	});

	it('renderFromWei using BN number', () => {
		expect(renderFromWei(new BN('133700000000000000'))).toEqual('0.1337');
		expect(renderFromWei(new BN('1337'))).toEqual('< 0.00001');
		expect(renderFromWei(new BN('0'))).toEqual('0');
	});
});

describe('Number utils :: calcTokenValueToSend', () => {
	it('calcTokenValueToSend', () => {
		expect(calcTokenValueToSend(new BN(1337), 0)).toEqual('539');
		expect(calcTokenValueToSend(new BN(1337), 9)).toEqual('1374b68fa00');
		expect(calcTokenValueToSend(new BN(1337), 18)).toEqual('487a9a304539440000');
	});
});

describe('Number utils :: hexToBN', () => {
	it('hexToBN', () => {
		expect(hexToBN('0x539').toNumber()).toBe(1337);
	});
});

describe('Number utils :: isBN', () => {
	it('isBN', () => {
		expect(isBN('0x539')).toEqual(false);
		expect(isBN(new BN(1337))).toEqual(true);
	});
});

describe('Number utils :: isDecimal', () => {
	it('isDecimal', () => {
		expect(isDecimal('0.1')).toEqual(true);
		expect(isDecimal('0.0')).toEqual(true);
		expect(isDecimal('0.0000010001')).toEqual(true);
		expect(isDecimal('.0000010001')).toEqual(true);
		expect(isDecimal('1.0001')).toEqual(true);
		expect(isDecimal('1')).toEqual(true);
		expect(isDecimal('1-')).toEqual(false);
		expect(isDecimal('.1.')).toEqual(false);
		expect(isDecimal('..1')).toEqual(false);
	});
});

describe('Number utils :: weiToFiat', () => {
	it('weiToFiat', () => {
		const wei = toWei('1');
		expect(weiToFiat(wei, 1, 'usd')).toEqual('$1');
		expect(weiToFiat(wei, 0.5, 'usd')).toEqual('$0.5');
		expect(weiToFiat(wei, 0.1, 'usd')).toEqual('$0.1');
	});
});

describe('Number utils :: weiToFiatNumber', () => {
	it('weiToFiatNumber', () => {
		const wei = toWei('1');
		expect(weiToFiatNumber(wei, 0.1234512345)).toEqual(0.12345);
		expect(weiToFiatNumber(wei, 0.5)).toEqual(0.5);
		expect(weiToFiatNumber(wei, 0.111112)).toEqual(0.11111);
	});

	it('weiToFiatNumber decimals', () => {
		const wei = toWei('1');
		expect(weiToFiatNumber(wei, 0.1234512345, 1)).toEqual(0.1);
		expect(weiToFiatNumber(wei, 0.5, 2)).toEqual(0.5);
		expect(weiToFiatNumber(wei, 0.111112, 3)).toEqual(0.111);
	});
});

describe('Number utils :: fiatNumberToWei', () => {
	it('fiatNumberToWei', () => {
		const one = numberToBN(Math.pow(10, 18));
		const ten = numberToBN(Math.pow(10, 19));
		const decimal = numberToBN(Math.pow(10, 17));
		const aThird = numberToBN('4a03ce68d215534');
		expect(fiatNumberToWei('0.1234512345', 0.1234512345)).toEqual(one);
		expect(fiatNumberToWei('0.5', 0.5)).toEqual(one);
		expect(fiatNumberToWei('100', 10)).toEqual(ten);
		expect(fiatNumberToWei('1', 10)).toEqual(decimal);
		expect(fiatNumberToWei('1', 3)).toEqual(aThird);
	});
});

describe('Number utils :: fiatNumberToTokenMinimalUnit', () => {
	it('fiatNumberToTokenMinimalUnit', () => {
		const decimals = [18, 3, 12, 16, 4, 10];
		const conversionRates = [10, 8, 21, 18, 3, 8.11];
		const exchangeRates = [10, 1, 3, 3, 7, 2.17];
		const fiatValues = ['100', '123', '300', '1111.111', '9.999', '100'];
		let i = 0;

		expect(fiatNumberToTokenMinimalUnit(fiatValues[i], conversionRates[i], exchangeRates[i], decimals[i])).toEqual(
			numberToBN('1000000000000000000')
		);
		i = 1;
		expect(fiatNumberToTokenMinimalUnit(fiatValues[i], conversionRates[i], exchangeRates[i], decimals[i])).toEqual(
			numberToBN('15375')
		);
		i = 2;
		expect(fiatNumberToTokenMinimalUnit(fiatValues[i], conversionRates[i], exchangeRates[i], decimals[i])).toEqual(
			numberToBN('4761904761904')
		);
		i = 3;
		expect(fiatNumberToTokenMinimalUnit(fiatValues[i], conversionRates[i], exchangeRates[i], decimals[i])).toEqual(
			numberToBN('205761296296296300')
		);
		i = 4;
		expect(fiatNumberToTokenMinimalUnit(fiatValues[i], conversionRates[i], exchangeRates[i], decimals[i])).toEqual(
			numberToBN('4761')
		);
		i = 5;
		expect(fiatNumberToTokenMinimalUnit(fiatValues[i], conversionRates[i], exchangeRates[i], decimals[i])).toEqual(
			numberToBN('56822378925')
		);
	});
});

describe('Number utils :: balanceToFiat', () => {
	it('balanceToFiat', () => {
		expect(balanceToFiat(0.1, 0.1, 0.1, 'usd')).toEqual('$0.001');
		expect(balanceToFiat(0.0001, 0.1, 0.1, 'usd')).toEqual('$0');
	});
});

describe('Number utils :: balanceToFiatNumber', () => {
	it('balanceToFiatNumber', () => {
		expect(balanceToFiatNumber(0.1, 0.1, 0.1)).toEqual(0.001);
		expect(balanceToFiatNumber(0.0001, 0.1, 0.1)).toEqual(0);
	});
});

describe('Number utils :: renderFiat', () => {
	it('renderFiat', () => {
		expect(renderFiat(0.1, 'usd')).toEqual('$0.1');
		expect(renderFiat(0.0010000001, 'usd')).toEqual('$0.001');
	});
});
