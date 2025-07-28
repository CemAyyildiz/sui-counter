# Sui NFT Counter Application

This project is an NFT minting application running on the Sui blockchain. Users can mint a limited number of NFTs (10 total) and each user can only mint once.

## 🚀 Features

- **Limited NFT Minting**: Maximum of 10 NFTs can be minted in total
- **One NFT Per User**: Each wallet address can only mint once
- **Mint Order Tracking**: Each NFT's mint order is permanently recorded
- **Image Support**: Support for NFT image URLs
- **Multi-Network**: Support for Devnet, Testnet, and Mainnet
- **Real-time Updates**: Live NFT status tracking
- **Modern UI**: Modern and user-friendly interface with Radix UI

## 🛠️ Technologies

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Radix UI** - UI components
- **@mysten/dapp-kit** - Sui wallet integration
- **TanStack Query** - Data management

### Backend (Smart Contract)
- **Move** - Sui blockchain programming language
- **Sui SDK** - Blockchain integration

## 📋 Installation

### Requirements

- Node.js 18+
- pnpm (recommended) or npm
- Sui CLI

### 1. Clone the Project

```bash
git clone <repo-url>
cd sui-counter
```

### 2. Install Dependencies

```bash
pnpm install
# or
npm install
```

### 3. Sui CLI Setup

Follow the [official documentation](https://docs.sui.io/build/install) to install the Sui CLI.

Set up the testnet environment:

```bash
sui client new-env --alias testnet --rpc https://fullnode.testnet.sui.io:443
sui client switch --env testnet
```

Create a new address:

```bash
sui client new-address secp256k1
sui client switch --address 0xYOUR_ADDRESS...
```

Get test tokens from [Sui Faucet](https://faucet.sui.io).

## 🚀 Smart Contract Deployment

### 1. Publish the Move Package

```bash
cd move
sui client publish --gas-budget 100000000 counter
```

### 2. Save the Package ID

Update the `packageId` from the deploy output in `src/constants.ts`:

```typescript
export const TESTNET_COUNTER_PACKAGE_ID = "0xYOUR_PACKAGE_ID";
```

### 3. Initialize the Supply Object

After first deployment, initialize the supply object:

```bash
sui client call --package YOUR_PACKAGE_ID --module counter --function init_supply --gas-budget 10000000
```

Update the created Supply object ID in `src/constants.ts`:

```typescript
export const TESTNET_SUPPLY_ID = "0xYOUR_SUPPLY_ID";
```

## 🎯 Running the Application

### Development Mode

```bash
pnpm dev
```

### Production Build

```bash
pnpm build
pnpm preview
```

## 📱 Usage

### 1. Wallet Connection

- Open the application
- Click the "Connect Wallet" button in the top right corner
- Select one of the supported wallets (Sui Wallet, Ethos, etc.)

### 2. NFT Minting

- After wallet connection, the "Mint NFT" button appears
- Click the button to start the minting process
- Your NFT will be automatically displayed after transaction confirmation

### 3. NFT Viewing

- The minted NFT's mint order, owner address, and image (if available) are displayed
- NFT ID is stored as a hash in the URL (#nft_id)
- You can share the direct link to show the NFT to others

## 🔧 Configuration

### Network Settings

Settings for different networks in `src/constants.ts`:

```typescript
// Devnet
export const DEVNET_COUNTER_PACKAGE_ID = "0xYOUR_DEVNET_PACKAGE_ID";
export const DEVNET_SUPPLY_ID = "0xYOUR_DEVNET_SUPPLY_ID";

// Testnet  
export const TESTNET_COUNTER_PACKAGE_ID = "0xYOUR_TESTNET_PACKAGE_ID";
export const TESTNET_SUPPLY_ID = "0xYOUR_TESTNET_SUPPLY_ID";

// Mainnet
export const MAINNET_COUNTER_PACKAGE_ID = "0xYOUR_MAINNET_PACKAGE_ID";
```

### Network Configuration

You can select the active network in `src/networkConfig.ts`.

## 🔐 Smart Contract Details

### Counter Module (`counter::counter`)

#### Structures

- **Supply**: Tracks total mint count and minters
- **Nft**: Stores each NFT's owner and mint order information

#### Functions

- **init_supply()**: Initializes the supply object (called once)
- **mint()**: Mints new NFT (within limits)
- **get_nft_info()**: Reads NFT information

#### Limits and Rules

- **Maximum NFTs**: 10 total
- **Per User Limit**: 1 NFT
- **Mint Order**: Automatically incremented starting from 1

## 📊 Error Codes

- **100**: Mint limit exceeded (10 NFTs)
- **101**: This address has already minted

## 🎨 UI/UX Features

- **Responsive Design**: Compatible with all devices
- **Loading States**: Loading animations for transaction states
- **Error Handling**: User-friendly error messages
- **Success Feedback**: Notifications for successful transactions
- **Dark Theme**: Modern dark theme

## 🔍 Troubleshooting

### "NFT not found" Error
- Ensure the NFT ID in the URL is correct
- Verify that the NFT was actually minted

### "Invalid object structure" Error
- Might be an NFT from an old contract version
- Mint a new NFT

### Mint Transaction Failed
- Check your wallet balance (for gas fees)
- You might have already minted before
- The 10 NFT limit might have been reached

## 📄 License

This project is licensed under the Apache 2.0 License.

## 🤝 Contributing

1. Fork the project
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Create a Pull Request

## 📞 Support

For questions:
- Use GitHub Issues
- Join the [Sui Discord](https://discord.gg/sui) community

---

**Note**: This project is built upon Mysten Labs' Sui dApp template.
