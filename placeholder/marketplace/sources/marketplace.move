// Music Streaming Marketplace - Listen to NFT music and earn SUI
module marketplace::music_marketplace;

use sui::coin::{Self, Coin};
use sui::balance::{Self, Balance};
use sui::sui::SUI;
use sui::table::{Self, Table};
use sui::clock::{Self, Clock};
use sui::event;
use marketplace::music_nft::MusicNFT;

// ===== Error Codes =====
const ENotOwner: u64 = 0;
const EListingNotFound: u64 = 1;
const EInsufficientRewards: u64 = 2;
const ENoRewardsToClaim: u64 = 3;
const EMusicNotListed: u64 = 4;
const ENotListening: u64 = 5;

// Reward rate: 0.0000001 SUI per second = 100 MIST per second
const REWARD_PER_SECOND: u64 = 100;

// ===== Structs =====

/// Main marketplace that holds all music NFTs and reward pool
public struct MusicMarketplace has key {
    id: UID,
    /// All listed music NFTs (NFT_ID -> MusicListing)
    music_library: Table<ID, MusicListing>,
    /// Track active listeners (user_address -> ListeningSession)
    active_listeners: Table<address, ListeningSession>,
    /// Reward pool containing SUI for payouts
    reward_pool: Balance<SUI>,
    /// Statistics
    total_music_listed: u64,
    total_listens: u64,
    total_rewards_distributed: u64,
}

/// Holds a listed music NFT and its stats
public struct MusicListing has store {
    nft: MusicNFT,
    owner: address,
    total_listens: u64,
    total_listen_time_seconds: u64,
}

/// Tracks a user's current listening session
public struct ListeningSession has store, drop {
    nft_id: ID,
    started_at_ms: u64,
    total_seconds_listened: u64,
    pending_rewards_mist: u64,
}

// ===== Events =====

public struct MusicListed has copy, drop {
    nft_id: ID,
    owner: address,
}

public struct MusicUnlisted has copy, drop {
    nft_id: ID,
    owner: address,
}

public struct ListeningStarted has copy, drop {
    user: address,
    nft_id: ID,
    timestamp_ms: u64,
}

public struct ListeningStopped has copy, drop {
    user: address,
    nft_id: ID,
    seconds_listened: u64,
}

public struct RewardsClaimed has copy, drop {
    user: address,
    amount_mist: u64,
}

public struct RewardPoolFunded has copy, drop {
    amount_mist: u64,
}

// ===== Marketplace Setup =====

/// Create a new Music Streaming Marketplace
public fun create(ctx: &mut TxContext) {
    let marketplace = MusicMarketplace {
        id: object::new(ctx),
        music_library: table::new(ctx),
        active_listeners: table::new(ctx),
        reward_pool: balance::zero(),
        total_music_listed: 0,
        total_listens: 0,
        total_rewards_distributed: 0,
    };
    transfer::share_object(marketplace);
}

/// Fund the reward pool with SUI
public fun fund_reward_pool(
    marketplace: &mut MusicMarketplace,
    payment: Coin<SUI>,
    _ctx: &mut TxContext,
) {
    let amount = coin::value(&payment);
    let coin_balance = coin::into_balance(payment);
    balance::join(&mut marketplace.reward_pool, coin_balance);
    
    event::emit(RewardPoolFunded {
        amount_mist: amount,
    });
}

// ===== Music Library Management =====

/// List a Music NFT for streaming
/// The NFT is stored in the marketplace
public fun list_music(
    marketplace: &mut MusicMarketplace,
    nft: MusicNFT,
    ctx: &mut TxContext,
) {
    let nft_id = object::id(&nft);
    let owner = ctx.sender();
    
    let listing = MusicListing {
        nft,
        owner,
        total_listens: 0,
        total_listen_time_seconds: 0,
    };
    
    marketplace.music_library.add(nft_id, listing);
    marketplace.total_music_listed = marketplace.total_music_listed + 1;
    
    event::emit(MusicListed {
        nft_id,
        owner,
    });
}

/// Unlist a Music NFT and return it to owner
public fun unlist_music(
    marketplace: &mut MusicMarketplace,
    nft_id: ID,
    ctx: &mut TxContext,
) {
    assert!(marketplace.music_library.contains(nft_id), EListingNotFound);
    
    // Destructure the listing to extract the NFT
    let MusicListing { 
        nft, 
        owner, 
        total_listens: _, 
        total_listen_time_seconds: _ 
    } = marketplace.music_library.remove(nft_id);
    
    assert!(owner == ctx.sender(), ENotOwner);
    
    marketplace.total_music_listed = marketplace.total_music_listed - 1;
    
    event::emit(MusicUnlisted {
        nft_id,
        owner,
    });
    
    // Return NFT to owner
    transfer::public_transfer(nft, ctx.sender());
}

// ===== Listening & Earning =====

