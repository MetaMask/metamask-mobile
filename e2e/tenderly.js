import axios from 'axios';

const AccessKey =  '5vZ1epGVCpSA4oab8xV3G05Ywyb81lZF'
const baseURL = 'https://api.tenderly.co/api/v1/account/davibroc/project/consensys'

export default class Tenderly {
  constructor(id) {
      this.chainId = id
  }

  getVirtualTestNetID() {
    return this.network_id
  }

  getRpcURL() {
    return this.rpcURL
  }

  async createVirtualTestNet() {

    const uniquePart = new Date().getTime();

    const data = {
      slug: `test-${uniquePart}`,
      display_name: `test-${uniquePart}`,
      fork_config: {
        network_id: this.chainId,
        block_number: 'latest'
      },
      virtual_network_config: {
        chain_config: {
          chain_id: this.chainId
        }
      },
      sync_state_config: {
        enabled: false
      },
      explorer_page_config: {
        enabled: false,
        verification_visibility: 'bytecode'
      }
    }
    console.log('Creating a Tenderly VirtualTestNet')

    const response = await axios.post(`${baseURL}/vnets`, data, {
      headers: {
        'Content-Type': 'application/json',
        'Accept' : 'application/json',
        'X-Access-Key':  AccessKey,
      }
    });

    if (response.data.error)
    {
      console.log('ERROR: Failed to create a VirtualTestNet')
      console.log(response.data.error)
      return null;
    }
    this.network_id = response.data.id;
    this.rpcURL = response.data.rpcs[0].url;

}

  async addFunds(account, amount) {

    const data = {
      jsonrpc: "2.0",
      method: "tenderly_setBalance",
      params: [
        [account],
        amount
        ],
      id: "1234"
    }
    console.log('Adding funds to account')

    const response = await axios.post(this.rpcURL, data, {
      headers: {
        'Content-Type': 'application/json',
      }
    }
  );

  if (response.data.error)
  {
    console.log('ERROR: Failed add funds to VirtualTestNet')
    console.log(response.data.error)
    return null;
  }

}

  async deleteVirtualTestNet() {
    console.log("Delete", this.network_id)
    const url = `${baseURL}/testnet/container/${this.network_id}`
    console.log(url)
    await axios.delete(url, {
      headers: {
        'Accept' : 'application/json, text/plain, */*',
        'X-Access-Key': AccessKey,
        }
      });
    }
}
