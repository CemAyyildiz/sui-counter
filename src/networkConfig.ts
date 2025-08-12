import { getFullnodeUrl } from "@mysten/sui/client";
import {
  DEVNET_NFT_PACKAGE_ID,
  TESTNET_NFT_PACKAGE_ID,
  MAINNET_NFT_PACKAGE_ID,
  DEVNET_COLLECTION_ID,
  TESTNET_COLLECTION_ID,
  MAINNET_COLLECTION_ID,
} from "./constants.ts";
import { createNetworkConfig } from "@mysten/dapp-kit";

const { networkConfig, useNetworkVariable, useNetworkVariables } =
  createNetworkConfig({
    devnet: {
      url: getFullnodeUrl("devnet"),
      variables: {
        counterPackageId: DEVNET_NFT_PACKAGE_ID,
        collectionId: DEVNET_COLLECTION_ID,
        network: "devnet" as const,
      },
    },
    testnet: {
      url: getFullnodeUrl("testnet"),
      variables: {
        counterPackageId: TESTNET_NFT_PACKAGE_ID,
        collectionId: TESTNET_COLLECTION_ID,
        network: "testnet" as const,
      },
    },
    mainnet: {
      url: getFullnodeUrl("mainnet"),
      variables: {
        counterPackageId: MAINNET_NFT_PACKAGE_ID,
        collectionId: MAINNET_COLLECTION_ID,
        network: "mainnet" as const,
      },
    },
  });

export { useNetworkVariable, useNetworkVariables, networkConfig };
