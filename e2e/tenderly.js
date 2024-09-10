import axios from 'axios';

const AccessKey =  'YxaRXZMtdz6qQlEUJnA42Yg4OxRi77Wi'

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

  const url = 'https://api.tenderly.co/api/v1/account/davibroc/project/Consensys/vnets'

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
  console.log(JSON.stringify(data))
  console.log('Creating a Tenderly VirtualTestNet')

  const response = await axios.post(url, data, {
    headers: {
      'Content-Type': 'application/json',
      'Accept' : 'application/json',
      'X-Access-Key':  AccessKey,
      }
    }
  );

  console.log(response)

  if (response.data.error)
  {
    console.log('ERROR: Failed to create a VirtualTestNet')
    console.log(response.data.error)
    return null;
  }
  this.network_id = response.data.id;
  this.rpcURL = response.data.rpcs[1].url;

}

  async addFunds(amount) {

  }

  async deleteVirtualTestNet() {
    console.log("Delete", this.network_id)
    const url = `https://api.tenderly.co/api/v1/account/davibroc/project/project/testnet/container/${this.network_id}`
    console.log(url)
    const response = await axios.delete(url, {
      headers: {
        'Accept' : 'application/json, text/plain, */*',
        'X-Access-Key': AccessKey,
        }
      });
    }
}
