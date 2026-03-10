/**
 * walletHandler.ts
 * Routes for querying an agent's on-chain wallet state.
 */

import { Router, Request, Response } from 'express';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';
import { AsgardVault } from '../vault/AsgardVault';
import { requireNodeOrAgentAuth } from '../middleware/auth';
import { TOKEN_MINTS, getDecimals } from '../services/JupiterService';
import { eventBus } from '../eventBus';

const TRACKED_TOKENS = ['USDC', 'BONK'] as const;

export function createWalletRouter(vault: AsgardVault): Router {
    const router = Router();

    /**
     * GET /v1/wallet/:agentId/balance
     * Returns the SOL and SPL token balances for an agent's wallet.
     */
    router.get('/:agentId/balance', requireNodeOrAgentAuth, async (req: Request, res: Response) => {
        try {
            const { agentId } = req.params;
            const singleAgentId = Array.isArray(agentId) ? agentId[0] : (agentId || '');

            // If acting as an agent, verify they are only querying their own wallet
            if (req.agent && req.agent.agentId !== singleAgentId) {
                res.status(403).json({ error: 'Forbidden', message: 'Agents can only query their own wallet.' });
                return;
            }

            const connection = vault.getConnection();
            const publicKey = vault.getAgentPublicKey(singleAgentId);

            // Fetch native SOL balance
            const lamports = await connection.getBalance(publicKey);
            const solBalance = lamports / LAMPORTS_PER_SOL;

            // Fetch SPL token balances
            const tokenBalances: Record<string, number> = {};

            for (const ticker of TRACKED_TOKENS) {
                const mint = new PublicKey(TOKEN_MINTS[ticker]);
                try {
                    const ata = await getAssociatedTokenAddress(mint, publicKey);
                    const account = await getAccount(connection, ata);
                    const decimals = getDecimals(ticker);
                    tokenBalances[ticker] = Number(account.amount) / Math.pow(10, decimals);
                } catch {
                    // Associated token account doesn't exist yet — balance is 0
                    tokenBalances[ticker] = 0;
                }
            }

            res.json({
                agentId,
                address: publicKey.toBase58(),
                balances: {
                    SOL: solBalance,
                    ...tokenBalances,
                },
                timestamp: new Date().toISOString(),
            });

            eventBus.emitEvent('wallet:balance:queried', {
                agentId,
                address: publicKey.toBase58(),
                balances: { SOL: solBalance, ...tokenBalances },
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            res.status(500).json({ error: 'BalanceFetchFailed', message });
        }
    });

    /**
     * GET /v1/wallet/:agentId/history
     * Returns the recent transaction history for the agent's wallet.
     */
    router.get('/:agentId/history', requireNodeOrAgentAuth, async (req: Request, res: Response) => {
        try {
            const { agentId } = req.params;
            const singleAgentId = Array.isArray(agentId) ? agentId[0] : (agentId || '');
            const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

            if (req.agent && req.agent.agentId !== singleAgentId) {
                res.status(403).json({ error: 'Forbidden', message: 'Agents can only query their own wallet.' });
                return;
            }

            const connection = vault.getConnection();
            const publicKey = vault.getAgentPublicKey(singleAgentId);

            // Fetch the last 'limit' signatures for this address
            const signatures = await connection.getSignaturesForAddress(publicKey, { limit });

            // Fetch Parsed Transaction Metadata
            const parsedMeta = await connection.getParsedTransactions(
                signatures.map(s => s.signature),
                { maxSupportedTransactionVersion: 0 }
            );

            const history = signatures.map((sig, index) => {
                const parsed = parsedMeta[index];

                // Crude instruction extraction (look for common intents)
                let typeStr = 'Unknown';
                let instructionsCount = 0;

                if (parsed && parsed.transaction) {
                    const insts = parsed.transaction.message.instructions;
                    instructionsCount = insts.length;

                    // Simple guess: If it hits Jupiter it's a Swap, if it hits Token it's Transfer
                    const progIds = insts.map(i => i.programId.toBase58());
                    if (progIds.includes('JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4')) {
                        typeStr = 'Swap';
                    } else if (progIds.includes('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') || progIds.includes('11111111111111111111111111111111')) {
                        typeStr = 'Transfer / Execution';
                    }
                }

                return {
                    signature: sig.signature,
                    slot: sig.slot,
                    err: sig.err,
                    memo: sig.memo,
                    typeHint: typeStr,
                    instructionsCount,
                    fee: parsed?.meta?.fee || 0,
                    blockTime: sig.blockTime ? new Date(sig.blockTime * 1000).toISOString() : null,
                    explorerUrl: `https://explorer.solana.com/tx/${sig.signature}?cluster=${process.env.SOLANA_NETWORK || 'devnet'}`
                };
            });

            res.json({
                agentId,
                address: publicKey.toBase58(),
                history,
                timestamp: new Date().toISOString()
            });

            eventBus.emitEvent('wallet:history:queried', {
                agentId,
                address: publicKey.toBase58(),
                transactionCount: history.length,
            });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            res.status(500).json({ error: 'HistoryFetchFailed', message });
        }
    });

    return router;
}
