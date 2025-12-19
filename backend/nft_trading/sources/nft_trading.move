// ==================== FILE: sources/trade.move ====================
module nft_trading::trade {
    use sui::object::{Self, UID, ID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::event;
    use sui::clock::{Self, Clock};

    // ==================== Error Codes ====================
    const E_NOT_INITIATOR: u64 = 1;
    const E_NOT_TARGET: u64 = 2;
    const E_INVALID_STATE: u64 = 3;
    const E_ALREADY_LOCKED: u64 = 4;
    const E_NOT_LOCKED: u64 = 5;
    const E_TRADE_EXPIRED: u64 = 6;
    const E_CANNOT_TRADE_WITH_SELF: u64 = 7;

    // ==================== Trade States ====================
    const STATE_PENDING: u8 = 0;      // Waiting for target to accept
    const STATE_ACCEPTED: u8 = 1;     // Target accepted, both NFTs locked
    const STATE_COMPLETED: u8 = 2;    // Trade completed successfully
    const STATE_CANCELLED: u8 = 3;    // Trade cancelled
    const STATE_REJECTED: u8 = 4;     // Target rejected the trade

    // ==================== Structs ====================

    /// Main trade request object - holds the trade state and locked NFTs
    public struct TradeRequest<T1: key + store, T2: key + store> has key {
        id: UID,
        initiator: address,                    // Person who started the trade (Bob)
        initiator_nft: vector<T1>,             // Bob's NFT (locked immediately)
        target: address,                        // Person being offered to (Alice)
        target_nft_id: ID,                     // ID of Alice's NFT that Bob wants
        target_nft: vector<T2>,                // Alice's NFT (locked when accepted)
        status: u8,                            // Current state of trade
        created_at: u64,                       // Timestamp when created
        expires_at: u64,                       // When this trade expires
    }

    /// One-Time-Witness for the module
    public struct TRADE has drop {}

    // ==================== Events ====================

    public struct TradeCreatedEvent has copy, drop {
        trade_id: ID,
        initiator: address,
        target: address,
        initiator_nft_id: ID,
        target_nft_id: ID,
        created_at: u64,
    }

    public struct TradeAcceptedEvent has copy, drop {
        trade_id: ID,
        target: address,
    }

    public struct TradeCompletedEvent has copy, drop {
        trade_id: ID,
        initiator: address,
        target: address,
    }

    public struct TradeCancelledEvent has copy, drop {
        trade_id: ID,
        cancelled_by: address,
    }

    public struct TradeRejectedEvent has copy, drop {
        trade_id: ID,
        rejected_by: address,
    }

    // ==================== Public Functions ====================

    /// Create a new trade request
    /// - Bob locks his NFT immediately
    /// - Specifies which of Alice's NFTs he wants
    /// - Trade expires in 7 days by default
    public fun create_trade<T1: key + store, T2: key + store>(
        initiator_nft: T1,
        target: address,
        target_nft_id: ID,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let initiator = tx_context::sender(ctx);
        
        // Can't trade with yourself
        assert!(initiator != target, E_CANNOT_TRADE_WITH_SELF);

        let initiator_nft_id = object::id(&initiator_nft);
        let current_time = clock::timestamp_ms(clock);
        let expires_at = current_time + (7 * 24 * 60 * 60 * 1000); // 7 days

        let trade_id = object::new(ctx);
        let trade_id_copy = object::uid_to_inner(&trade_id);

        let mut initiator_nft_vec = vector::empty<T1>();
        vector::push_back(&mut initiator_nft_vec, initiator_nft);

        let trade = TradeRequest<T1, T2> {
            id: trade_id,
            initiator,
            initiator_nft: initiator_nft_vec,
            target,
            target_nft_id,
            target_nft: vector::empty<T2>(),
            status: STATE_PENDING,
            created_at: current_time,
            expires_at,
        };

        // Emit event
        event::emit(TradeCreatedEvent {
            trade_id: trade_id_copy,
            initiator,
            target,
            initiator_nft_id,
            target_nft_id,
            created_at: current_time,
        });

        // Share the trade object so both parties can interact with it
        transfer::share_object(trade);
    }

    /// Target accepts the trade and locks their NFT
    /// - Alice locks her NFT
    /// - Trade moves to ACCEPTED state
    /// - Both NFTs now locked, ready for final confirmation
    public fun accept_trade<T1: key + store, T2: key + store>(
        trade: &mut TradeRequest<T1, T2>,
        target_nft: T2,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        // Only target can accept
        assert!(sender == trade.target, E_NOT_TARGET);
        
        // Must be in pending state
        assert!(trade.status == STATE_PENDING, E_INVALID_STATE);
        
        // Check if expired
        let current_time = clock::timestamp_ms(clock);
        assert!(current_time < trade.expires_at, E_TRADE_EXPIRED);
        
        // Verify this is the correct NFT
        assert!(object::id(&target_nft) == trade.target_nft_id, E_INVALID_STATE);
        
        // Target NFT must not already be locked
        assert!(vector::is_empty(&trade.target_nft), E_ALREADY_LOCKED);

        // Lock the target's NFT
        vector::push_back(&mut trade.target_nft, target_nft);
        
        // Update status
        trade.status = STATE_ACCEPTED;

        // Emit event
        event::emit(TradeAcceptedEvent {
            trade_id: object::uid_to_inner(&trade.id),
            target: sender,
        });
    }

    /// Complete the trade - execute the swap
    /// - Can be called by either party once both NFTs are locked
    /// - Swaps the NFTs atomically
    /// - Trade moves to COMPLETED state
    public fun complete_trade<T1: key + store, T2: key + store>(
        trade: &mut TradeRequest<T1, T2>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        // Only initiator or target can complete
        assert!(
            sender == trade.initiator || sender == trade.target, 
            E_NOT_INITIATOR
        );
        
        // Must be in accepted state
        assert!(trade.status == STATE_ACCEPTED, E_INVALID_STATE);
        
        // Check if expired
        let current_time = clock::timestamp_ms(clock);
        assert!(current_time < trade.expires_at, E_TRADE_EXPIRED);
        
        // Both NFTs must be locked
        assert!(!vector::is_empty(&trade.initiator_nft), E_NOT_LOCKED);
        assert!(!vector::is_empty(&trade.target_nft), E_NOT_LOCKED);

        // Extract both NFTs
        let initiator_nft = vector::pop_back(&mut trade.initiator_nft);
        let target_nft = vector::pop_back(&mut trade.target_nft);

        // Execute the swap!
        // Initiator gets target's NFT
        transfer::public_transfer(target_nft, trade.initiator);
        // Target gets initiator's NFT
        transfer::public_transfer(initiator_nft, trade.target);

        // Update status
        trade.status = STATE_COMPLETED;

        // Emit event
        event::emit(TradeCompletedEvent {
            trade_id: object::uid_to_inner(&trade.id),
            initiator: trade.initiator,
            target: trade.target,
        });
    }

    /// Cancel a pending trade
    /// - Initiator can cancel anytime before acceptance
    /// - Returns locked NFT to initiator
    public fun cancel_trade<T1: key + store, T2: key + store>(
        trade: &mut TradeRequest<T1, T2>,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        // Only initiator can cancel
        assert!(sender == trade.initiator, E_NOT_INITIATOR);
        
        // Can only cancel if pending
        assert!(trade.status == STATE_PENDING, E_INVALID_STATE);

        // Return initiator's NFT if locked
        if (!vector::is_empty(&trade.initiator_nft)) {
            let nft = vector::pop_back(&mut trade.initiator_nft);
            transfer::public_transfer(nft, trade.initiator);
        };

        // Update status
        trade.status = STATE_CANCELLED;

        // Emit event
        event::emit(TradeCancelledEvent {
            trade_id: object::uid_to_inner(&trade.id),
            cancelled_by: sender,
        });
    }

    /// Reject a trade offer
    /// - Target can reject the trade
    /// - Returns locked NFT to initiator
    public fun reject_trade<T1: key + store, T2: key + store>(
        trade: &mut TradeRequest<T1, T2>,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        // Only target can reject
        assert!(sender == trade.target, E_NOT_TARGET);
        
        // Can only reject if pending
        assert!(trade.status == STATE_PENDING, E_INVALID_STATE);

        // Return initiator's NFT
        if (!vector::is_empty(&trade.initiator_nft)) {
            let nft = vector::pop_back(&mut trade.initiator_nft);
            transfer::public_transfer(nft, trade.initiator);
        };

        // Update status
        trade.status = STATE_REJECTED;

        // Emit event
        event::emit(TradeRejectedEvent {
            trade_id: object::uid_to_inner(&trade.id),
            rejected_by: sender,
        });
    }

    /// Cancel an accepted trade (mutual cancellation)
    /// - Either party can cancel after acceptance but before completion
    /// - Returns both NFTs to original owners
    public fun cancel_accepted_trade<T1: key + store, T2: key + store>(
        trade: &mut TradeRequest<T1, T2>,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        
        // Only initiator or target can cancel
        assert!(
            sender == trade.initiator || sender == trade.target, 
            E_NOT_INITIATOR
        );
        
        // Can only cancel if accepted
        assert!(trade.status == STATE_ACCEPTED, E_INVALID_STATE);

        // Return both NFTs
        if (!vector::is_empty(&trade.initiator_nft)) {
            let nft = vector::pop_back(&mut trade.initiator_nft);
            transfer::public_transfer(nft, trade.initiator);
        };

        if (!vector::is_empty(&trade.target_nft)) {
            let nft = vector::pop_back(&mut trade.target_nft);
            transfer::public_transfer(nft, trade.target);
        };

        // Update status
        trade.status = STATE_CANCELLED;

        // Emit event
        event::emit(TradeCancelledEvent {
            trade_id: object::uid_to_inner(&trade.id),
            cancelled_by: sender,
        });
    }

    // ==================== View Functions ====================

    /// Get trade status
    public fun get_status<T1: key + store, T2: key + store>(
        trade: &TradeRequest<T1, T2>
    ): u8 {
        trade.status
    }

    /// Get initiator address
    public fun get_initiator<T1: key + store, T2: key + store>(
        trade: &TradeRequest<T1, T2>
    ): address {
        trade.initiator
    }

    /// Get target address
    public fun get_target<T1: key + store, T2: key + store>(
        trade: &TradeRequest<T1, T2>
    ): address {
        trade.target
    }

    /// Check if initiator NFT is locked
    public fun is_initiator_nft_locked<T1: key + store, T2: key + store>(
        trade: &TradeRequest<T1, T2>
    ): bool {
        !vector::is_empty(&trade.initiator_nft)
    }

    /// Check if target NFT is locked
    public fun is_target_nft_locked<T1: key + store, T2: key + store>(
        trade: &TradeRequest<T1, T2>
    ): bool {
        !vector::is_empty(&trade.target_nft)
    }

    /// Get expiration timestamp
    public fun get_expires_at<T1: key + store, T2: key + store>(
        trade: &TradeRequest<T1, T2>
    ): u64 {
        trade.expires_at
    }

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        // Test initialization if needed
    }
}