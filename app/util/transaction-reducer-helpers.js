function getDefinedProperties(object) {
  return Object.entries(object).reduce(
    (obj, [key, val]) => (val !== undefined ? { ...obj, [key]: val } : obj),
    {},
  );
}

/**
 * Get the standard set of properties of a transaction from a larger set of tx data
 *
 * @param {object} txMeta - An object containing data about a transaction
 * @returns {object} - An object containing the standard properties of a transaction
 */
export function getTxData(txMeta = {}) {
  const {
    data,
    from,
    gas,
    gasPrice,
    to,
    value,
    maxFeePerGas,
    maxPriorityFeePerGas,
  } = txMeta; // eslint-disable-line no-unused-vars
  const txData = {
    data,
    from,
    gas,
    gasPrice,
    to,
    value,
    maxFeePerGas,
    maxPriorityFeePerGas,
  };
  return getDefinedProperties(txData);
}

/**
 * Get meta data of a transaction, without the standard properties, from a set of tx data
 *
 * @param {object} txMeta - An object containing data about a transaction
 * @returns {object} - An object containing the standard properties of a transaction
 */
export function getTxMeta(txMeta = {}) {
  const {
    data,
    from,
    gas,
    gasPrice,
    to,
    value,
    maxFeePerGas,
    maxPriorityFeePerGas,
    ...rest
  } = txMeta; // eslint-disable-line no-unused-vars
  return getDefinedProperties(rest);
}
