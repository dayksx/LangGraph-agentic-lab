import { Plugin, PluginConfig } from './Plugin';
import { DynamicTool } from '@langchain/core/tools';
import { createPublicClient, createWalletClient, http, parseEther, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { lineaSepolia } from 'viem/chains';
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
            description: "Transfer ERC20 tokens to a specified address on Linea Sepolia testnet. Input should be a JSON string with to and amount fields.",
            func: async (input: string) => {
                try {
                    console.log("> input: ", input);
                    const { to, amount } = JSON.parse(input);
                    const tokenAddress = process.env.CNS_TOKEN_ADDRESS;
                    
                    if (!tokenAddress) {
                        throw new Error('CNS_TOKEN_ADDRESS environment variable is not set');
                    }

                    if (!isValidEthereumAddress(to)) {
                        throw new Error('Invalid recipient address format. Address must be 42 characters long (including 0x prefix) and contain only hexadecimal characters.');
                    }

                    if (!isValidEthereumAddress(tokenAddress)) {
                        throw new Error('Invalid token address format. Address must be 42 characters long (including 0x prefix) and contain only hexadecimal characters.');
                    }

                    // Normalize addresses to lowercase
                    const normalizedTo = normalizeAddress(to);
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
                        args: [normalizedTo as `0x${string}`, amountWithDecimals]
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
            description: "Get ERC20 token balance for an address on Linea Sepolia testnet. Input should be a JSON string with address field.",
            func: async (input: string) => {
                try {
                    console.log("> input: ", input);
                    const { address } = JSON.parse(input);
                    const tokenAddress = process.env.CNS_TOKEN_ADDRESS;
                    
                    if (!tokenAddress) {
                        throw new Error('CNS_TOKEN_ADDRESS environment variable is not set');
                    }
                    
                    if (!isValidEthereumAddress(address)) {
                        throw new Error('Invalid address format. Address must be 42 characters long (including 0x prefix) and contain only hexadecimal characters.');
                    }

                    if (!isValidEthereumAddress(tokenAddress)) {
                        throw new Error('Invalid token address format. Address must be 42 characters long (including 0x prefix) and contain only hexadecimal characters.');
                    }

                    // Normalize addresses to lowercase
                    const normalizedAddress = normalizeAddress(address);
                    const normalizedTokenAddress = normalizeAddress(tokenAddress);
                    
                    const balance = await this.publicClient.readContract({
                        address: normalizedTokenAddress as `0x${string}`,
                        abi: ERC20_ABI,
                        functionName: 'balanceOf',
                        args: [normalizedAddress as `0x${string}`],
                        account: normalizedAddress as `0x${string}`
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