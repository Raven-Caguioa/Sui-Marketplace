// Music NFT Module V2 - NFT system with Artist, Genre, and Random Rarity
module marketplace::music_nft;

use std::string::{Self, String};
use sui::event;
use sui::display;
use sui::package;
use sui::random::{Random, RandomGenerator};

// ===== Error Codes =====

/// For when someone tries to burn an NFT they don't own
const ENotOwner: u64 = 0;
/// For when metadata strings are too long
const EMetadataTooLong: u64 = 1;

// ===== Rarity Constants =====
const RARITY_COMMON: u8 = 0;
const RARITY_UNCOMMON: u8 = 1;
const RARITY_RARE: u8 = 2;
const RARITY_LEGENDARY: u8 = 3;
const RARITY_MYTHIC: u8 = 4;

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
    /// Artist name - NEW FIELD
    artist: String,
    /// Genre of the music - RENAMED from description
    genre: String,
    /// URL to the cover image (stored on IPFS/Arweave/etc)
    image_url: String,
    /// URL to the music file (stored on IPFS/Arweave/etc)
    music_url: String,
    /// Creator's address
    creator: address,
    /// Optional: Attributes/traits as a string (can be JSON formatted)
    attributes: String,
    /// Rarity level (0=Common, 1=Uncommon, 2=Rare, 3=Legendary, 4=Mythic) - NEW FIELD
    rarity: u8,
    /// Rarity name as string for display - NEW FIELD
    rarity_name: String,
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
    /// Track minted by rarity
    common_minted: u64,
    uncommon_minted: u64,
    rare_minted: u64,
    legendary_minted: u64,
    mythic_minted: u64,
}

// ===== Events =====

/// Event emitted when a new NFT is minted
public struct NFTMinted has copy, drop {
    nft_id: ID,
    name: String,
    artist: String,
    genre: String,
    creator: address,
    recipient: address,
    rarity: u8,
    rarity_name: String,
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
    display.add(b"artist".to_string(), b"{artist}".to_string());
    display.add(b"genre".to_string(), b"{genre}".to_string());
    display.add(b"description".to_string(), b"{genre}".to_string()); // Also map to description for compatibility
    display.add(b"image_url".to_string(), b"{image_url}".to_string());
    display.add(b"music_url".to_string(), b"{music_url}".to_string());
    display.add(b"creator".to_string(), b"{creator}".to_string());
    display.add(b"attributes".to_string(), b"{attributes}".to_string());
    display.add(b"rarity".to_string(), b"{rarity_name}".to_string());
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
        description: string::utf8(b"A collection of unique music NFTs with random rarity"),
        common_minted: 0,
        uncommon_minted: 0,
        rare_minted: 0,
        legendary_minted: 0,
        mythic_minted: 0,
    };
    transfer::share_object(collection);
}

// ===== Helper Functions =====

/// Generate random rarity based on weighted probabilities
/// Common: 50%, Uncommon: 30%, Rare: 15%, Legendary: 4%, Mythic: 1%
fun generate_rarity(generator: &mut RandomGenerator): u8 {
    let roll = generator.generate_u8_in_range(1, 100);
    
    if (roll <= 50) {
        RARITY_COMMON
    } else if (roll <= 80) {
        RARITY_UNCOMMON
    } else if (roll <= 95) {
        RARITY_RARE
    } else if (roll <= 99) {
        RARITY_LEGENDARY
    } else {
        RARITY_MYTHIC
    }
}

/// Convert rarity code to string name
fun rarity_to_string(rarity: u8): String {
    if (rarity == RARITY_COMMON) {
        string::utf8(b"Common")
    } else if (rarity == RARITY_UNCOMMON) {
        string::utf8(b"Uncommon")
    } else if (rarity == RARITY_RARE) {
        string::utf8(b"Rare")
    } else if (rarity == RARITY_LEGENDARY) {
        string::utf8(b"Legendary")
    } else {
        string::utf8(b"Mythic")
    }
}

/// Update collection rarity counts
fun increment_rarity_count(collection: &mut Collection, rarity: u8) {
    if (rarity == RARITY_COMMON) {
        collection.common_minted = collection.common_minted + 1;
    } else if (rarity == RARITY_UNCOMMON) {
        collection.uncommon_minted = collection.uncommon_minted + 1;
    } else if (rarity == RARITY_RARE) {
        collection.rare_minted = collection.rare_minted + 1;
    } else if (rarity == RARITY_LEGENDARY) {
        collection.legendary_minted = collection.legendary_minted + 1;
    } else if (rarity == RARITY_MYTHIC) {
        collection.mythic_minted = collection.mythic_minted + 1;
    }
}

// ===== Core Functions =====
// IMPORTANT: Function signatures match your original code
// Just update the internal implementation

