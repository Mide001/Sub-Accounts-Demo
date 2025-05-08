"use client";

import { useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import TicTacToe from "@/components/TicTacToe";

function App() {
  const account = useAccount();
  const { connectors, connect, status, error } = useConnect();
  const { disconnect } = useDisconnect();
  const [lastTransactionHash, setLastTransactionHash] = useState<string | null>(null);

  const formatAddresses = (addresses: any) => {
    if (!addresses)
      return <div className="text-gray-500 italic">No addresses available</div>;

    if (typeof addresses === "string")
      return (
        <div className="bg-[#2a2a2a] p-3 rounded">
          <div className="font-mono text-sm text-gray-300 break-all">
            {addresses}
          </div>
        </div>
      );

    return (
      <div className="space-y-3">
        {Object.entries(addresses).map(([chainId, address]) => (
          <div key={chainId} className="bg-[#2a2a2a] p-3 rounded">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Chain {chainId}
              </span>
              <div className="h-px flex-1 bg-gray-700"></div>
            </div>
            <div className="font-mono text-sm text-gray-300 break-all">
              {address as string}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#181818] dark:bg-[#181818] light:bg-[#f8f8f8] p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-[#1a1a1a] dark:bg-[#1a1a1a] light:bg-white rounded-lg p-6 shadow-sm border border-[#2a2a2a]">
          <h2 className="text-xl font-medium text-white dark:text-white light:text-[#181818] mb-4">
            Account
          </h2>

          <div className="space-y-4 text-white dark:text-white light:text-[#181818]">
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Status:</span>
              <span
                className={`px-2 py-1 rounded text-sm ${
                  account.status === "connected"
                    ? "text-gray-200"
                    : "text-gray-500"
                }`}
              >
                {account.status}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Sub Account Addresses</span>
                <div className="h-px flex-1 bg-gray-700"></div>
              </div>
              <div className="pl-2">{formatAddresses(account.addresses)}</div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-gray-400">ChainId:</span>
              <span className="font-mono text-sm text-gray-300">
                {account.chainId}
              </span>
            </div>
          </div>

          {account.status === "connected" ? (
            <button
              type="button"
              onClick={() => disconnect()}
              className="mt-4 px-4 py-2 bg-[#2a2a2a] hover:bg-[#333333] text-gray-300 rounded transition-colors duration-200"
            >
              Disconnect
            </button>
          ) : (
            <div className="mt-4">
              {connectors
                .filter((connector) => connector.name === "Coinbase Wallet")
                .map((connector) => (
                  <button
                    key={connector.uid}
                    onClick={() => connect({ connector })}
                    type="button"
                    className="w-full px-4 py-2.5 bg-[#2a2a2a] hover:bg-[#333333] text-gray-300 rounded transition-colors duration-200"
                  >
                    Log In
                  </button>
                ))}
              {error && (
                <div className="mt-2 text-sm text-gray-400 bg-[#2a2a2a] p-2 rounded">
                  {error.message}
                </div>
              )}
            </div>
          )}
        </div>

        {lastTransactionHash && (
          <div className="bg-[#1a1a1a] dark:bg-[#1a1a1a] light:bg-white rounded-lg p-6 shadow-sm border border-[#2a2a2a]">
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-green-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="text-gray-300 font-medium">
                  Last round saved to blockchain
                </p>
              </div>
              <a
                href={`https://base-sepolia.easscan.org/attestation/view/${lastTransactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-sm inline-flex items-center gap-1 bg-[#2a2a2a] px-4 py-2 rounded"
              >
                View on blockchain
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>
            </div>
          </div>
        )}

        <div className="mt-8 w-full">
          <TicTacToe onTransactionComplete={setLastTransactionHash} />
        </div>
      </div>
    </div>
  );
}

export default App;
