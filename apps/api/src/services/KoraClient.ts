import axios from 'axios';
import crypto from 'crypto';

interface JsonRpcRequest {
    jsonrpc: string;
    id: number;
    method: string;
    params?: any[];
}

interface JsonRpcResponse<T> {
    jsonrpc: string;
    id: number;
    result?: T;
    error?: {
        code: number;
        message: string;
        data?: any;
    };
}

/**
 * Client for interacting with the external Kora Paymaster JSON-RPC server.
 * This completely isolates private keys from the API process.
 */
export class KoraClient {
    private readonly rpcUrl: string;
    private readonly hmacSecret: string;

    constructor() {
        this.rpcUrl = process.env.KORA_RPC_URL || 'http://localhost:8080';
        this.hmacSecret = process.env.KORA_HMAC_SECRET || 'kora_hmac_your-minimum-32-character-secret-here';
    }

    private createHmacHeader(body: string, timestamp: number): string {
        const payload = `${timestamp}:${body}`;
        return crypto.createHmac('sha256', this.hmacSecret).update(payload).digest('hex');
    }

    private async call<T>(method: string, params?: any[]): Promise<T> {
        const requestBody: JsonRpcRequest = {
            jsonrpc: '2.0',
            id: Date.now(),
            method,
            params,
        };

        const bodyStr = JSON.stringify(requestBody);
        const timestamp = Math.floor(Date.now() / 1000);

        try {
            const response = await axios.post<JsonRpcResponse<T>>(
                this.rpcUrl,
                bodyStr,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'x-kora-timestamp': timestamp.toString(),
                        'x-kora-signature': this.createHmacHeader(bodyStr, timestamp)
                    }
                }
            );

            if (response.data.error) {
                throw new Error(`Kora RPC Error [${response.data.error.code}]: ${response.data.error.message}`);
            }

            return response.data.result as T;
        } catch (error: any) {
            console.error('[KoraClient] Failed to reach Kora JSON-RPC:', error.message);
            throw new Error(`Gas abstraction failed: ${error.message}`);
        }
    }

    /**
     * Gets the public key of the Kora Sponsor node to use as the feePayer.
     */
    public async getPayerSigner(): Promise<string> {
        return this.call<string>('getPayerSigner');
    }

    /**
     * Sends the agent-signed transaction to Kora for validation, co-signing, and network broadcasting.
     * @param transactionBase64 The base64 serialized transaction String.
     * @returns The Solana network signature string.
     */
    public async signAndSendTransaction(transactionBase64: string): Promise<string> {
        return this.call<string>('signAndSendTransaction', [transactionBase64]);
    }
}

export const koraClient = new KoraClient();
