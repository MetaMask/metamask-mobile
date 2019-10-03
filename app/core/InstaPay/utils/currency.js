import { ethers as eth } from 'ethers'

import { toBN } from './bn'

const { commify, formatUnits, parseUnits } = eth.utils

export class Currency {

  ////////////////////////////////////////
  // Static Properties/Methods

  static DAI = (amount, daiRate) => new Currency('DAI', amount, daiRate)
  static DEI = (amount, daiRate) => new Currency('DEI', amount, daiRate)
  static ETH = (amount, daiRate) => new Currency('ETH', amount, daiRate)
  static FIN = (amount, daiRate) => new Currency('FIN', amount, daiRate)
  static WEI = (amount, daiRate) => new Currency('WEI', amount, daiRate)

  typeToSymbol = {
    'DAI': '$',
    'DEI': 'DEI ',
    'ETH': eth.constants.EtherSymbol,
    'FIN': 'FIN ',
    'WEI': 'WEI ',
  }

  defaultOptions = {
    'DAI': { commas: false, decimals: 2, symbol: true },
    'DEI': { commas: false, decimals: 0, symbol: false },
    'ETH': { commas: false, decimals: 3, symbol: true },
    'FIN': { commas: false, decimals: 3, symbol: false },
    'WEI': { commas: false, decimals: 0, symbol: false },
  }

  ////////////////////////////////////////
  // Private Properties

  // wad is in units like MakerDAO's wad aka an integer w 18 extra units of precision
  // ray is in units like MakerDAO's ray aka an integer w 36 extra units of precision
  // So: this.wad is to the currency amount as wei is to an ether amount
  // These let us handle divisions & decimals cleanly w/out needing a BigDecimal library
  wad
  ray
  type

  ////////////////////////////////////////
  // Constructor

  constructor (type, amount, daiRate) {
    this.type = type
    this.daiRate = typeof daiRate !== 'undefined' ? daiRate : '1'
    this.daiRateGiven = !!daiRate
    try {
      this.wad = this.toWad(amount)
      this.ray = this.toRay(amount)
    } catch (e) {
      throw new Error(`Invalid currency amount: ${amount}`)
    }
  }

  ////////////////////////////////////////
  // Getters

  // Returns a decimal string
  get amount() {
    return this.fromWad(this.wad)
  }

  get currency() {
    return {
      amount: this.amount,
      type: this.type,
    }
  }

  get symbol() {
    return this.typeToSymbol[this.type]
  }

  ////////////////////////////////////////
  // Public Methods

  isEthType(type) {
    return ['ETH', 'FIN', 'WEI'].includes(type || this.type)
  }

  isTokenType(type) {
    return ['DAI', 'DEI'].includes(type || this.type)
  }

  toBN() {
    return toBN(this._round(this.amount))
  }

  format(_options) {
    const options = {
      ...this.defaultOptions[this.type],
      ..._options || {},
    }
    const symbol = options.symbol ? `${this.symbol}` : ``
    const amount = options.commas
      ? commify(this.round(options.decimals))
      : this.round(options.decimals)
    return `${symbol}${amount}`
  }

  round(decimals) {
    const amt = this.amount
    const nDecimals = amt.length - amt.indexOf('.') - 1
    // rounding to more decimals than are available: pad with zeros
    if (typeof decimals === 'number' && decimals > nDecimals) {
      return amt + '0'.repeat(decimals - nDecimals)
    }
    // rounding to fewer decimals than are available: round
    // Note: rounding n=1099.9 to nearest int is same as floor(n + 0.5)
    // roundUp plays same role as 0.5 in above example
    if (typeof decimals === 'number' && decimals < nDecimals) {
      const roundUp = toBN(`5${'0'.repeat(18 - decimals - 1)}`)
      const rounded = this.fromWad(this.wad.add(roundUp))
      return rounded.slice(0, amt.length - (nDecimals - decimals)).replace(/\.$/, '')
    }
    // rounding to same decimals as are available: return amount w no changes
    return this.amount
  }

  toString() {
    return this.amount.slice(0, this.amount.indexOf('.'))
  }

  // In units of ray aka append an extra 36 units of precision
  // eg ETH:WEI rate is 1e18 ray aka 1e54
  getRate = (currency) => {
    const exchangeRates = {
      DAI: this.toRay(this.daiRate),
      DEI: this.toRay(parseUnits(this.daiRate, 18).toString()),
      ETH: this.toRay('1'),
      FIN: this.toRay(parseUnits('1', 3).toString()),
      WEI: this.toRay(parseUnits('1', 18).toString()),
    }
    if (
      (this.isEthType() && this.isEthType(currency)) ||
      (this.isTokenType() && this.isTokenType(currency))
    ) {
      return exchangeRates[currency]
    }
    if (!this.daiRateGiven) {
      console.warn(`Provide DAI:ETH rate for accurate conversions between currency types`)
      console.warn(`Using default eth price of $${this.daiRate}`)
    }
    return exchangeRates[currency]
  }

  toDAI = (daiRate) => this._convert('DAI', daiRate)
  toDEI = (daiRate) => this._convert('DEI', daiRate)
  toETH = (daiRate) => this._convert('ETH', daiRate)
  toFIN = (daiRate) => this._convert('FIN', daiRate)
  toWEI = (daiRate) => this._convert('WEI', daiRate)

  ////////////////////////////////////////
  // Private Methods

  _convert = (targetType, daiRate) => {
    if (daiRate) {
      this.daiRate = daiRate;
      this.daiRateGiven = true;
    }
    const thisToTargetRate = this.toRay(this.getRate(targetType)).div(this.getRate(this.type))
    const targetAmount = this.fromRay(this.fromRoundRay(this.ray.mul(thisToTargetRate)))
    // console.debug(`Converted: ${this.amount} ${this.type} => ${targetAmount} ${targetType}`)
    return new Currency(
      targetType,
      targetAmount.toString(),
      this.daiRateGiven ? this.daiRate : undefined,
    )
  }

  // convert to wad, add 0.5 wad, convert back to dec string, then truncate decimal
  _round = (decStr) =>
    this._floor(this.fromWad(this.toWad(decStr).add(this.toWad('0.5'))).toString())

  _floor = (decStr) =>
    decStr.substring(0, decStr.indexOf('.'))

  toWad = (n) =>
    parseUnits(n.toString(), 18)

  toRay = (n) =>
    this.toWad(this.toWad(n.toString()))

  fromWad = (n) =>
    formatUnits(n.toString(), 18)

  fromRoundRay = (n) =>
    this._round(this.fromRay(n))

  fromRay = (n) =>
    this.fromWad(this._round(this.fromWad(n.toString())))

}
