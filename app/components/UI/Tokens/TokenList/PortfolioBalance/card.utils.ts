import { Hex } from '@metamask/utils';
import { ethers } from 'ethers';

/**
 * Linea chain ID in hex format
 */
export const LINEA_CHAIN_ID = '0xe708' as Hex;

/**
 * FoxConnect contract addresses on Linea
 */
const FOXCONNECT_GLOBAL_ADDRESS = '0x9dd23A4a0845f10d65D293776B792af1131c7B30';
const FOXCONNECT_US_ADDRESS = '0xA90b298d05C2667dDC64e2A4e17111357c215dD2';

/**
 * Supported token addresses on Linea
 */
const USDC_ADDRESS = '0x176211869cA2b568f2A7D4EE941E073a821EE1ff';
const USDT_ADDRESS = '0xA219439258ca9da29E9Cc4cE5596924745e12B93';
const WETH_ADDRESS = '0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f';

/**
 * ABI fragments for interacting with FoxConnect contracts
 */
const foxConnectAbi = [
  'function getBeneficiary() view returns (address)',
  'function getWithdrawOperators() view returns (address[])'
];

/**
 * ERC20 Token ABI for allowance checking
 */
const erc20Abi = [
  'function allowance(address owner, address spender) view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)'
];

/**
 * ERC20 approval event topic
 */
const APPROVAL_EVENT_TOPIC = '0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925';

/**
 * Transfer event topic
 */
const TRANSFER_EVENT_TOPIC = ethers.utils.id('Transfer(address,address,uint256)');

// Cache for card holder status to avoid repeated blockchain queries
const cardHolderCache: Record<string, { status: boolean; timestamp: number }> = {};

// Cache expiration time (15 minutes)
const CACHE_EXPIRATION = 15 * 60 * 1000;

/**
 * Check if the address has delegated funds to the FoxConnect contracts using allowance
 * @param address - The address to check
 * @param provider - Ethers provider for Linea
 * @returns Promise<boolean>
 */
const hasDelegatedFunds = async (
  address: string,
  provider: ethers.providers.JsonRpcProvider
): Promise<boolean> => {
  if (!address || typeof address !== 'string') {
    return false;
  }

  try {
    console.log(`Checking delegated funds for address: ${address}`);
    
    // Instead of scanning block ranges, directly check token allowances
    // Create token contract instances
    const usdcContract = new ethers.Contract(USDC_ADDRESS, erc20Abi, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, erc20Abi, provider);
    const wethContract = new ethers.Contract(WETH_ADDRESS, erc20Abi, provider);
    
    // Check allowances for each token with each FoxConnect contract
    const allowanceChecks = [
      // USDC allowances
      usdcContract.allowance(address, FOXCONNECT_GLOBAL_ADDRESS),
      usdcContract.allowance(address, FOXCONNECT_US_ADDRESS),
      // USDT allowances
      usdtContract.allowance(address, FOXCONNECT_GLOBAL_ADDRESS),
      usdtContract.allowance(address, FOXCONNECT_US_ADDRESS),
      // WETH allowances
      wethContract.allowance(address, FOXCONNECT_GLOBAL_ADDRESS),
      wethContract.allowance(address, FOXCONNECT_US_ADDRESS)
    ];
    
    // Check all allowances in parallel
    const allowances = await Promise.all(allowanceChecks.map(promise => 
      promise.catch((error: Error) => {
        console.error('Error checking allowance:', error);
        return ethers.BigNumber.from(0);
      })
    ));
    
    // Check if any token has a non-zero allowance for either FoxConnect contract
    for (let i = 0; i < allowances.length; i++) {
      const allowance = allowances[i];
      if (!allowance.isZero()) {
        const tokenName = i < 2 ? 'USDC' : i < 4 ? 'USDT' : 'WETH';
        const contractType = i % 2 === 0 ? 'Global' : 'US';
        console.log(`Found non-zero allowance for ${tokenName} to ${contractType} contract: ${allowance.toString()}`);
        return true;
      }
    }
    
    console.log('No active token allowances found');
    return false;
  } catch (error) {
    console.error('Error checking for delegated funds:', error);
    return false;
  }
};

/**
 * Check if the address has performed transactions with the FoxConnect contracts
 * @param address - The address to check
 * @param provider - Ethers provider for Linea
 * @returns Promise<boolean>
 */
