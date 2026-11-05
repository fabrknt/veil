/// ZK proof verification module for DarkFlow.
///
/// In development mode (`dev` feature), proofs are verified using blake3 hash
/// commitments — fast but NOT zero-knowledge.
///
/// In production mode (default), proofs are verified using SHA-256 based
/// commitments matching the Noir circuits in `circuits/`. When the Noir
/// toolchain is available, these will be replaced with Groth16/UltraPlonk
/// verification using the Solana `alt_bn128` precompile.
///
/// Circuit specifications:
///   - `circuits/swap/`      — dark swap validity proof
///   - `circuits/execution/` — order execution correctness proof
///   - `circuits/position/`  — LP position ownership proof
///
/// TRUSTED-SOLVER GATE: none of the checks below verify a zero-knowledge
/// proof. Each one recomputes a hash of public inputs, which anyone can do.
/// Until a real verifier is added, the instructions that take these proofs
/// also require a signature from `DarkPool::solver` (execute_dark_order,
/// dark_swap) or from the position owner (remove_liquidity_private). The proof
/// checks are kept as-is so the interface does not change when the real
/// verifier replaces them.

/// Verify a dark swap ZK proof.
///
/// The proof demonstrates:
/// 1. The user has sufficient balance for the swap
/// 2. The swap amount matches the encrypted order
/// 3. The nullifier is correctly derived (prevents replay)
///
/// Proof layout: 32 bytes verification hash
/// In production: Noir proof bytes (variable length, verified via Groth16)
pub fn verify_swap_proof(proof: &[u8], encrypted_order: &[u8], nullifier: &[u8; 32]) -> bool {
    if proof.len() < 32 {
        return false;
    }

    #[cfg(feature = "dev")]
    {
        // Dev mode: blake3 commitment check (NOT zero-knowledge)
        let mut input = Vec::with_capacity(encrypted_order.len() + 32 + 13);
        input.extend_from_slice(encrypted_order);
        input.extend_from_slice(nullifier);
        input.extend_from_slice(b"darkflow_swap");
        let expected = blake3::hash(&input);
        return proof[..32] == *expected.as_bytes();
    }

    #[cfg(not(feature = "dev"))]
    {
        // Production: SHA-256 commitment matching Noir circuit public inputs.
        // The proof must contain SHA-256(encrypted_order || nullifier || "darkflow_swap")
        // which matches the Noir circuit's encrypted_order_hash public input.
        use anchor_lang::solana_program::hash::hash;
        let mut input = Vec::with_capacity(encrypted_order.len() + 32 + 13);
        input.extend_from_slice(encrypted_order);
        input.extend_from_slice(nullifier);
        input.extend_from_slice(b"darkflow_swap");
        let expected = hash(&input);
        proof[..32] == expected.to_bytes()
    }
}

/// Verify a dark order execution proof.
///
/// The proof demonstrates:
/// 1. The solver correctly decrypted the order commitment
/// 2. The output amount meets the user's minimum
/// 3. The execution is faithful to the original order
///
/// Proof layout: 32 bytes verification hash
/// In production: Noir proof bytes (variable length, verified via Groth16)
pub fn verify_execution_proof(proof: &[u8], commitment: &[u8; 32]) -> bool {
    if proof.len() < 32 {
        return false;
    }

    #[cfg(feature = "dev")]
    {
        // Dev mode: blake3 commitment check
        let mut input = [0u8; 50];
        input[..32].copy_from_slice(commitment);
        input[32..50].copy_from_slice(b"darkflow_execution");
        let expected = blake3::hash(&input);
        return proof[..32] == *expected.as_bytes();
    }

    #[cfg(not(feature = "dev"))]
    {
        // Production: SHA-256 commitment matching Noir circuit
        use anchor_lang::solana_program::hash::hash;
        let mut input = [0u8; 50];
        input[..32].copy_from_slice(commitment);
        input[32..50].copy_from_slice(b"darkflow_execution");
        let expected = hash(&input);
        proof[..32] == expected.to_bytes()
    }
}

/// Verify a position ownership proof.
///
/// The proof demonstrates:
/// 1. The caller owns the position identified by the commitment
/// 2. The position has non-zero value
/// 3. The commitment was correctly constructed
///
/// Proof layout: 32 bytes verification hash
/// In production: Noir proof bytes (variable length, verified via Groth16)
pub fn verify_position_proof(proof: &[u8], commitment: &[u8; 32]) -> bool {
    if proof.len() < 32 {
        return false;
    }

    #[cfg(feature = "dev")]
    {
        // Dev mode: blake3 commitment check
        let mut input = [0u8; 50];
        input[..32].copy_from_slice(commitment);
        input[32..50].copy_from_slice(b"darkflow_position");
        let expected = blake3::hash(&input);
        return proof[..32] == *expected.as_bytes();
    }

    #[cfg(not(feature = "dev"))]
    {
        // Production: SHA-256 commitment matching Noir circuit
        use anchor_lang::solana_program::hash::hash;
        let mut input = [0u8; 50];
        input[..32].copy_from_slice(commitment);
        input[32..50].copy_from_slice(b"darkflow_position");
        let expected = hash(&input);
        proof[..32] == expected.to_bytes()
    }
}
