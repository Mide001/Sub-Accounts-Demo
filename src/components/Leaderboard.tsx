import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import {
  EAS,
  SchemaEncoder,
} from "@ethereum-attestation-service/eas-sdk";

type LeaderboardEntry = {
  player: string;
  wins: number;
  losses: number;
  draws: number;
  totalGames: number;
  winRate: number;
};

type PlayerStats = {
  wins: number;
  losses: number;
  draws: number;
  totalGames: number;
  timeCreated: number;
};

const EAS_CONTRACT = "0x4200000000000000000000000000000000000021";
const SCHEMA_UID =
  "0x31876b77368248bfab65f0ce7c5d5f74109b2491ac018c2424083e017cf6d52c";

// Initialize SchemaEncoder with the schema string
const schemaEncoder = new SchemaEncoder(
  "address player,uint256 totalWins,uint256 totalLosses,uint256 totalDraws,uint256 totalGames,uint256 timestamp,string gameId"
);

const Leaderboard = () => {
  const publicClient = usePublicClient();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Initialize EAS
        const eas = new EAS(EAS_CONTRACT);

        // Get all attestations for our schema using the GraphQL API
        const response = await fetch(
          "https://base-sepolia.easscan.org/graphql",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: `
              query GetAttestations($schema: String!) {
                attestations(where: { schemaId: { equals: $schema } }) {
                  id
                  recipient
                  data
                  timeCreated
                }
              }
              `,
              variables: {
                schema: SCHEMA_UID,
              },
            }),
          }
        );

        const result = await response.json();
        const attestations = result.data?.attestations || [];
        console.log(`Found ${attestations.length} attestations`);

        // Process attestations to create leaderboard
        const playerStats = new Map<string, PlayerStats>();

        // Group attestations by player address
        const playerAttestations = new Map<string, any[]>();
        attestations.forEach((attestation: any) => {
          const player = attestation.recipient;
          if (!playerAttestations.has(player)) {
            playerAttestations.set(player, []);
          }
          playerAttestations.get(player)?.push(attestation);
        });

        // Process each player's attestations
        playerAttestations.forEach((playerAtts, player) => {
          try {
            console.log(`\nProcessing attestations for player ${player}:`);
            console.log(`Found ${playerAtts.length} attestations`);

            let totalWins = 0;
            let totalLosses = 0;
            let totalDraws = 0;

            // Process each attestation as a single game result
            playerAtts.forEach((att) => {
              const hexData = att.data;
              
              // Extract the values directly from the hex data
              // Each value is 32 bytes (64 hex chars)
              const wins = parseInt(hexData.slice(66, 130), 16);
              const losses = parseInt(hexData.slice(130, 194), 16);
              const draws = parseInt(hexData.slice(194, 258), 16);

              // A game can only have one result, so we only count one of them
              if (wins === 1) {
                totalWins++;
              } else if (losses === 1) {
                totalLosses++;
              } else if (draws === 1) {
                totalDraws++;
              }
            });

            const totalGames = playerAtts.length;

            console.log("\nTotal stats for player:", {
              player,
              totalWins,
              totalLosses,
              totalDraws,
              totalGames,
            });

            // Store the stats for this player
            playerStats.set(player, {
              wins: totalWins,
              losses: totalLosses,
              draws: totalDraws,
              totalGames,
              timeCreated: new Date(playerAtts[0].timeCreated).getTime(),
            });
          } catch (err) {
            console.error("Error processing player attestations:", err, player);
          }
        });

        // Convert to array and sort by wins
        const leaderboardData = Array.from(playerStats.entries())
          .map(([player, stats]) => ({
            player,
            wins: stats.wins,
            losses: stats.losses,
            draws: stats.draws,
            totalGames: stats.totalGames,
            winRate:
              stats.totalGames > 0 ? (stats.wins / stats.totalGames) * 100 : 0,
          }))
          .sort((a, b) => b.wins - a.wins);

        console.log("Final leaderboard data:", leaderboardData);
        setLeaderboard(leaderboardData);
      } catch (err) {
        console.error("Error fetching leaderboard:", err);
        setError("Failed to load leaderboard");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  if (isLoading) {
    return (
      <div className="bg-[#1a1a1a] dark:bg-[#1a1a1a] light:bg-white rounded-lg p-4 shadow-sm border border-[#2a2a2a]">
        <div className="text-gray-400 animate-pulse">
          Loading leaderboard...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#1a1a1a] dark:bg-[#1a1a1a] light:bg-white rounded-lg p-4 shadow-sm border border-[#2a2a2a]">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-[#1a1a1a] dark:bg-[#1a1a1a] light:bg-white rounded-lg p-6 shadow-sm border border-[#2a2a2a] w-full max-w-4xl">
      <h3 className="text-xl font-medium text-white mb-6">Leaderboard</h3>
      <div className="space-y-3">
        {leaderboard.map((entry, index) => (
          <div
            key={entry.player}
            className="flex items-center justify-between bg-[#2a2a2a] p-4 rounded-lg"
          >
            <div className="flex items-center gap-4">
              <span className="text-gray-400 w-8 text-lg">{index + 1}.</span>
              <span className="text-gray-300 font-mono text-lg">
                {entry.player.slice(0, 6)}...{entry.player.slice(-4)}
              </span>
            </div>
            <div className="flex items-center gap-8">
              <div className="text-blue-400 font-medium text-lg min-w-[80px] text-right">
                {entry.wins} wins
              </div>
              <div className="text-red-400 font-medium text-lg min-w-[80px] text-right">
                {entry.losses} losses
              </div>
              <div className="text-gray-400 font-medium text-lg min-w-[80px] text-right">
                {entry.draws} draws
              </div>
              <div className="text-gray-400 text-lg min-w-[100px] text-right">
                {entry.winRate.toFixed(1)}% win rate
              </div>
            </div>
          </div>
        ))}
        {leaderboard.length === 0 && (
          <div className="text-gray-400 text-center py-8 text-lg">
            No games played yet
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
