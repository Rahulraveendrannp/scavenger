import React, { useState, useEffect } from "react";
import { Users, Phone, Calendar } from "lucide-react";
import { ScavengerAPI } from "../api";

interface User {
  _id: string;
  phoneNumber: string;
  createdAt: string;
  progress?: {
    dashboardGames?: Record<string, any>;
    scavengerHunt?: {
      completedCheckpoints: string[];
      totalFound: number;
      isCompleted: boolean;
    };
  };
  hasClaimed: {
    cardGame: boolean;
    puzzle: boolean;
    carRace: boolean;
    scavengerHunt: boolean;
  };
}

interface AdminPanelProps {}

const AdminPanel: React.FC<AdminPanelProps> = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [showSuccessMessage, setShowSuccessMessage] = useState("");

  // Load all users on component mount
  useEffect(() => {
    loadUsers();
  }, []);

  // Filter and sort users based on search query and recent activity
  useEffect(() => {
    let filtered = users;

    // Filter by search query
    if (searchQuery.trim() !== "") {
      filtered = users.filter((user) =>
        user.phoneNumber.includes(searchQuery.trim()),
      );
    }

    // Sort by prize claims and registration date
    const sortedUsers = filtered.sort((a, b) => {
      // Count claimed prizes for each user
      const claimsA = a.hasClaimed;
      const claimsB = b.hasClaimed;

      const claimedCountA = claimsA
        ? Object.values(claimsA).filter(Boolean).length
        : 0;
      const claimedCountB = claimsB
        ? Object.values(claimsB).filter(Boolean).length
        : 0;

      // First sort by number of claimed prizes (more claims first)
      if (claimedCountA !== claimedCountB) {
        return claimedCountB - claimedCountA;
      }

      // Then sort by registration date (recent first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    setFilteredUsers(sortedUsers);
  }, [users, searchQuery]);

  const loadUsers = async () => {
    setIsLoading(true);
    setError("");

    try {
      // Call API to get all users (we'll need to create this endpoint)
      const response = await ScavengerAPI.getAllUsers();

      if (response.success && response.data) {
        setUsers(response.data);
        console.log("📊 Admin: Loaded users:", response.data);
      } else {
        setError(
          "Failed to load users: " + (response.error || "Unknown error"),
        );
      }
    } catch (err: any) {
      console.error("❌ Admin: Error loading users:", err);
      setError("Error loading users: " + (err.message || "Network error"));
    } finally {
      setIsLoading(false);
    }
  };

  const togglePrizeClaim = async (
    userId: string,
    prizeType: "cardGame" | "puzzle" | "carRace" | "scavengerHunt",
  ) => {
    try {
      const user = users.find((u) => u._id === userId);
      if (!user) return;

      const currentStatus = user.hasClaimed?.[prizeType] || false;
      const newStatus = !currentStatus;

      // Call API to update prize claim status
      const response = await ScavengerAPI.updatePrizeClaim(
        userId,
        prizeType,
        newStatus,
      );

      if (response.success) {
        // Update local state
        const updatedUsers = users.map((u) => {
          if (u._id === userId) {
            return {
              ...u,
              hasClaimed: {
                ...u.hasClaimed,
                [prizeType]: newStatus,
              },
            };
          }
          return u;
        });

        setUsers(updatedUsers);
        setShowSuccessMessage(
          `Prize claim ${newStatus ? "marked" : "unmarked"} for ${user.phoneNumber}`,
        );
        setTimeout(() => setShowSuccessMessage(""), 2000);

        console.log("✅ Admin: Updated prize claim:", {
          userId,
          prizeType,
          newStatus,
        });
      } else {
        setError(
          "Failed to update prize claim: " +
            (response.error || "Unknown error"),
        );
        setTimeout(() => setError(""), 3000);
      }
    } catch (err: any) {
      console.error("❌ Admin: Error updating prize claim:", err);
      setError(
        "Error updating prize claim: " + (err.message || "Network error"),
      );
      setTimeout(() => setError(""), 3000);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Invalid Date";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-8 text-center shadow-2xl">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-400 to-red-500 p-2 sm:p-4">
      <div className="max-w-full sm:max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-2xl p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-orange-100 p-2 sm:p-3 rounded-lg">
                <Users className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600" />
              </div>
              <div className="text-center sm:text-left">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-orange-600">
                  Admin Panel
                </h1>
                <p className="text-sm sm:text-base text-gray-600">
                  Manage prize claims
                </p>
              </div>
            </div>
            <div className="bg-orange-100 p-3 sm:p-4 rounded-lg">
              <div className="flex items-center gap-2 sm:gap-3">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                <div className="text-center">
                  <p className="text-xs sm:text-sm text-gray-600">
                    Total Users
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-orange-600">
                    {users.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
            <input
              type="text"
              placeholder="Search by phone number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 sm:pl-12 pr-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-base sm:text-lg"
            />
          </div>
        </div>

        {/* Success/Error Messages */}
        {showSuccessMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-4">
            ✅ {showSuccessMessage}
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
            ❌ {error}
          </div>
        )}

        {/* Users List */}
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl font-bold text-orange-600 flex items-center gap-2">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
              Users & Prize Claims ({filteredUsers.length})
            </h2>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="p-6 sm:p-8 text-center">
              <Users className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-gray-500 mb-2">
                {searchQuery ? "No users found" : "No users registered yet"}
              </h3>
              <p className="text-sm sm:text-base text-gray-400">
                {searchQuery
                  ? "Try a different phone number"
                  : "Users will appear here once they register"}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-orange-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-orange-600 uppercase tracking-wider">
                        User Info
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-medium text-orange-600 uppercase tracking-wider">
                        Card Game Prize
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-medium text-orange-600 uppercase tracking-wider">
                        Puzzle Prize
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-medium text-orange-600 uppercase tracking-wider">
                        Car Race Prize
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-medium text-orange-600 uppercase tracking-wider">
                        Hunt Prize
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((user) => {
                      const claims = user.hasClaimed;

                      return (
                        <tr key={user._id} className="hover:bg-orange-50">
                          {/* User Info */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="bg-orange-100 p-2 rounded-full mr-3">
                                <Phone className="w-5 h-5 text-orange-600" />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {user.phoneNumber}
                                </div>
                                <div className="text-sm text-gray-500 flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {formatDate(user.createdAt)}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Card Game Prize */}
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() =>
                                togglePrizeClaim(user._id, "cardGame")
                              }
                              className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                                claims.cardGame
                                  ? "bg-green-600"
                                  : "bg-gray-200 hover:bg-gray-300"
                              }`}
                              title={
                                claims.cardGame
                                  ? "Prize claimed - click to unmark"
                                  : "Prize not claimed - click to mark as claimed"
                              }
                            >
                              <span
                                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                                  claims.cardGame
                                    ? "translate-x-9"
                                    : "translate-x-1"
                                }`}
                              />
                            </button>
                            <div className="text-xs mt-1">
                              {claims.cardGame ? (
                                <span className="text-green-600 font-medium">
                                  Claimed
                                </span>
                              ) : (
                                <span className="text-gray-500">
                                  Not Claimed
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Puzzle Prize */}
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() =>
                                togglePrizeClaim(user._id, "puzzle")
                              }
                              className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                                claims.puzzle
                                  ? "bg-green-600"
                                  : "bg-gray-200 hover:bg-gray-300"
                              }`}
                              title={
                                claims.puzzle
                                  ? "Prize claimed - click to unmark"
                                  : "Prize not claimed - click to mark as claimed"
                              }
                            >
                              <span
                                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                                  claims.puzzle
                                    ? "translate-x-9"
                                    : "translate-x-1"
                                }`}
                              />
                            </button>
                            <div className="text-xs mt-1">
                              {claims.puzzle ? (
                                <span className="text-green-600 font-medium">
                                  Claimed
                                </span>
                              ) : (
                                <span className="text-gray-500">
                                  Not Claimed
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Car Race Prize */}
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() =>
                                togglePrizeClaim(user._id, "carRace")
                              }
                              className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                                claims.carRace
                                  ? "bg-green-600"
                                  : "bg-gray-200 hover:bg-gray-300"
                              }`}
                              title={
                                claims.carRace
                                  ? "Prize claimed - click to unmark"
                                  : "Prize not claimed - click to mark as claimed"
                              }
                            >
                              <span
                                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                                  claims.carRace
                                    ? "translate-x-9"
                                    : "translate-x-1"
                                }`}
                              />
                            </button>
                            <div className="text-xs mt-1">
                              {claims.carRace ? (
                                <span className="text-green-600 font-medium">
                                  Claimed
                                </span>
                              ) : (
                                <span className="text-gray-500">
                                  Not Claimed
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Scavenger Hunt Prize */}
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() =>
                                togglePrizeClaim(user._id, "scavengerHunt")
                              }
                              className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                                claims.scavengerHunt
                                  ? "bg-green-600"
                                  : "bg-gray-200 hover:bg-gray-300"
                              }`}
                              title={
                                claims.scavengerHunt
                                  ? "Prize claimed - click to unmark"
                                  : "Prize not claimed - click to mark as claimed"
                              }
                            >
                              <span
                                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                                  claims.scavengerHunt
                                    ? "translate-x-9"
                                    : "translate-x-1"
                                }`}
                              />
                            </button>
                            <div className="text-xs mt-1">
                              {claims.scavengerHunt ? (
                                <span className="text-green-600 font-medium">
                                  Claimed
                                </span>
                              ) : (
                                <span className="text-gray-500">
                                  Not Claimed
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden">
                {filteredUsers.map((user) => {
                  const claims = user.hasClaimed;

                  return (
                    <div
                      key={user._id}
                      className="border-b border-gray-200 last:border-b-0 p-3"
                    >
                      {/* User Info */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="bg-orange-100 p-2 rounded-full">
                          <Phone className="w-4 h-4 text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">
                            {user.phoneNumber}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(user.createdAt)}
                          </div>
                        </div>
                      </div>

                      {/* Prize Claims Grid */}
                      <div className="grid grid-cols-4 gap-2">
                        {/* Card Game */}
                        <div className="bg-gray-50 rounded-lg p-2 text-center">
                          <div className="text-xs font-medium text-gray-600 mb-1">
                            Card
                          </div>
                          <button
                            onClick={() =>
                              togglePrizeClaim(user._id, "cardGame")
                            }
                            className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-orange-500 ${
                              claims.cardGame ? "bg-green-600" : "bg-gray-300"
                            }`}
                          >
                            <span
                              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                claims.cardGame
                                  ? "translate-x-6"
                                  : "translate-x-1"
                              }`}
                            />
                          </button>
                        </div>

                        {/* Puzzle */}
                        <div className="bg-gray-50 rounded-lg p-2 text-center">
                          <div className="text-xs font-medium text-gray-600 mb-1">
                            Puzzle
                          </div>
                          <button
                            onClick={() => togglePrizeClaim(user._id, "puzzle")}
                            className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-orange-500 ${
                              claims.puzzle ? "bg-green-600" : "bg-gray-300"
                            }`}
                          >
                            <span
                              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                claims.puzzle
                                  ? "translate-x-6"
                                  : "translate-x-1"
                              }`}
                            />
                          </button>
                        </div>

                        {/* Car Race */}
                        <div className="bg-gray-50 rounded-lg p-2 text-center">
                          <div className="text-xs font-medium text-gray-600 mb-1">
                            Car
                          </div>
                          <button
                            onClick={() =>
                              togglePrizeClaim(user._id, "carRace")
                            }
                            className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-orange-500 ${
                              claims.carRace ? "bg-green-600" : "bg-gray-300"
                            }`}
                          >
                            <span
                              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                claims.carRace
                                  ? "translate-x-6"
                                  : "translate-x-1"
                              }`}
                            />
                          </button>
                        </div>

                        {/* Scavenger Hunt */}
                        <div className="bg-gray-50 rounded-lg p-2 text-center">
                          <div className="text-xs font-medium text-gray-600 mb-1">
                            Hunt
                          </div>
                          <button
                            onClick={() =>
                              togglePrizeClaim(user._id, "scavengerHunt")
                            }
                            className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-orange-500 ${
                              claims.scavengerHunt
                                ? "bg-green-600"
                                : "bg-gray-300"
                            }`}
                          >
                            <span
                              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                                claims.scavengerHunt
                                  ? "translate-x-6"
                                  : "translate-x-1"
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 sm:mt-8 text-center">
          <p className="text-white/90 text-xs sm:text-sm">
            Admin Panel - Manage user prize claims
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