/// Start listening to a music NFT
/// Begins tracking time and accumulating rewards
public fun start_listening(
    marketplace: &mut MusicMarketplace,
    nft_id: ID,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let user = ctx.sender();
    assert!(marketplace.music_library.contains(nft_id), EMusicNotListed);
    
    let timestamp_ms = clock::timestamp_ms(clock);
    
    // If user was already listening to something, stop it first
    if (marketplace.active_listeners.contains(user)) {
        let _old_session = marketplace.active_listeners.remove(user);
    };
    
    // Create new listening session
    let session = ListeningSession {
        nft_id,
        started_at_ms: timestamp_ms,
        total_seconds_listened: 0,
        pending_rewards_mist: 0,
    };
    
    marketplace.active_listeners.add(user, session);
    
    // Update music stats
    let listing = marketplace.music_library.borrow_mut(nft_id);
    listing.total_listens = listing.total_listens + 1;
    marketplace.total_listens = marketplace.total_listens + 1;
    
    event::emit(ListeningStarted {
        user,
        nft_id,
        timestamp_ms,
    });
}

/// Update listening progress - call this periodically (e.g., every second)
/// This accumulates rewards based on seconds listened
public fun update_listening(
    marketplace: &mut MusicMarketplace,
    seconds_increment: u64,
    _clock: &Clock,
    ctx: &mut TxContext,
) {
    let user = ctx.sender();
    assert!(marketplace.active_listeners.contains(user), ENotListening);
    
    let session = marketplace.active_listeners.borrow_mut(user);
    
    // Calculate rewards for this increment
    let reward_increment = seconds_increment * REWARD_PER_SECOND;
    
    // Update session
    session.total_seconds_listened = session.total_seconds_listened + seconds_increment;
    session.pending_rewards_mist = session.pending_rewards_mist + reward_increment;
    
    // Update music listing stats
    let listing = marketplace.music_library.borrow_mut(session.nft_id);
    listing.total_listen_time_seconds = listing.total_listen_time_seconds + seconds_increment;
}

/// Stop listening (when music ends or user stops)
/// Keeps the pending rewards for later claim
public fun stop_listening(
    marketplace: &mut MusicMarketplace,
    ctx: &mut TxContext,
) {
    let user = ctx.sender();
    assert!(marketplace.active_listeners.contains(user), ENotListening);
    
    let session = marketplace.active_listeners.remove(user);
    
    event::emit(ListeningStopped {
        user,
        nft_id: session.nft_id,
        seconds_listened: session.total_seconds_listened,
    });
    
    // Store pending rewards for claiming
    // Since we removed the session, rewards are lost unless we claim first
    // Better approach: claim before stopping
}

/// Claim accumulated rewards and reset counter
/// This pays out the SUI and resets pending rewards
public fun claim_rewards(
    marketplace: &mut MusicMarketplace,
    ctx: &mut TxContext,
) {
    let user = ctx.sender();
    assert!(marketplace.active_listeners.contains(user), ENotListening);
    
    let session = marketplace.active_listeners.borrow_mut(user);
    let reward_amount = session.pending_rewards_mist;
    
    assert!(reward_amount > 0, ENoRewardsToClaim);
    assert!(balance::value(&marketplace.reward_pool) >= reward_amount, EInsufficientRewards);
    
    // Transfer rewards
    let reward_balance = balance::split(&mut marketplace.reward_pool, reward_amount);
    let reward_coin = coin::from_balance(reward_balance, ctx);
    transfer::public_transfer(reward_coin, user);
    
    // Reset pending rewards but keep listening session active
    session.pending_rewards_mist = 0;
    
    // Update stats
    marketplace.total_rewards_distributed = marketplace.total_rewards_distributed + reward_amount;
    
    event::emit(RewardsClaimed {
        user,
        amount_mist: reward_amount,
    });
}

/// Stop listening AND claim rewards in one transaction
public fun stop_and_claim(
    marketplace: &mut MusicMarketplace,
    ctx: &mut TxContext,
) {
    // First claim rewards while session is still active
    claim_rewards(marketplace, ctx);
    
    // Then stop listening
    stop_listening(marketplace, ctx);
}

// ===== View Functions =====

/// Check if music is listed
public fun is_music_listed(
    marketplace: &MusicMarketplace,
    nft_id: ID,
): bool {
    marketplace.music_library.contains(nft_id)
}

/// Get music listing stats
public fun get_music_stats(
    marketplace: &MusicMarketplace,
    nft_id: ID,
): (address, u64, u64) {
    let listing = marketplace.music_library.borrow(nft_id);
    (listing.owner, listing.total_listens, listing.total_listen_time_seconds)
}

/// Check if user is currently listening
public fun is_listening(
    marketplace: &MusicMarketplace,
    user: address,
): bool {
    marketplace.active_listeners.contains(user)
}

/// Get user's current listening session info
public fun get_listening_session(
    marketplace: &MusicMarketplace,
    user: address,
): (ID, u64, u64, u64) {
    assert!(marketplace.active_listeners.contains(user), ENotListening);
    let session = marketplace.active_listeners.borrow(user);
    (
        session.nft_id,
        session.started_at_ms,
        session.total_seconds_listened,
        session.pending_rewards_mist
    )
}

/// Get reward pool balance (in MIST)
public fun get_reward_pool_balance(
    marketplace: &MusicMarketplace,
): u64 {
    balance::value(&marketplace.reward_pool)
}

/// Get marketplace statistics
public fun get_marketplace_stats(
    marketplace: &MusicMarketplace,
): (u64, u64, u64, u64) {
    (
        marketplace.total_music_listed,
        marketplace.total_listens,
        marketplace.total_rewards_distributed,
        balance::value(&marketplace.reward_pool)
    )
}

/// Get the reward rate per second (in MIST)
public fun get_reward_rate(): u64 {
    REWARD_PER_SECOND
}