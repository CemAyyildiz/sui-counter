// Devnet NFT Minter Contract
export const DEVNET_NFT_PACKAGE_ID = "0x34353f1228d54b43c298165e536239d103a6e179f3628bdd15081fe91bc2be90";
export const DEVNET_COLLECTION_ID = "0x0af09b33e0a0f6a710856a5a4594d5674cebc024e827b0569c4efcdfde2b8ec3";

// Testnet NFT Minter Contract (NEW - Deployed!)
export const TESTNET_NFT_PACKAGE_ID = "0x8ae048bb8bc3bb081d877008c54ca8626709eff6c4bf7ab04883c2d91f358aed";
export const TESTNET_COLLECTION_ID = "0x0de294177384a6be0faae746a83058860ea8ba11411e464998534b827178ff2b";

// Mainnet NFT Minter Contract
export const MAINNET_NFT_PACKAGE_ID = "0xTODO"; // Mainnet için publish sonrası güncelle
export const MAINNET_COLLECTION_ID = "0xTODO"; // Mainnet için publish sonrası güncelle

// Legacy counter constants (backward compatibility)
export const DEVNET_COUNTER_PACKAGE_ID = "0xTODO"; // Devnet için publish sonrası güncelle
export const DEVNET_SUPPLY_ID = "0xTODO"; // Devnet için publish sonrası güncelle
export const TESTNET_COUNTER_PACKAGE_ID = "0x39f4b19a7c9116f23453a1a6c8536ab71b5b56f3eb14197d5bcb841b7f343da4";
export const TESTNET_SUPPLY_ID = "0x7e3a3f79ad68342626b97664b77207d1790c58b81a4e1927c96e0fbef3e93c14";
export const MAINNET_COUNTER_PACKAGE_ID = "0xTODO"; // Mainnet için publish sonrası güncelle

// Pinata IPFS Configuration
export const PINATA_CONFIG = {
  JWT_TOKEN: import.meta.env.VITE_PINATA_JWT || '',
  API_URL: 'https://api.pinata.cloud/pinning/pinFileToIPFS',
  GATEWAY_URL: 'https://gateway.pinata.cloud/ipfs/',
  PINATA_PIN_URL: 'https://api.pinata.cloud/pinning/pinFileToIPFS'
};

// Check if Pinata is properly configured
export const isPinataConfigured = (): boolean => {
  const token = import.meta.env.VITE_PINATA_JWT;
  return Boolean(token && token !== 'YOUR_PINATA_JWT_TOKEN' && token.trim() !== '');
};

// Multiple IPFS gateways for fallback
export const IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs/', // Most reliable and widely used
  'https://gateway.pinata.cloud/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://dweb.link/ipfs/',
  'https://gateway.ipfs.io/ipfs/',
  'https://ipfs.fleek.co/ipfs/',
  'https://ipfs.infura.io/ipfs/',
  'https://gateway.temporal.cloud/ipfs/'
];

// Function to get a working IPFS gateway URL
export const getWorkingIpfsUrl = (hash: string): string => {
  // Try Cloudflare first (more reliable)
  return `${IPFS_GATEWAYS[0]}${hash}`;
};

// Function to get fallback IPFS URLs
export const getFallbackIpfsUrls = (hash: string): string[] => {
  return IPFS_GATEWAYS.slice(1).map(gateway => `${gateway}${hash}`);
};
