// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/// NFT Minting Kontratı - Kullanıcılar görsel yükleyerek NFT mintleyebilir
module nft_minter::nft_minter {
    use sui::object::{UID, new};
    use sui::tx_context::{TxContext, sender};
    use sui::transfer;
    use std::string::{String};
    use sui::display;
    use sui::package;

    /// NFT Collection struct'ı
    public struct NFTCollection has key {
        id: UID,
        name: String,
        description: String,
        total_supply: u64,
    }

    /// NFT struct'ı - görsel URL'si ile
    public struct ImageNFT has key, store {
        id: UID,
        name: String,
        description: String,
        image_url: String,
        creator: address,
        mint_timestamp: u64,
    }

    /// One-time witness for creating display
    public struct NFT_MINTER has drop {}

    /// Module initializer
    fun init(otw: NFT_MINTER, ctx: &mut TxContext) {
        // Create and share collection object
        let collection = NFTCollection {
            id: new(ctx),
            name: b"Image NFT Collection".to_string(),
            description: b"A collection of user-uploaded image NFTs".to_string(),
            total_supply: 0,
        };
        transfer::share_object(collection);

        // Create display object for NFTs
        let publisher = package::claim(otw, ctx);
        let mut display = display::new<ImageNFT>(&publisher, ctx);
        
        display::add(&mut display, b"name".to_string(), b"{name}".to_string());
        display::add(&mut display, b"description".to_string(), b"{description}".to_string());
        display::add(&mut display, b"image_url".to_string(), b"{image_url}".to_string());
        display::add(&mut display, b"creator".to_string(), b"{creator}".to_string());
        
        display::update_version(&mut display);
        
        transfer::public_transfer(publisher, sender(ctx));
        transfer::public_transfer(display, sender(ctx));
    }

    /// Görsel NFT mintleme fonksiyonu
    public entry fun mint_image_nft(
        collection: &mut NFTCollection,
        name: String,
        description: String, 
        image_url: String,
        ctx: &mut TxContext
    ) {
        let sender_addr = sender(ctx);
        
        // Create NFT
        let nft = ImageNFT {
            id: new(ctx),
            name,
            description,
            image_url,
            creator: sender_addr,
            mint_timestamp: sui::tx_context::epoch_timestamp_ms(ctx),
        };
        
        // Update collection supply
        collection.total_supply = collection.total_supply + 1;
        
        // Transfer NFT to creator
        transfer::public_transfer(nft, sender_addr);
    }

    /// NFT bilgilerini oku
    public fun get_nft_info(nft: &ImageNFT): (String, String, String, address, u64) {
        (nft.name, nft.description, nft.image_url, nft.creator, nft.mint_timestamp)
    }

    /// Collection bilgilerini oku  
    public fun get_collection_info(collection: &NFTCollection): (String, String, u64) {
        (collection.name, collection.description, collection.total_supply)
    }
}
