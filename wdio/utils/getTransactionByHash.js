import ethers from 'ethers';

const getTransaction = async (chainId, hash) => {
  const provider = ethers.providers.getDefaultProvider(
    Number(chainId),
    {
      infura: process.env.MM_INFURA_PROJECT_ID,
      alchemy: '-',
      pocket: '-',
      ankr: '-',
    },
  );

  const txn = await provider.getTransaction(hash);
  console.log('txn', txn);
  return txn;
}

export default getTransaction;