/// Mint a new Music NFT with random rarity
/// SAME FUNCTION SIGNATURE - just added random parameter at the beginning
public fun mint(
    collection: &mut Collection,
    random: &Random,
    name: String,
    description: String, // This is now treated as GENRE
    image_url: String,
    music_url: String,
    attributes: String, // This is now treated as ARTIST
    recipient: address,
    ctx: &mut TxContext,
) {
    // Generate random rarity
    let mut generator = random.new_generator(ctx);
    let rarity = generate_rarity(&mut generator);
    let rarity_name = rarity_to_string(rarity);
    
    // Map old parameters to new fields:
    // description -> genre
    // attributes -> artist
    let artist = attributes;
    let genre = description;
    
    // Create the NFT object
    let nft = MusicNFT {
        id: object::new(ctx),
        name,
        artist,
        genre,
        image_url,
        music_url,
        creator: ctx.sender(),
        attributes: string::utf8(b"{}"), // Empty JSON for now
        rarity,
        rarity_name,
    };
    
    let nft_id = object::id(&nft);
    
    // Update collection stats
    collection.total_minted = collection.total_minted + 1;
    increment_rarity_count(collection, rarity);
    
    // Emit minting event
    event::emit(NFTMinted {
        nft_id,
        name: nft.name,
        artist: nft.artist,
        genre: nft.genre,
        creator: ctx.sender(),
        recipient,
        rarity,
        rarity_name: nft.rarity_name,
    });
    
    // Transfer NFT to recipient
    transfer::public_transfer(nft, recipient);
}

/// Mint an NFT to yourself (convenience function)
/// SAME FUNCTION SIGNATURE - just added random parameter
public fun mint_to_sender(
    collection: &mut Collection,
    random: &Random,
    name: String,
    description: String, // This is GENRE
    image_url: String,
    music_url: String,
    attributes: String, // This is ARTIST
    ctx: &mut TxContext,
) {
    mint(
        collection,
        random,
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
/// SAME FUNCTION SIGNATURE
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
        artist: _,
        genre: _,
        image_url: _, 
        music_url: _, 
        creator: _,
        attributes: _,
        rarity: _,
        rarity_name: _,
    } = nft;
    id.delete();
}

/// Update NFT metadata (only owner can update)
/// SAME FUNCTION SIGNATURE
public fun update_metadata(
    nft: &mut MusicNFT,
    new_description: String, // Mapped to genre
    new_attributes: String,  // Mapped to artist
    ctx: &TxContext,
) {
    // Update the metadata
    nft.genre = new_description;
    nft.artist = new_attributes;
    
    // Emit update event
    event::emit(NFTMetadataUpdated {
        nft_id: object::id(nft),
        updated_by: ctx.sender(),
    });
}

// ===== View Functions =====
// KEEPING ORIGINAL FUNCTION NAMES for backward compatibility

/// Get the name of an NFT
public fun name(nft: &MusicNFT): String {
    nft.name
}

/// Get the description of an NFT (now returns genre)
public fun description(nft: &MusicNFT): String {
    nft.genre
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

/// Get the attributes of an NFT (now returns artist)
public fun attributes(nft: &MusicNFT): String {
    nft.artist
}

// ===== NEW View Functions for new fields =====

/// Get the artist name
public fun artist(nft: &MusicNFT): String {
    nft.artist
}

/// Get the genre
public fun genre(nft: &MusicNFT): String {
    nft.genre
}

/// Get the rarity level
public fun rarity(nft: &MusicNFT): u8 {
    nft.rarity
}

/// Get the rarity name
public fun rarity_name(nft: &MusicNFT): String {
    nft.rarity_name
}

/// Get all NFT data at once - UPDATED to include new fields
public fun get_nft_data(nft: &MusicNFT): (String, String, String, String, String, address, String, u8, String) {
    (
        nft.name,
        nft.artist,
        nft.genre,
        nft.image_url,
        nft.music_url,
        nft.creator,
        nft.attributes,
        nft.rarity,
        nft.rarity_name,
    )
}

/// Get collection statistics - SAME SIGNATURE
public fun get_collection_stats(collection: &Collection): (u64, String, String) {
    (
        collection.total_minted,
        collection.name,
        collection.description,
    )
}

/// Get rarity distribution statistics - NEW
public fun get_rarity_stats(collection: &Collection): (u64, u64, u64, u64, u64) {
    (
        collection.common_minted,
        collection.uncommon_minted,
        collection.rare_minted,
        collection.legendary_minted,
        collection.mythic_minted,
    )
}

/// Get total minted count - SAME SIGNATURE
public fun total_minted(collection: &Collection): u64 {
    collection.total_minted
}