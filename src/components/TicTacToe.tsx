"use client";

import { useState, useCallback, useEffect } from "react";
import {
  useAccount,
  usePublicClient,
  useWalletClient,
  useConnect,
} from "wagmi";
import { EAS, SchemaEncoder } from "@ethereum-attestation-service/eas-sdk";
import { BrowserProvider } from "ethers";
import Leaderboard from "./Leaderboard";

type Player = "X" | "O" | null;

interface TicTacToeProps {
  onTransactionComplete?: (hash: string) => void;
}

const TicTacToe = ({ onTransactionComplete }: TicTacToeProps) => {
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [board, setBoard] = useState<Player[]>(Array(9).fill(null));
  const [isPlayerX, setIsPlayerX] = useState(true);
  const [isAITurn, setIsAITurn] = useState(false);
  const [gameResult, setGameResult] = useState<string | null>(null);
  const [winningLine, setWinningLine] = useState<number[] | null>(null);
  const [isSavingStats, setIsSavingStats] = useState(false);
  const [transactionError, setTransactionError] = useState<string | null>(null);

  const EAS_CONTRACT = "0x4200000000000000000000000000000000000021";
  const SCHEMA_UID =
    "0x31876b77368248bfab65f0ce7c5d5f74109b2491ac018c2424083e017cf6d52c";

  const startNewGame = useCallback(() => {
    setBoard(Array(9).fill(null));
    setIsAITurn(false);
    setGameResult(null);
    setWinningLine(null);
    setTransactionError(null);
  }, []);

  const saveGameStats = useCallback(
    async (gameResult: string) => {
      if (!address || !walletClient) {
        setTransactionError("Wallet not connected");
        return false;
      }

      try {
        setIsSavingStats(true);
        setTransactionError(null);

        const eas = new EAS(EAS_CONTRACT);
        const provider = new BrowserProvider(walletClient as any);
        const signer = await provider.getSigner();
        await eas.connect(signer);

        const schemaEncoder = new SchemaEncoder(
          "address player,uint256 totalWins,uint256 totalLosses,uint256 totalDraws,uint256 totalGames,uint256 timestamp,string gameId"
        );

        const encodedData = schemaEncoder.encodeData([
          { name: "player", value: address, type: "address" },
          {
            name: "totalWins",
            value: gameResult === "Player Won!" ? "1" : "0",
            type: "uint256",
          },
          {
            name: "totalLosses",
            value: gameResult === "AI Won!" ? "1" : "0",
            type: "uint256",
          },
          {
            name: "totalDraws",
            value: gameResult === "It's a Draw!" ? "1" : "0",
            type: "uint256",
          },
          { name: "totalGames", value: "1", type: "uint256" },
          {
            name: "timestamp",
            value: Math.floor(Date.now() / 1000).toString(),
            type: "uint256",
          },
          { name: "gameId", value: `tictactoe-${Date.now()}`, type: "string" },
        ]);

        const tx = await eas.attest({
          schema: SCHEMA_UID,
          data: {
            recipient: address,
            expirationTime: BigInt(0),
            revocable: false,
            data: encodedData,
          },
        });

        const newAttestationUID = await tx.wait();
        console.log("New attestation UID:", newAttestationUID);
        onTransactionComplete?.(newAttestationUID);
        return true;
      } catch (error) {
        console.error("Error saving stats:", error);
        setTransactionError(
          error instanceof Error
            ? error.message
            : "Failed to save game stats. Please try again."
        );
        return false;
      } finally {
        setIsSavingStats(false);
      }
    },
    [address, walletClient, onTransactionComplete]
  );

  const calculateWinner = (
    squares: Player[]
  ): { winner: Player; line: number[] | null } => {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];

    for (const line of lines) {
      const [a, b, c] = line;
      if (
        squares[a] &&
        squares[a] === squares[b] &&
        squares[a] === squares[c]
      ) {
        return { winner: squares[a], line };
      }
    }
    return { winner: null, line: null };
  };

  const isBoardFull = (squares: Player[]): boolean => {
    return squares.every((square) => square !== null);
  };

  const getEmptySquares = (squares: Player[]): number[] => {
    return squares
      .map((square, index) => (square === null ? index : null))
      .filter((index): index is number => index !== null);
  };

  const minimax = (
    squares: Player[],
    depth: number,
    isMaximizing: boolean
  ): number => {
    const winner = calculateWinner(squares);
    if (winner.winner === "O") return 10 - depth;
    if (winner.winner === "X") return depth - 10;
    if (isBoardFull(squares)) return 0;

    if (isMaximizing) {
      let bestScore = -Infinity;
      for (const index of getEmptySquares(squares)) {
        squares[index] = "O";
        const score = minimax(squares, depth + 1, false);
        squares[index] = null;
        bestScore = Math.max(score, bestScore);
      }
      return bestScore;
    } else {
      let bestScore = Infinity;
      for (const index of getEmptySquares(squares)) {
        squares[index] = "X";
        const score = minimax(squares, depth + 1, true);
        squares[index] = null;
        bestScore = Math.min(score, bestScore);
      }
      return bestScore;
    }
  };

  const getAIMove = (squares: Player[]): number => {
    const emptySquares = getEmptySquares(squares);
    let bestScore = -Infinity;
    let bestMove = emptySquares[0];

    for (const index of emptySquares) {
      squares[index] = "O";
      const score = minimax(squares, 0, false);
      squares[index] = null;
      if (score > bestScore) {
        bestScore = score;
        bestMove = index;
      }
    }

    return bestMove;
  };

  const handleClick = (index: number) => {
    if (
      board[index] ||
      calculateWinner(board).winner ||
      isAITurn ||
      !isConnected
    )
      return;

    const newBoard = [...board];
    newBoard[index] = "X";
    setBoard(newBoard);
    setIsAITurn(true);
  };

  useEffect(() => {
    if (isAITurn && !calculateWinner(board).winner && !isBoardFull(board)) {
      const timer = setTimeout(() => {
        const aiMove = getAIMove(board);
        const newBoard = [...board];
        newBoard[aiMove] = "O";
        setBoard(newBoard);
        setIsAITurn(false);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isAITurn, board]);

  useEffect(() => {
    const { winner, line } = calculateWinner(board);
    const isDraw = isBoardFull(board) && !winner;

    if (winner || isDraw) {
      let result = "";

      if (winner === "X") {
        result = "Player Won!";
      } else if (winner === "O") {
        result = "AI Won!";
      } else {
        result = "It's a Draw!";
      }

      setGameResult(result);
      setWinningLine(line);

      saveGameStats(result).then((success) => {
        if (success) {
          startNewGame();
        }
      });
    }
  }, [board, saveGameStats, startNewGame]);

  const gameStatus =
    gameResult || (isAITurn ? "AI is thinking..." : "Your turn");

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center gap-6 p-8 bg-[#1a1a1a] dark:bg-[#1a1a1a] light:bg-white rounded-lg p-6 shadow-sm border border-[#2a2a2a]">
        <h2 className="text-xl font-medium text-white dark:text-white light:text-[#181818]">
          Login to Play
        </h2>
        <div className="text-base font-medium text-gray-400">
          Please login to start playing
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-2 xs:p-3 sm:p-6 min-h-[80vh] w-full overflow-y-auto">
      <div className="flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-6 p-8 bg-[#1a1a1a] dark:bg-[#1a1a1a] light:bg-white rounded-lg p-6 shadow-sm border border-[#2a2a2a]">
          <h2 className="text-xl font-medium text-white dark:text-white light:text-[#181818]">
            {address
              ? `${address.slice(0, 4)}...${address.slice(-4)} vs AI`
              : "Tic-Tac-Toe vs AI"}
          </h2>

          <div
            className={`text-base font-medium px-6 py-3 rounded ${
              gameResult
                ? "bg-[#2a2a2a] text-gray-300 animate-pulse"
                : "bg-[#2a2a2a] text-gray-300"
            }`}
          >
            {gameStatus}
          </div>

          <div className="grid grid-cols-3 gap-4 bg-[#2a2a2a] p-6 rounded">
            {board.map((square, index) => (
              <button
                key={index}
                className={`
                  w-32 h-32 text-5xl font-bold rounded transition-all duration-200
                  ${
                    square === "X"
                      ? "text-blue-400 bg-[#1a1a1a]"
                      : square === "O"
                        ? "text-red-400 bg-[#1a1a1a]"
                        : "bg-[#1a1a1a] hover:bg-[#333333] text-gray-500"
                  }
                  ${winningLine?.includes(index) ? "ring-2 ring-yellow-400 ring-opacity-50" : ""}
                  ${!square && !gameResult && !isAITurn ? "hover:scale-105" : ""}
                  ${gameResult || isAITurn ? "cursor-default" : "cursor-pointer"}
                `}
                onClick={() => handleClick(index)}
                disabled={
                  !!gameResult ||
                  !!square ||
                  isAITurn ||
                  isSavingStats ||
                  !isConnected
                }
              >
                {square}
              </button>
            ))}
          </div>

          {isSavingStats && (
            <div className="bg-[#2a2a2a] px-4 py-2 rounded text-gray-300 animate-pulse mt-4">
              Saving game result...
            </div>
          )}

          {transactionError && (
            <div className="bg-red-900/50 px-4 py-2 rounded text-red-300 mt-4">
              {transactionError}
            </div>
          )}
        </div>

        <Leaderboard />
      </div>
    </div>
  );
};

export default TicTacToe;
