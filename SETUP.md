# 🚀 Setup Guide for NFT Creator

## Prerequisites

1. **Node.js** (v18 or higher)
2. **npm** or **yarn**
3. **Sui Wallet** (Sui Wallet extension or Sui Mobile Wallet)

## Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd sui-counter
```

2. Install dependencies:
```bash
npm install
```

## Environment Configuration

### Pinata IPFS Setup

To use NFT minting functionality, you need to configure Pinata IPFS:

1. **Get Pinata API Key:**
   - Go to [Pinata Dashboard](https://app.pinata.cloud/developers/api-keys)
   - Sign up/Login to your account
   - Create a new API key
   - Copy the JWT token

2. **Create Environment File:**
   - Create a `.env` file in your project root
   - Add your Pinata JWT token:
   ```bash
   VITE_PINATA_JWT=your_jwt_token_here
   ```

3. **Restart Development Server:**
   ```bash
   npm run dev
   ```

## Running the Application

1. **Development Mode:**
   ```bash
   npm run dev
   ```

2. **Build for Production:**
   ```bash
   npm run build
   ```

3. **Preview Production Build:**
   ```bash
   npm run preview
   ```

## Troubleshooting

### Common Issues

1. **"Pinata upload failed: 401"**
   - Check if your JWT token is correct
   - Ensure the token hasn't expired
   - Verify the token has proper permissions

2. **"Failed to load resource: 404"**
   - This is usually a favicon issue and should be resolved now

3. **"Dialog is changing from uncontrolled to controlled"**
   - This warning should be resolved with the latest updates

### Network Configuration

The app automatically detects your Sui network:
- **Devnet**: For testing and development
- **Testnet**: For testing with real tokens
- **Mainnet**: For production use

## Features

- 🎨 **Pixel Art Generation**: Transform images into pixel art
- 🖼️ **NFT Minting**: Create NFTs on Sui blockchain
- 🔄 **Multiple Upload Methods**: File upload, URL, or drag & drop
- 🌐 **IPFS Storage**: Decentralized image storage
- 📱 **Responsive Design**: Works on all devices

## Support

If you encounter any issues:
1. Check this setup guide
2. Verify your environment variables
3. Check the browser console for error messages
4. Ensure your Sui wallet is connected