const hasTransactedWithFoxConnect = async (
  address: string,
  provider: ethers.providers.JsonRpcProvider
): Promise<boolean> => {
  if (!address || typeof address !== 'string') {
    return false;
  }

  try {
    console.log(`Checking if address ${address} has transacted with FoxConnect contracts`);
    
    // Get withdraw operators and beneficiary for both contracts
    const globalContract = new ethers.Contract(FOXCONNECT_GLOBAL_ADDRESS, foxConnectAbi, provider);
    const usContract = new ethers.Contract(FOXCONNECT_US_ADDRESS, foxConnectAbi, provider);
    
    // Get withdraw operators
    const globalWithdrawOperators = await globalContract.getWithdrawOperators().catch(() => []);
    const usWithdrawOperators = await usContract.getWithdrawOperators().catch(() => []);
    
    console.log(`Global withdraw operators: ${globalWithdrawOperators}`);
    console.log(`US withdraw operators: ${usWithdrawOperators}`);
    
    // Get beneficiaries
    const globalBeneficiary = await globalContract.getBeneficiary().catch(() => '');
    const usBeneficiary = await usContract.getBeneficiary().catch(() => '');
    
    console.log(`Global beneficiary: ${globalBeneficiary}`);
    console.log(`US beneficiary: ${usBeneficiary}`);
    
    // Check if the address is a withdraw operator or beneficiary
    if (
      globalWithdrawOperators.includes(address) ||
      usWithdrawOperators.includes(address) ||
      (globalBeneficiary && globalBeneficiary.toLowerCase() === address.toLowerCase()) ||
      (usBeneficiary && usBeneficiary.toLowerCase() === address.toLowerCase())
    ) {
      console.log(`Address ${address} is a withdraw operator or beneficiary`);
      return true;
    }
    
    // Check token balances directly
    const usdcContract = new ethers.Contract(USDC_ADDRESS, erc20Abi, provider);
    const usdtContract = new ethers.Contract(USDT_ADDRESS, erc20Abi, provider);
    const wethContract = new ethers.Contract(WETH_ADDRESS, erc20Abi, provider);
    
    // First check if the user has any tokens (a prerequisite for transferring them)
    const [usdcBalance, usdtBalance, wethBalance] = await Promise.all([
      usdcContract.balanceOf(address).catch(() => ethers.BigNumber.from(0)),
      usdtContract.balanceOf(address).catch(() => ethers.BigNumber.from(0)),
      wethContract.balanceOf(address).catch(() => ethers.BigNumber.from(0))
    ]);
    
    if (usdcBalance.isZero() && usdtBalance.isZero() && wethBalance.isZero()) {
      console.log('Address has no token balances, likely has not transacted with FoxConnect');
      // Only do the more expensive event search if the user has token balances
      return false;
    }
    
    // If the user has tokens, perform a more targeted search for transfers
    // Instead of scanning a huge block range, use a filter with the specific addresses
    // We already know both the sender/receiver and the token contracts
    
    // Query for transfers from address to FoxConnect contracts
    // Split into separate smaller queries for better performance
    let transferFound = false;
    
    for (const tokenAddress of [USDC_ADDRESS, USDT_ADDRESS, WETH_ADDRESS]) {
      // Skip tokens with zero balance
      const tokenBalance = 
        tokenAddress === USDC_ADDRESS ? usdcBalance :
        tokenAddress === USDT_ADDRESS ? usdtBalance : wethBalance;
      
      if (tokenBalance.isZero()) {
        console.log(`Skipping transfer check for ${tokenAddress} (zero balance)`);
        continue;
      }
      
      console.log(`Checking transfers for token ${tokenAddress}`);
      
      // Use a more targeted approach - check transfers to FoxConnect
      const fromUserToFoxconnectFilter = {
        address: tokenAddress,
        topics: [
          TRANSFER_EVENT_TOPIC,
          ethers.utils.hexZeroPad(ethers.utils.hexlify(address.toLowerCase()), 32),
          null // Any recipient
        ],
        fromBlock: -50000, // More targeted, can use smaller range
        toBlock: 'latest'
      };
      
      const transfersFromUser = await provider.getLogs(fromUserToFoxconnectFilter);
      console.log(`Found ${transfersFromUser.length} transfers from user`);
      
      // Check if any of these transfers were to FoxConnect contracts
      for (const transfer of transfersFromUser) {
        if (!transfer.topics[2]) continue;
        
        const to = ethers.utils.getAddress('0x' + transfer.topics[2].slice(26));
        
        if (
          to.toLowerCase() === FOXCONNECT_GLOBAL_ADDRESS.toLowerCase() ||
          to.toLowerCase() === FOXCONNECT_US_ADDRESS.toLowerCase()
        ) {
          console.log(`Found transfer from ${address} to ${to}`);
          transferFound = true;
          break;
        }
      }
      
      if (transferFound) break;
      
      // Check transfers from FoxConnect to user
      const toUserFromFoxconnectFilter = {
        address: tokenAddress,
        topics: [
          TRANSFER_EVENT_TOPIC,
          null, // Any sender
          ethers.utils.hexZeroPad(ethers.utils.hexlify(address.toLowerCase()), 32)
        ],
        fromBlock: -50000,
        toBlock: 'latest'
      };
      
      const transfersToUser = await provider.getLogs(toUserFromFoxconnectFilter);
      console.log(`Found ${transfersToUser.length} transfers to user`);
      
      // Check if any of these transfers were from FoxConnect contracts
      for (const transfer of transfersToUser) {
        if (!transfer.topics[1]) continue;
        
        const from = ethers.utils.getAddress('0x' + transfer.topics[1].slice(26));
        
        if (
          from.toLowerCase() === FOXCONNECT_GLOBAL_ADDRESS.toLowerCase() ||
          from.toLowerCase() === FOXCONNECT_US_ADDRESS.toLowerCase()
        ) {
          console.log(`Found transfer from ${from} to ${address}`);
          transferFound = true;
          break;
        }
      }
      
      if (transferFound) break;
    }
    
    return transferFound;
  } catch (error) {
    console.error('Error checking for FoxConnect transactions:', error);
    return false;
  }
};

