// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/// Bu kontrat en fazla 10 adet NFT mintlenmesine izin verir. Her NFT'nin üzerinde mint sırası ve sahibi yazılıdır.
module counter::counter {
    use sui::object::{UID, new};
    use sui::tx_context::{TxContext, sender};
    use sui::transfer;
    use std::vector;

    /// Toplam mintlenen NFT sayısını ve mintleyen adresleri tutan struct
    public struct Supply has key {
        id: UID,
        count: u64,
        minters: vector<address>,
    }

    /// NFT struct'ı
    public struct Nft has key, store {
        id: UID,
        owner: address,
        mint_index: u64,
    }

    /// Supply objesini başlat (ilk deployda çağrılır)
    public fun init_supply(ctx: &mut TxContext) {
        transfer::share_object(Supply {
            id: new(ctx),
            count: 0,
            minters: vector::empty<address>(),
        })
    }

    /// NFT mintle (en fazla 10 adet, her adres sadece 1 kez)
    public fun mint(supply: &mut Supply, ctx: &mut TxContext) {
        assert!(supply.count < 10, 100);
        let sender_addr = sender(ctx);
        let mut i = 0;
        let minters_ref = &supply.minters;
        while (i < vector::length(minters_ref)) {
            assert!(vector::borrow(minters_ref, i) != sender_addr, 101);
            i = i + 1;
        }
        ; supply.count = supply.count + 1;
        let mint_index = supply.count;
        vector::push_back(&mut supply.minters, sender_addr);
        transfer::transfer(Nft {
            id: new(ctx),
            owner: sender_addr,
            mint_index,
        }, sender_addr);
    }

    /// NFT'nin üzerindeki mint sırasını ve sahibini oku
    public fun get_nft_info(nft: &Nft): (address, u64) {
        (nft.owner, nft.mint_index)
    }
}
