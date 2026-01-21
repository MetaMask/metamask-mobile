import axios from 'axios';

export default class Tenderly {
  static async addFunds(rpcURL, account, amount = '0xDE0B6B3A764000000') {
    const data = {
      jsonrpc: '2.0',
      method: 'tenderly_setBalance',
      params: [[account], amount],
      id: '1234',
    };

    const response = await axios.post(rpcURL, data, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.data.error) {
      // eslint-disable-next-line no-console
      console.log(
        `ERROR: Failed to add funds to Tenderly VirtualTestNet\n${response.data.error}`,
      );
      return null;
    }
  }
}