/**
 * Checks if the given address is a card holder
 * @param address - The Ethereum address to check
 * @param networkId - Optional network ID, defaults to Linea
 * @returns Promise<boolean> - Whether the address is a card holder
 */
export const isCardHolder = async (
  address: string,
  networkId: string = LINEA_CHAIN_ID
): Promise<boolean> => {
  try {
    // Normalize address
    const normalizedAddress = address?.toLowerCase();
    
    if (!normalizedAddress) {
      console.log('Invalid address provided');
      return false;
    }

    // Only check on Linea network
    if (networkId !== LINEA_CHAIN_ID) {
      console.log(`Network ID ${networkId} is not Linea ${LINEA_CHAIN_ID}, skipping card check`);
      return false;
    }
    
    console.log(`Checking if address ${normalizedAddress} is a card holder on network ${networkId}`);
    
    // Check cache first
    const now = Date.now();
    const cacheEntry = cardHolderCache[normalizedAddress];
    if (cacheEntry && (now - cacheEntry.timestamp < CACHE_EXPIRATION)) {
      console.log(`Using cached result for ${normalizedAddress}: ${cacheEntry.status}`);
      return cacheEntry.status;
    }
    
    // Create provider
    // Try to get API key from environment, otherwise use a public RPC URL
    let provider: ethers.providers.JsonRpcProvider;
    const infuraKey = process.env.INFURA_API_KEY;
    
    if (infuraKey) {
      console.log('Using Infura provider');
      provider = new ethers.providers.JsonRpcProvider(`https://linea-mainnet.infura.io/v3/${infuraKey}`);
    } else {
      console.log('Using public RPC provider');
      // Fallback to a public RPC if no API key is available
      provider = new ethers.providers.JsonRpcProvider('https://linea-mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161');
    }
    
    // Check provider is connected
    try {
      const network = await provider.getNetwork();
      console.log(`Connected to network: ${network.name} (${network.chainId})`);
    } catch (error) {
      console.error('Error connecting to provider:', error);
      return false;
    }
    
    // Check if the address has delegated funds to FoxConnect contracts
    console.log('Checking if address has delegated funds to FoxConnect contracts');
    const delegated = await hasDelegatedFunds(normalizedAddress, provider);
    if (delegated) {
      console.log(`Address ${normalizedAddress} has delegated funds to FoxConnect contracts`);
      // Update cache
      cardHolderCache[normalizedAddress] = { status: true, timestamp: now };
      return true;
    }
    
    // Check if the address has transacted with FoxConnect contracts
    console.log('Checking if address has transacted with FoxConnect contracts');
    const transacted = await hasTransactedWithFoxConnect(normalizedAddress, provider);
    
    console.log(`Address ${normalizedAddress} has${transacted ? '' : ' not'} transacted with FoxConnect contracts`);
    
    // Update cache
    cardHolderCache[normalizedAddress] = { status: transacted, timestamp: now };
    
    return transacted;
  } catch (error) {
    console.error('Error checking if address is card holder:', error);
    return false;
  }
};
