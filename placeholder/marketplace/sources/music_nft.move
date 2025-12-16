 // Music NFT Module - A complete NFT system for minting music NFTs with metadata
module marketplace::music_nft;

use std::string::{Self, String};
use sui::event;
use sui::display;
use sui::package;

// ===== Error Codes =====

/// For when someone tries to burn an NFT they don't own
const ENotOwner: u64 = 0;
/// For when metadata strings are too long
const EMetadataTooLong: u64 = 1;

// ===== Core Structs =====

/// One-Time-Witness for the module - used for Display setup
public struct MUSIC_NFT has drop {}

/// The main Music NFT object that users will own
/// `key` = can be owned and transferred
/// `store` = can be stored in other objects (needed for marketplace listing)
public struct MusicNFT has key, store {
    id: UID,
    /// The name of the NFT (e.g., "Epic Beat #1")
    name: String,
    /// Description of the NFT
    description: String,
    /// URL to the cover image (stored on IPFS/Arweave/etc)
    image_url: String,
    /// URL to the music file (stored on IPFS/Arweave/etc)
    music_url: String,
    /// Creator's address
    creator: address,
    /// Optional: Attributes/traits as a string (can be JSON formatted)
    attributes: String,
}

/// Collection info - tracks all NFTs minted in this collection
public struct Collection has key {
    id: UID,
    /// Total number of NFTs minted
    total_minted: u64,
    /// Collection name
    name: String,
    /// Collection description
    description: String,
}

// ===== Events =====

/// Event emitted when a new NFT is minted
public struct NFTMinted has copy, drop {
    nft_id: ID,
    name: String,
    creator: address,
    recipient: address,
}

/// Event emitted when an NFT is burned
public struct NFTBurned has copy, drop {
    nft_id: ID,
    owner: address,
}

/// Event emitted when NFT metadata is updated
public struct NFTMetadataUpdated has copy, drop {
    nft_id: ID,
    updated_by: address,
}

// ===== Initialization =====

/// This runs once when the module is published
/// Sets up the Display standard for how NFTs appear in wallets/marketplaces
fun init(otw: MUSIC_NFT, ctx: &mut TxContext) {
    // Create a Publisher object to prove we own this module
    let publisher = package::claim(otw, ctx);
    
    // Create a Display object that defines how NFTs are displayed
    let mut display = display::new<MusicNFT>(&publisher, ctx);
    
    // Set display fields - these are shown in wallets and marketplaces
    display.add(b"name".to_string(), b"{name}".to_string());
    display.add(b"description".to_string(), b"{description}".to_string());
    display.add(b"image_url".to_string(), b"{image_url}".to_string());
    display.add(b"music_url".to_string(), b"{music_url}".to_string());
    display.add(b"creator".to_string(), b"{creator}".to_string());
    display.add(b"attributes".to_string(), b"{attributes}".to_string());
    display.add(b"project_url".to_string(), b"https://yourmarketplace.com".to_string());
    
    // Finalize and share the display object
    display.update_version();
    transfer::public_transfer(publisher, ctx.sender());
    transfer::public_transfer(display, ctx.sender());
    
    // Create and share the collection tracker
    let collection = Collection {
        id: object::new(ctx),
        total_minted: 0,
        name: string::utf8(b"Music NFT Collection"),
        description: string::utf8(b"A collection of unique music NFTs"),
    };
    transfer::share_object(collection);
}

// ===== Core Functions =====

/// Mint a new Music NFT
/// Anyone can call this function to mint an NFT
public fun mint(
    collection: &mut Collection,
    name: String,
    description: String,
    image_url: String,
    music_url: String,
    attributes: String,
    recipient: address,
    ctx: &mut TxContext,
) {
    // Create the NFT object
    let nft = MusicNFT {
        id: object::new(ctx),
        name,
        description,
        image_url,
        music_url,
        creator: ctx.sender(),
        attributes,
    };
    
    let nft_id = object::id(&nft);
    
    // Update collection stats
    collection.total_minted = collection.total_minted + 1;
    
    // Emit minting event
    event::emit(NFTMinted {
        nft_id,
        name: nft.name,
        creator: ctx.sender(),
        recipient,
    });
    
    // Transfer NFT to recipient
    transfer::public_transfer(nft, recipient);
}

/// Mint an NFT to yourself (convenience function)
public fun mint_to_sender(
    collection: &mut Collection,
    name: String,
    description: String,
    image_url: String,
    music_url: String,
    attributes: String,
    ctx: &mut TxContext,
) {
    mint(
        collection,
        name,
        description,
        image_url,
        music_url,
        attributes,
        ctx.sender(),
        ctx,
    );
}

/// Burn/destroy an NFT permanently
/// Only the owner can burn their NFT
public fun burn(
    nft: MusicNFT,
    ctx: &TxContext,
) {
    let nft_id = object::id(&nft);
    
    // Emit burn event
    event::emit(NFTBurned {
        nft_id,
        owner: ctx.sender(),
    });
    
    // Destroy the NFT
    let MusicNFT { 
        id, 
        name: _, 
        description: _, 
        image_url: _, 
        music_url: _, 
        creator: _,
        attributes: _,
    } = nft;
    id.delete();
}

/// Update NFT metadata (only owner can update)
/// Note: In production, you might want to restrict this or make NFTs immutable
public fun update_metadata(
    nft: &mut MusicNFT,
    new_description: String,
    new_attributes: String,
    ctx: &TxContext,
) {
    // Update the metadata
    nft.description = new_description;
    nft.attributes = new_attributes;
    
    // Emit update event
    event::emit(NFTMetadataUpdated {
        nft_id: object::id(nft),
        updated_by: ctx.sender(),
    });
}

// ===== View Functions =====

/// Get the name of an NFT
public fun name(nft: &MusicNFT): String {
    nft.name
}

/// Get the description of an NFT
public fun description(nft: &MusicNFT): String {
    nft.description
}

/// Get the image URL of an NFT
public fun image_url(nft: &MusicNFT): String {
    nft.image_url
}

/// Get the music URL of an NFT
public fun music_url(nft: &MusicNFT): String {
    nft.music_url
}

/// Get the creator address of an NFT
public fun creator(nft: &MusicNFT): address {
    nft.creator
}

/// Get the attributes of an NFT
public fun attributes(nft: &MusicNFT): String {
    nft.attributes
}

/// Get all NFT data at once
public fun get_nft_data(nft: &MusicNFT): (String, String, String, String, address, String) {
    (
        nft.name,
        nft.description,
        nft.image_url,
        nft.music_url,
        nft.creator,
        nft.attributes,
    )
}

/// Get collection statistics
public fun get_collection_stats(collection: &Collection): (u64, String, String) {
    (
        collection.total_minted,
        collection.name,
        collection.description,
    )
}

/// Get total minted count
public fun total_minted(collection: &Collection): u64 {
    collection.total_minted
}