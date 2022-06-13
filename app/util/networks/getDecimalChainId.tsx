const getDecimalChainId = (id: string) => {
  if (!id || typeof id !== 'string' || !id.startsWith('0x')) {
    return id;
  }
  return parseInt(id, 16).toString(10);
};

export default getDecimalChainId;
