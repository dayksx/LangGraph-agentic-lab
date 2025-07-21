import { Plugin, PluginConfig } from './Plugin';
import { DynamicTool } from '@langchain/core/tools';
import { createPublicClient, createWalletClient, http, parseEther, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { lineaSepolia, mainnet } from 'viem/chains';
import { getEnsAddress } from 'viem/ens';
import { z } from 'zod';

// Address validation function
// Ethereum addresses are case-insensitive (0xABC = 0xabc)
// Must be 42 characters long (including 0x prefix)
// Must contain only hexadecimal characters (0-9, a-f, A-F)
const isValidEthereumAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
};

// Normalize address to lowercase for consistency
const normalizeAddress = (address: string): string => {
    return address.toLowerCase();
};

// Resolve ENS name to Ethereum address
const resolveEnsName = async (ensName: string, publicClient: any): Promise<string> => {
    try {
        // Check if it's already an Ethereum address
        if (isValidEthereumAddress(ensName)) {
            return normalizeAddress(ensName);
        }
        
        // Check if it looks like an ENS name (contains .eth)
        if (ensName.includes('.eth') || ensName.includes('.xyz') || ensName.includes('.crypto')) {
            console.log(`🔍 Resolving ENS name: ${ensName}`);
            
            // Create a mainnet client for ENS resolution
            const mainnetClient = createPublicClient({
                chain: mainnet,
                transport: http()
            });
            
            const resolvedAddress = await getEnsAddress(mainnetClient, {
                name: ensName
            });
            
            if (resolvedAddress) {
                console.log(`✅ Resolved ${ensName} to ${resolvedAddress}`);
                return normalizeAddress(resolvedAddress);
            } else {
                throw new Error(`Could not resolve ENS name: ${ensName}`);
            }
        }
        
        // If it's not an ENS name, assume it's an invalid address
        throw new Error(`Invalid address or ENS name: ${ensName}`);
    } catch (error: any) {
        console.error(`❌ Error resolving ENS name ${ensName}:`, error.message);
        throw new Error(`Failed to resolve ENS name "${ensName}": ${error.message}`);
    }
};

// ERC20 ABI with only the functions we need
const ERC20_ABI = [
    {
        name: 'transfer',
        type: 'function',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' }
        ],
        outputs: [{ type: 'bool' }]
    },
    {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ type: 'uint256' }]
    },
    {
        name: 'decimals',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ type: 'uint8' }]
    }
] as const;

export class ERC20Plugin implements Plugin {
    private publicClient;
    private walletClient;

    public config: PluginConfig = {
        name: 'erc20',
        description: 'Plugin for transferring ERC20 tokens on Linea Sepolia testnet',
        version: '1.0.0'
    };

    constructor() {
        // Initialize clients
        this.publicClient = createPublicClient({
            chain: lineaSepolia,
            transport: http(lineaSepolia.rpcUrls.default.http[0])
        });
        
        const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
        this.walletClient = createWalletClient({
            chain: lineaSepolia,
            account,
            transport: http(lineaSepolia.rpcUrls.default.http[0])
        });
    }

