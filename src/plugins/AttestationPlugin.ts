import { Plugin, PluginConfig } from './Plugin';
import { DynamicTool } from '@langchain/core/tools';
import { z } from 'zod';

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
            description: "Issue an attestation for a subject using Verax on Linea Sepolia testnet. Input should be a JSON string with subject, scope, and isTrustworthy fields.",
            func: async (input: string) => {
                try {
                    console.log("> input: ", input);
                    const { subject, scope, isTrustworthy } = JSON.parse(input);
                    const schemaId = process.env.CNS_VERAX_SCHEMA_ID as `0x${string}`;
                    const portalAddress = process.env.PORTAL_ADDRESS as `0x${string}`;

                    if (!schemaId) {
                        throw new Error('CNS_VERAX_SCHEMA_ID environment variable is not set');
                    }

                    if (!portalAddress) {
                        throw new Error('PORTAL_ADDRESS environment variable is not set');
                    }

                    if (!isValidEthereumAddress(subject)) {
                        throw new Error('Invalid subject address format. Address must be 42 characters long (including 0x prefix) and contain only hexadecimal characters.');
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
        // Initialize Verax SDK using require for CommonJS module
        const { VeraxSdk } = await import('@verax-attestation-registry/verax-sdk');
        this.veraxSdk = new VeraxSdk(
            VeraxSdk.DEFAULT_LINEA_SEPOLIA,
            undefined,
            process.env.EVM_PRIVATE_KEY as `0x${string}`
        );
    }

    public async cleanup(): Promise<void> {
        // No cleanup needed
    }
}
