import { toChecksumAddress } from 'ethereumjs-util';

const checkIfAddressIsSaved = (
  addressBook: [],
  network: string,
  transaction: any,
) => {
  if (transaction.to === undefined) {
    return [];
  }
  for (const [key, value] of Object.entries(addressBook)) {
    const addressValues = Object.values(value).map((val: any) => ({
      address: toChecksumAddress(val.address),
      nickname: val.name,
    }));

    if (
      addressValues.some(
        (x) =>
          x.address === toChecksumAddress(transaction.to) && key === network,
      )
    ) {
      return addressValues.filter(
        (x) => x.address === toChecksumAddress(transaction.to),
      );
    }
    return [];
  }
};

export default checkIfAddressIsSaved;