    public tools: DynamicTool[] = [
        new DynamicTool({
            name: "transfer_erc20",
            description: "Transfer ERC20 tokens to a specified address or ENS name on Linea Sepolia testnet. Input should be a JSON string with to and amount fields. Supports ENS names like 'vitalik.eth'.",
            func: async (input: string) => {
                try {
                    console.log("> input: ", input);
                    
                    // Handle undefined or null input
                    if (!input) {
                        throw new Error('Input is required. Please provide a JSON string with "to" and "amount" fields. Example: {"to": "vitalik.eth", "amount": "1"}');
                    }
                    
                    let parsedInput;
                    try {
                        parsedInput = JSON.parse(input);
                    } catch (parseError) {
                        throw new Error(`Invalid JSON input: ${input}. Please provide valid JSON with "to" and "amount" fields. Example: {"to": "vitalik.eth", "amount": "1"}`);
                    }
                    
                    const { to, amount } = parsedInput;
                    
                    if (!to || !amount) {
                        throw new Error('Both "to" and "amount" fields are required. Please provide a JSON string with both fields. Example: {"to": "vitalik.eth", "amount": "1"}');
                    }
                    const tokenAddress = process.env.CNS_TOKEN_ADDRESS;
                    
                    if (!tokenAddress) {
                        throw new Error('CNS_TOKEN_ADDRESS environment variable is not set');
                    }

                    // Resolve ENS name to Ethereum address if needed
                    const resolvedTo = await resolveEnsName(to, this.publicClient);

                    if (!isValidEthereumAddress(tokenAddress)) {
                        throw new Error('Invalid token address format. Address must be 42 characters long (including 0x prefix) and contain only hexadecimal characters.');
                    }

                    // Normalize token address to lowercase
                    const normalizedTokenAddress = normalizeAddress(tokenAddress);
                    
                    // Get token decimals
                    const decimals = await this.publicClient.readContract({
                        address: normalizedTokenAddress as `0x${string}`,
                        abi: ERC20_ABI,
                        functionName: 'decimals'
                    });
                    
                    // Convert amount to proper decimal places
                    const amountWithDecimals = parseEther(amount.toString());
                    
                    // Send transaction
                    const hash = await this.walletClient.writeContract({
                        chain: lineaSepolia,
                        address: normalizedTokenAddress as `0x${string}`,
                        abi: ERC20_ABI,
                        functionName: 'transfer',
                        args: [resolvedTo as `0x${string}`, amountWithDecimals]
                    });
                    
                    // Wait for transaction to be mined
                    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
                    
                    return `Transaction successful! Hash: https://sepolia.lineascan.build/tx/${receipt.transactionHash}`;
                } catch (error: any) {
                    console.log("> error: ", error);
                    return `Error transferring tokens: ${error.message}`;
                }
            }
        }),
        new DynamicTool({
            name: "get_erc20_balance",
            description: "Get ERC20 token balance for an address or ENS name on Linea Sepolia testnet. Input should be a JSON string with address field. Supports ENS names like 'vitalik.eth'.",
            func: async (input: string) => {
                try {
                    console.log("> input: ", input);
                    
                    // Handle undefined or null input
                    if (!input) {
                        throw new Error('Input is required. Please provide a JSON string with "address" field. Example: {"address": "vitalik.eth"}');
                    }
                    
                    let parsedInput;
                    try {
                        parsedInput = JSON.parse(input);
                    } catch (parseError) {
                        throw new Error(`Invalid JSON input: ${input}. Please provide valid JSON with "address" field. Example: {"address": "vitalik.eth"}`);
                    }
                    
                    const { address } = parsedInput;
                    
                    if (!address) {
                        throw new Error('Address field is required. Please provide a JSON string with "address" field. Example: {"address": "vitalik.eth"}');
                    }
                    const tokenAddress = process.env.CNS_TOKEN_ADDRESS;
                    
                    if (!tokenAddress) {
                        throw new Error('CNS_TOKEN_ADDRESS environment variable is not set');
                    }
                    
                    // Resolve ENS name to Ethereum address if needed
                    const resolvedAddress = await resolveEnsName(address, this.publicClient);

                    if (!isValidEthereumAddress(tokenAddress)) {
                        throw new Error('Invalid token address format. Address must be 42 characters long (including 0x prefix) and contain only hexadecimal characters.');
                    }

                    // Normalize token address to lowercase
                    const normalizedTokenAddress = normalizeAddress(tokenAddress);
                    
                    const balance = await this.publicClient.readContract({
                        address: normalizedTokenAddress as `0x${string}`,
                        abi: ERC20_ABI,
                        functionName: 'balanceOf',
                        args: [resolvedAddress as `0x${string}`],
                        account: resolvedAddress as `0x${string}`
                    });
                    
                    return `Balance: ${formatEther(balance)} tokens`;
                } catch (error: any) {
                    console.log("> error: ", error);
                    return `Error getting balance: ${error.message}`;
                }
            }
        })
    ];

    public async initialize(): Promise<void> {
        // Verify connection to Linea Sepolia network
        try {
            const chainId = await this.publicClient.getChainId();
            if (chainId !== lineaSepolia.id) {
                throw new Error(`Connected to wrong network. Expected Linea Sepolia (${lineaSepolia.id}), got ${chainId}`);
            }
        } catch (error: any) {
            throw new Error(`Failed to connect to Linea Sepolia network: ${error.message}`);
        }
    }

    public async cleanup(): Promise<void> {
        // No cleanup needed
    }
}