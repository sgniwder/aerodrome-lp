---
name: aerodrome-lp
description: LP standard crypto tokens and stablecoins on Aerodrome (Base) — supports both Basic (vAMM volatile & sAMM stable) and Concentrated Liquidity (Slipstream CL) pools. Use when the user wants to LP standard pairs (WETH/USDC, AERO/USDC, cbBTC/USDC, USD+/USDC, etc.), manage or recenter positions, check yields/P&L, and auto-route staking in gauges vs holding for fee yield.
---

# aerodrome-lp — Standard Aerodrome Liquidity Provision (Base)

Concentrated & basic liquidity market making on Aerodrome Finance (Base, chain 8453).
Provides full lifecycle management for both **Basic Pools (vAMM volatile & sAMM stable)** and **Concentrated Liquidity (Slipstream CL)** pools across standard token pairs.

## Division of Labor & Operating Model
- **Deterministic Scripts**: The bundled `scripts/` (plain node >= 18, zero dependencies) handle chain reads (batched via Multicall3), pool discovery, reserve sizing, tick/band math, calldata construction, honest valuation, and net P&L calculations.
- **Agent Judgment**: Choosing the pool/tokens, sizing deposit amounts, fetching live spot quotes, setting band widths, and obtaining user confirmation before executing on-chain transactions.
- **Non-Custodial**: Scripts emit unsigned `{to, data, value, chainId}` transaction objects executed sequentially via Bankr arbitrary transaction flow.

---

## 1. Pool Architectures Supported

### Basic Pools (v2)
- **vAMM (Volatile)**: Constant product formula (x * y = k) for standard pairs (e.g. WETH/USDC, AERO/USDC).
- **sAMM (Stable)**: Stable-swap invariant (x^3 * y + y^3 * x = k) for pegged assets (e.g. USDC/USD+, USDC/DAI).
- **Canonical Factory**: `0x420DD381b31aEf6683db6B902084cB0FFECe40Da`
- **Canonical Router**: `0xcF77a3Ba9A5CA399B7c97c7488454543B869415F`
- **Position Asset**: Standard ERC-20 LP tokens.

### Concentrated Liquidity (Slipstream CL)
- **Uni v3 Concentrated Math**: Custom price ranges within defined tick bounds [tickLower, tickUpper] at standard tick spacings (1, 10, 50, 100, 200).
- **Canonical CL Factory**: `0x5e7BB104d84c7CB9B682AaC2F3d509f5F406809A`
- **NonfungiblePositionManager (NPM)**: `0x827922686190790b37229fd06084350E74485b72`
- **Position Asset**: ERC-721 NFT positions.

### Gauge Routing
- **Voter Contract**: `0x16613524e02ad97eDfeF371bC883F2F5d6C480A5`
- Compares trading fee yields vs active AERO emission rates and auto-routes positions into Aerodrome Gauges when staking yields higher net return.

---

## 2. Scripts Reference

Every script outputs a single JSON object to stdout: `{ok, txs[], report, next}`.

| Command | Description |
|---|---|
| `node scripts/entry.mjs plan --token0 WETH --token1 USDC --type cl --usd 50 --wallet 0x...` | Validates pool existence, checks balance/allowances, computes price band, sizes initial token split, and outputs confirmation line. |
| `node scripts/entry.mjs plan --token0 USDC --token1 USD+ --type basic --stable true --usd 50 --wallet 0x...` | Plans 50/50 liquidity entry for basic stable/volatile pools. |
| `node scripts/entry.mjs size --type <cl|basic> --pool 0x... --usd 50 --wallet 0x... [--tick-lower ... --tick-upper ...]` | Sizes mint / addLiquidity calldata at live pool reserves. |
| `node scripts/entry.mjs settle --type <cl|basic> --pool 0x... --wallet 0x... --mint-tx 0x... --entry-usd 50` | Extracts tokenId/LP amount from receipt, evaluates gauge staking, builds stake txs, and records basis to state. |
| `node scripts/manage.mjs --wallet 0x...` | Discovers active Basic & CL positions from chain, checks in-range status, computes honest valuation (principal + unclaimed fees + AERO emissions), and calculates net P&L. |
| `node scripts/exit.mjs begin --type <cl|basic> --pool 0x... [--token-id N] --wallet 0x...` | Phase 1 exit: unstakes from gauge (harvesting AERO) and removes liquidity / collects pool tokens into wallet. |
| `node scripts/exit.mjs finish --type <cl|basic> --pool 0x... [--token-id N] --wallet 0x...` | Phase 2 exit: swaps residual tokens to target token (e.g. USDC), burns empty CL NFT, and cleans local state. |
| `node scripts/exit.mjs sell-aero --wallet 0x...` | Swaps harvested AERO rewards to USDC for auto-compounding. |
| `node scripts/selftest.mjs [--live]` | Offline math/encoding test vectors + live Base mainnet contract & pool resolution verification. |

---

## 3. Persistent State & Recovery

- **State File**: `~/.aerodrome-lp/state.json` caches entry basis (`entryUsd`, `enteredAt`) and position settings.
- **On-Chain Recovery**: If local state is cleared, `manage.mjs` recovers all active LP tokens and Slipstream NFTs directly from on-chain voter and factory registries.
