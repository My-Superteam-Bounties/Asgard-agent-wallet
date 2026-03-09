---
description: How to interact with the Asgard Secure Agentic Wallet using the x-wallet CLI
---

# Asgard Wallet Interaction Protocol (`SKILLS.md`)

You are an Autonomous AI Agent operating on the Solana blockchain.
Your environment has been equipped with the `x-wallet` CLI tool, which serves as your secure, programmatic gateway to hold funds, check balances, and execute on-chain transactions like transfers and token swaps.

**CRITICAL SECURITY PROTOCOL:** 
You do not, and will never, have direct access to your private cryptographic keys. All transactions must be formatted into an intent via `x-wallet` and submitted to the local Asgard Daemon, which evaluates your spend policy and signs the transaction in a secure computing enclave on your behalf.

Here is exactly how you read state and execute actions on Solana.

---

## 1. Provisioning a Wallet (First Run Only)

If you do not already have an `Agent ID` and `API Key` stored in your memory context, you must provision a wallet before attempting any on-chain actions.

**Command:**
```bash
x-wallet provision --name "Your-Agent-Name-Here"
```

**Expected JSON Response:**
```json
{
  "status": "success",
  "message": "Wallet provisioned successfully.",
  "agentId": "uuid-v4-string",
  "apiKey": "solana-base58-secret",
  "walletAddress": "YourPublicSolanaAddressHere"
}
```
**Action:** Store `agentId` and `apiKey` securely in your memory. You MUST provide them for every subsequent command via the `--agent-id` and `--api-key` flags.

---

## 2. Checking Balances

To verify your holding of SOL or SPL tokens (like USDC) before attempting to trade, use the balance command.

**Command:**
```bash
x-wallet balance --agent-id <YOUR_AGENT_ID> --api-key <YOUR_API_KEY>
```

**Expected JSON Response:**
```json
{
  "status": "success",
  "balances": {
    "SOL": 1.52,
    "USDC": 150.00,
    "SEND": 0
  }
}
```
*Note: The Asgard demon automatically checks your SPL token accounts. If a token is zero, it may not appear in the key-value dictionary.*

---

## 3. Transferring Funds

Use this command to send SOL or SPL tokens to another entity or sub-agent.

**Command:**
```bash
x-wallet transfer \
  --agent-id <YOUR_AGENT_ID> \
  --api-key <YOUR_API_KEY> \
  --token <SOL_OR_USDC> \
  --amount <NUMERIC_AMOUNT> \
  --destination <SOLANA_BASE58_ADDRESS>
```

**Expected JSON Response:**
```json
{
  "status": "success",
  "signature": "5Xyq... transaction signature string ... zL29"
}
```
*Note: Asgard utilizes Kora gas-abstraction. Even if your SOL balance is exactly 0, Asgard will successfully execute USDC transfers by sponsoring the network fee on your behalf.*

---

## 4. Executing Trades (Jupiter Swaps)

To autonomously rebalance a portfolio or react to on-chain sentiment, use the swap tool. Asgard natively integrates with Jupiter Aggregator.

**Command:**
```bash
x-wallet swap \
  --agent-id <YOUR_AGENT_ID> \
  --api-key <YOUR_API_KEY> \
  --in <INPUT_TOKEN_TICKER> \
  --out <OUTPUT_TOKEN_TICKER> \
  --amount <NUMERIC_AMOUNT> \
  --slippage <BPS_SLIPPAGE>
```
*(Example: `--in USDC --out SOL -a 50 --slippage 100` converts 50 USDC into SOL with a maximum of 1% slippage).*

**Expected JSON Response:**
```json
{
  "status": "success",
  "signature": "3KzQ... transaction signature string ... mN77"
}
```

---

## Error Handling

If the local Asgard Daemon rejects your transaction (e.g., spending policy violation, invalid address, or insufficient liquidity), `x-wallet` will return a non-zero exit code and an error JSON payload.

```json
{
  "status": "error",
  "message": "Policy Violation: Transaction exceeds max spend limit of 10 USDC per hour."
}
```
**AI Action:** Parse the `message` field, log the failure internally, and adjust your trading strategy accordingly. Do not attempt to retry identical violating transactions.
