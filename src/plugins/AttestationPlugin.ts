import { Plugin, PluginConfig } from './Plugin';
import { DynamicTool } from '@langchain/core/tools';
import { z } from 'zod';
import { privateKeyToAccount } from 'viem/accounts';

// Address validation function
const isValidEthereumAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
};

// Normalize address to lowercase for consistency
const normalizeAddress = (address: string): string => {
    return address.toLowerCase();
};

export class AttestationPlugin implements Plugin {
    private veraxSdk: any; // We'll type this properly after dynamic import

    public config: PluginConfig = {
        name: 'attestation',
        description: 'Plugin for issuing attestations using Verax on Linea Sepolia testnet',
        version: '1.0.0'
    };

    constructor() {
        // Initialize Verax SDK will be done in initialize()
    }

    public tools: DynamicTool[] = [
        new DynamicTool({
            name: "issue_attestation",
            description: "Issue an attestation for a subject using onchain attestation service. Input should be a claim about a specific subject identified by an Ethereum address",
            func: async (input: string) => {
                try {
                    console.log("> input: ", input);
                    
                    // Parse plain text input
                    const parts = input.trim().split(/\s+/);
                    if (parts.length < 3) {
                        throw new Error('Input must contain at least 3 parts: subject_address scope isTrustworthy. Example: "0x1234...abcd ENS true: '+ parts.join(' '));
                    }
                    
                    const subject = parts[0];
                    const isTrustworthy = parts[parts.length - 1]; // Last part is isTrustworthy
                    const scope = parts.slice(1, -1).join(' '); // Everything in between is scope
                    
                    console.log("> subject address: ", subject);
                    console.log("> subject length: ", subject.length);
                    console.log("> subject format check: ", /^0x[a-fA-F0-9]{40}$/.test(subject));
                    
                    const schemaId = process.env.CNS_VERAX_SCHEMA_ID as `0x${string}`;
                    const portalAddress = process.env.CNS_VERAX_PORTAL_ID as `0x${string}`;

                    if (!schemaId) {
                        throw new Error('CNS_VERAX_SCHEMA_ID environment variable is not set');
                    }

                    if (!portalAddress) {
                        throw new Error('PORTAL_ADDRESS environment variable is not set');
                    }

                    if (!isValidEthereumAddress(subject)) {
                        throw new Error(`Invalid subject address format: "${subject}". Address must be 42 characters long (including 0x prefix) and contain only hexadecimal characters (0-9, a-f, A-F). Current length: ${subject.length}`);
                    }

                    // Normalize subject address
                    const normalizedSubject = normalizeAddress(subject);
                    
                    // Convert isTrustworthy to boolean if it's a string
                    const isTrustworthyBool = typeof isTrustworthy === 'string' 
                        ? isTrustworthy.toLowerCase() === 'true'
                        : Boolean(isTrustworthy);

                    // Issue attestation
                    const receipt = await this.veraxSdk.portal.attest(
                        portalAddress,
                        {
                            schemaId,
                            expirationDate: 0, // No expiration
                            subject: normalizedSubject,
                            attestationData: [{
                                scope,
                                isTrustworthy: isTrustworthyBool,
                            }],
                        },
                        [],
                        {}
                    );

                    if (receipt.transactionHash) {
                        return `✅ Attestation successfully registered on-chain: https://sepolia.lineascan.build/tx/${receipt.transactionHash}\nExplorer: https://explorer.ver.ax/linea-sepolia/portals/${portalAddress}`;
                    } else {
                        throw new Error('Failed to get transaction hash from receipt');
                    }
                } catch (error: any) {
                    console.log("> error: ", error);
                    return `Error issuing attestation: ${error.message}`;
                }
            }
        })
    ];

    public async initialize(): Promise<void> {
        // Initialize Verax SDK using createRequire to handle CommonJS/ESM conflict
        try {
            const { createRequire } = await import('module');
            const require = createRequire(import.meta.url);
            const { VeraxSdk } = require('@verax-attestation-registry/verax-sdk');
            
            const privateKey = process.env.PRIVATE_KEY as `0x${string}`;
            if (!privateKey) {
                throw new Error('PRIVATE_KEY environment variable is not set');
            }

            // Create account using viem for debugging
            const account = privateKeyToAccount(privateKey);
            console.log("> Account address: ", account.address);

            this.veraxSdk = new VeraxSdk(
                VeraxSdk.DEFAULT_LINEA_SEPOLIA,
                undefined,
                privateKey
            );
        } catch (error) {
            console.error('Failed to initialize Verax SDK:', error);
            throw error;
        }
    }

    public async cleanup(): Promise<void> {
        // No cleanup needed
    }
}
