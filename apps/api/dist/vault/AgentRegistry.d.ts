/**
 * AgentRegistry.ts
 * Persists agent metadata (API keys, policy profiles, public keys) separately
 * from the encrypted keystore. This is NOT sensitive — it contains no private keys.
 */
import type { PolicyProfile } from '../policy/PolicyEngine';
export interface AgentRecord {
    agentId: string;
    name: string;
    publicKey: string;
    apiKeyHash: string;
    policyProfile: string;
    customPolicy?: Partial<PolicyProfile>;
    createdAt: string;
    active: boolean;
}
/**
 * Hashes an API key for safe storage. We never store the plaintext key.
 */
export declare function hashApiKey(apiKey: string): string;
/**
 * Registers a new agent in the registry.
 */
export declare function registerAgent(agentId: string, name: string, publicKey: string, apiKey: string, policyProfile: string, customPolicy?: Partial<PolicyProfile>): void;
/**
 * Looks up an agent by their raw API key (hashed for comparison).
 * Returns null if no agent matches.
 */
export declare function findAgentByApiKey(apiKey: string): AgentRecord | null;
/**
 * Looks up an agent record directly by Agent ID.
 */
export declare function getAgentById(agentId: string): AgentRecord | null;
/**
 * Updates an agent's custom policy overrides.
 */
export declare function updateAgentPolicy(agentId: string, customPolicy: Partial<PolicyProfile>): boolean;
/**
 * Lists all registered agents (for admin/monitoring endpoints).
 */
export declare function listAgents(): AgentRecord[];
