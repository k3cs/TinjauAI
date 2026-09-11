// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/// @notice ChainInfo precompile at 0x…0fd3. Selectors are snake_case (ABI from @gluwa/usc-sdk
/// 0.18.0 `dist/chain-info/chain_info.json`; `get_latest_attestation_height_and_hash` checked
/// live on CC3 testnet 11 Sep 2026).
interface IChainInfo {
    struct HeightHashResult {
        uint64 height;
        bytes32 hash;
        bool isAttestation;
        bool exists;
    }

    function get_latest_attestation_height_and_hash(uint64 chainKey)
        external
        view
        returns (HeightHashResult memory result);
}

/// @notice AttestorStash precompile at 0x…0fd4. Not in the public docs or SDK; selectors are
/// camelCase. Checked live on CC3 testnet 11 Sep 2026: chainKey 1 → 7 attestors, chainKey 3 → 4,
/// unknown chainKey → 0; min bond 100 CTC.
interface IAttestorStash {
    function getAttestorsCount(uint64 chainKey) external view returns (uint256 count);

    function getMinBondRequirement(uint64 chainKey) external view returns (uint256 bond);
}

library Precompiles {
    address internal constant BLOCK_PROVER = 0x0000000000000000000000000000000000000FD2;
    address internal constant CHAIN_INFO = 0x0000000000000000000000000000000000000fD3;
    address internal constant ATTESTOR_STASH = 0x0000000000000000000000000000000000000fd4;
}
