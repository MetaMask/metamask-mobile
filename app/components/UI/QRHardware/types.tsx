export interface IQRState {
  sync: {
    reading: boolean;
  };
  sign: {
    request?: {
      requestId: string;
      payload: {
        cbor: string;
        type: string;
      };
    };
  };
}
