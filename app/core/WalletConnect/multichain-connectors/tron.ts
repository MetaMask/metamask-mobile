interface SnapMappedRequest {
  method: string;
  params: unknown;
}

const extractTronRawDataHex = (value: unknown): string | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as {
    raw_data_hex?: unknown;
    rawDataHex?: unknown;
    transaction?: unknown;
    tx?: unknown;
  };

  if (typeof candidate.raw_data_hex === 'string') {
    return candidate.raw_data_hex;
  }
  if (typeof candidate.rawDataHex === 'string') {
    return candidate.rawDataHex;
  }
  return (
    extractTronRawDataHex(candidate.transaction) ??
    extractTronRawDataHex(candidate.tx)
  );
};

const extractTronType = (value: unknown): string | undefined => {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as {
    type?: unknown;
    transaction?: unknown;
    tx?: unknown;
    raw_data?: { contract?: { type?: unknown }[] };
  };

  if (typeof candidate.type === 'string' && candidate.type.length > 0) {
    return candidate.type;
  }
  const contractType = candidate.raw_data?.contract?.[0]?.type;
  if (typeof contractType === 'string' && contractType.length > 0) {
    return contractType;
  }
  return (
    extractTronType(candidate.transaction) ?? extractTronType(candidate.tx)
  );
};

export const adaptWalletConnectRequestForSnap = ({
  method,
  params,
}: {
  method: string;
  params: unknown;
}): SnapMappedRequest => {
  const firstParam = Array.isArray(params)
    ? params.length > 0
      ? params[0]
      : undefined
    : params && typeof params === 'object'
      ? params
      : undefined;

  if (method === 'tron_signMessage') {
    const mappedParams: Record<string, string> = {};
    const address =
      firstParam && typeof firstParam === 'object' && 'address' in firstParam
        ? firstParam.address
        : undefined;
    const message =
      firstParam && typeof firstParam === 'object' && 'message' in firstParam
        ? firstParam.message
        : undefined;
    if (typeof address === 'string') {
      mappedParams.address = address;
    }
    if (typeof message === 'string') {
      mappedParams.message = message;
    }

    return {
      method: 'signMessage',
      params: mappedParams,
    };
  }

  if (method === 'tron_signTransaction') {
    const transaction =
      firstParam &&
      typeof firstParam === 'object' &&
      'transaction' in firstParam
        ? (firstParam.transaction as
            | {
                raw_data_hex?: string;
                rawDataHex?: string;
                type?: string;
              }
            | undefined)
        : (firstParam as
            | {
                raw_data_hex?: string;
                rawDataHex?: string;
                type?: string;
              }
            | undefined);

    const rawDataHex = extractTronRawDataHex(firstParam ?? transaction);
    const type = extractTronType(firstParam ?? transaction);

    const mappedTransaction: Record<string, string> = {};
    if (typeof rawDataHex === 'string') {
      mappedTransaction.rawDataHex = rawDataHex;
    }
    if (typeof type === 'string') {
      mappedTransaction.type = type;
    }

    const mappedParams: {
      address?: string;
      transaction: Record<string, string>;
    } = {
      transaction: mappedTransaction,
    };
    const address =
      firstParam && typeof firstParam === 'object' && 'address' in firstParam
        ? firstParam.address
        : undefined;
    if (typeof address === 'string') {
      mappedParams.address = address;
    }

    return {
      method: 'signTransaction',
      params: mappedParams,
    };
  }

  if (method === 'tron_sendTransaction') {
    return {
      method: 'sendTransaction',
      params,
    };
  }

  if (method === 'tron_getBalance') {
    return {
      method: 'getBalance',
      params,
    };
  }

  return { method, params };
};
