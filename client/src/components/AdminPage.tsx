import React, { useState, useEffect } from "react";
import { Users, CheckCircle, Search, ChevronLeft, ChevronRight, ToggleLeft, ToggleRight, LogOut } from "lucide-react";
import { ScavengerAPI } from "../api";
import AdminLogin from "./AdminLogin";

interface AdminPageProps {}

const AdminPage: React.FC<AdminPageProps> = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [totalUsers, setTotalUsers] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [claimMessage, setClaimMessage] = useState("");
  const [usersList, setUsersList] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [voucherInput, setVoucherInput] = useState("");
  const [showVoucherInput, setShowVoucherInput] = useState(false);
  const [voucherError, setVoucherError] = useState("");

  useEffect(() => {
    checkAuthentication();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadTotalUsers();
    }
  }, [isAuthenticated]);

  const checkAuthentication = () => {
    const authenticated = localStorage.getItem("adminAuthenticated") === "true";
    const loginTime = localStorage.getItem("adminLoginTime");
    
    if (authenticated && loginTime) {
      // Check if login is still valid (24 hours)
      const loginTimestamp = parseInt(loginTime);
      const currentTime = Date.now();
      const hoursSinceLogin = (currentTime - loginTimestamp) / (1000 * 60 * 60);
      
      if (hoursSinceLogin < 24) {
        setIsAuthenticated(true);
      } else {
        // Session expired
        localStorage.removeItem("adminAuthenticated");
        localStorage.removeItem("adminLoginTime");
        setIsAuthenticated(false);
      }
    } else {
      setIsAuthenticated(false);
    }
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("adminAuthenticated");
    localStorage.removeItem("adminLoginTime");
    setIsAuthenticated(false);
    setClaimMessage("✅ Logged out successfully");
    setTimeout(() => setClaimMessage(""), 3000);
  };

  const loadTotalUsers = async () => {
    try {
      setIsLoading(true);
      const [totalResponse, usersResponse] = await Promise.all([
        ScavengerAPI.getTotalUsers(),
        ScavengerAPI.getAllUsers()
      ]);
      
      if (totalResponse.success) {
        setTotalUsers(totalResponse.data?.totalUsers || 0);
      }
      
      if (usersResponse.success) {
        setUsersList(usersResponse.data || []);
      }
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVoucherClaim = async () => {
    try {
      console.log("Processing voucher code:", voucherInput);
      setVoucherError(""); // Clear previous errors
      
      if (!voucherInput.trim()) {
        setVoucherError("❌ Please enter a voucher code");
        return;
      }
      
      // Call API to mark user as claimed using voucher code
      const response = await ScavengerAPI.markUserAsClaimed(voucherInput.trim().toUpperCase());
      
      if (response.success) {
        setClaimMessage("✅ Reward claimed successfully!");
        setVoucherInput("");
        setVoucherError("");
        setShowVoucherInput(false);
        // Refresh total users
        loadTotalUsers();
        setTimeout(() => setClaimMessage(""), 3000);
      } else {
        setVoucherError(`❌ ${response.error || "Invalid voucher code or user not found"}`);
      }
      
    } catch (error) {
      console.error("Error claiming reward:", error);
      setVoucherError("❌ Error processing claim. Please try again.");
    }
  };

  const handleToggleClaimStatus = async (userId: string) => {
    try {
      const response = await ScavengerAPI.toggleClaimStatus(userId);
      
      if (response.success) {
        setClaimMessage("✅ Claim status updated successfully!");
        // Refresh total users
        loadTotalUsers();
      } else {
        setClaimMessage(`❌ ${response.error || "Failed to update claim status"}`);
      }
      
      setTimeout(() => setClaimMessage(""), 3000);
      
    } catch (error) {
      console.error("Error toggling claim status:", error);
      setClaimMessage("❌ Error updating claim status");
      setTimeout(() => setClaimMessage(""), 3000);
    }
  };

  // Filter users based on search term (phone number and voucher code)
  const filteredUsers = usersList.filter(user =>
    user.phoneNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.voucherCode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-[#F5F5DC] p-4 font-['TT_Commons_Pro_DemiBold']">
      {/* Header */}
      <div className="bg-[#F4EDE3] rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-['TT_Commons_Pro_ExtraBold'] text-[#FF5900]">
              talabat Admin
            </h1>
            <p className="text-sm sm:text-base text-gray-600">Booth Management</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-[#FF5900]/5 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="bg-[#FF5900]/10 p-2 rounded-lg">
                <Users className="w-6 h-6 text-[#FF5900]" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl font-['TT_Commons_Pro_ExtraBold'] text-[#FF5900]">
                  {isLoading ? "..." : totalUsers}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Claim Message */}
        {claimMessage && (
          <div className={`mb-4 p-3 rounded-lg text-center font-['TT_Commons_Pro_DemiBold'] ${
            claimMessage.includes("✅") 
              ? "bg-green-100 text-green-700" 
              : "bg-red-100 text-red-700"
          }`}>
            {claimMessage}
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => setShowVoucherInput(true)}
            className="bg-[#FF5900] text-white py-3 px-4 rounded-lg hover:bg-[#E54D00] transition-colors font-['TT_Commons_Pro_DemiBold'] flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Claim with Voucher</span>
            <span className="sm:hidden">Claim</span>
          </button>
          
          <button
            onClick={loadTotalUsers}
            className="bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors font-['TT_Commons_Pro_DemiBold'] flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Refresh Data</span>
            <span className="sm:hidden">Refresh</span>
          </button>
        </div>

        {/* Users List */}
        <div className="bg-[#F4EDE3] rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h3 className="text-xl font-['TT_Commons_Pro_ExtraBold'] text-gray-800">Users Progress & Claim Status</h3>
              
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by phone number or voucher code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF5900] focus:border-transparent w-full sm:w-64"
                />
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF5900] mx-auto mb-4"></div>
              <p className="text-gray-600 text-lg">Loading users...</p>
            </div>
          ) : usersList.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Users className="w-16 h-16 mx-auto" />
              </div>
              <p className="text-gray-600 text-lg">No users found</p>
            </div>
          ) : (
            <>
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#FF5900]/5 border-b border-gray-200">
                      <th className="text-left py-4 px-6 font-['TT_Commons_Pro_DemiBold'] text-gray-700 text-xs uppercase tracking-wider">
                        Phone Number
                      </th>
                      <th className="hidden sm:table-cell text-center py-4 px-6 font-['TT_Commons_Pro_DemiBold'] text-gray-700 text-xs uppercase tracking-wider">
                        Games Completed
                      </th>
                      <th className="hidden sm:table-cell text-center py-4 px-6 font-['TT_Commons_Pro_DemiBold'] text-gray-700 text-xs uppercase tracking-wider">
                        Scavenger Hunt
                      </th>
                      <th className="text-center py-4 px-6 font-['TT_Commons_Pro_DemiBold'] text-gray-700 text-xs uppercase tracking-wider">
                        Voucher Code
                      </th>
                      <th className="text-center py-4 px-6 font-['TT_Commons_Pro_DemiBold'] text-gray-700 text-xs uppercase tracking-wider">
                        Claim Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-[#F4EDE3] divide-y divide-gray-200">
                    {currentUsers.map((user, index) => (
                      <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="py-4 px-6">
                          <div className="text-sm font-['TT_Commons_Pro_DemiBold'] text-gray-900">
                            {user.phoneNumber || 'Unknown'}
                          </div>
                        </td>
                        <td className="hidden sm:table-cell py-4 px-6 text-center">
                          <div className="flex items-center justify-center">
                            <div className="bg-blue-100 rounded-full px-3 py-1">
                              <span className="text-blue-800 font-['TT_Commons_Pro_DemiBold'] text-sm">
                                {user.completedGames || '0/4'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="hidden sm:table-cell py-4 px-6 text-center">
                          <div className="flex items-center justify-center">
                            <div className="bg-purple-100 rounded-full px-3 py-1">
                              <span className="text-purple-800 font-['TT_Commons_Pro_DemiBold'] text-sm">
                                {user.scavengerProgress || '0/8'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <div className="text-sm font-['TT_Commons_Pro_DemiBold'] text-gray-900">
                            {user.voucherCode ? (
                              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-mono">
                                {user.voucherCode}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <button
                            onClick={() => handleToggleClaimStatus(user._id)}
                            className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-['TT_Commons_Pro_DemiBold'] transition-colors ${
                              user.isClaimed
                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                : 'bg-[#FF5900]/10 text-[#FF5900] hover:bg-[#FF5900]/20'
                            }`}
                          >
                            {user.isClaimed ? (
                              <>
                                <ToggleRight className="w-4 h-4 mr-1" />
                                Claimed
                              </>
                            ) : (
                              <>
                                <ToggleLeft className="w-4 h-4 mr-1" />
                                Not Claimed
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing <span className="font-['TT_Commons_Pro_DemiBold']">{startIndex + 1}</span> to{' '}
                      <span className="font-['TT_Commons_Pro_DemiBold']">{Math.min(endIndex, filteredUsers.length)}</span> of{' '}
                      <span className="font-['TT_Commons_Pro_DemiBold']">{filteredUsers.length}</span> results
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-sm font-['TT_Commons_Pro_DemiBold'] text-gray-500 bg-[#F4EDE3] border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Previous
                      </button>
                      
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`px-3 py-1 text-sm font-['TT_Commons_Pro_DemiBold'] rounded-md ${
                                currentPage === pageNum
                                  ? 'bg-[#FF5900] text-white'
                                  : 'text-gray-500 bg-[#F4EDE3] border border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 text-sm font-['TT_Commons_Pro_DemiBold'] text-gray-500 bg-[#F4EDE3] border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      >
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Voucher Input Modal */}
        {showVoucherInput && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
            <div className="bg-[#F4EDE3] rounded-xl p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg sm:text-xl font-['TT_Commons_Pro_ExtraBold'] mb-3 sm:mb-4">
                Claim with Voucher Code
              </h3>
              <p className="text-sm sm:text-base text-gray-600 mb-4">
                Enter the voucher code from the user's dashboard to mark them as claimed
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-['TT_Commons_Pro_DemiBold'] text-gray-700 mb-2">
                    Voucher Code
                  </label>
                  <input
                    type="text"
                    value={voucherInput}
                    onChange={(e) => {
                      setVoucherInput(e.target.value.toUpperCase());
                      setVoucherError(""); // Clear error when user types
                    }}
                    placeholder="Enter 4-digit voucher code..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF5900] focus:border-transparent"
                    maxLength={4}
                  />
                </div>
                
                {/* Error Message */}
                {voucherError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center">
                      <span className="text-red-500 text-sm font-['TT_Commons_Pro_DemiBold']">
                        {voucherError}
                      </span>
                    </div>
                  </div>
                )}
                
                <div className="flex gap-3">
                  <button
                    onClick={handleVoucherClaim}
                    className="flex-1 bg-[#FF5900] text-white py-2 px-4 rounded-lg hover:bg-[#E54D00] transition-colors font-['TT_Commons_Pro_DemiBold']"
                  >
                    Claim Reward
                  </button>
                  <button
                    onClick={() => {
                      setShowVoucherInput(false);
                      setVoucherInput("");
                      setVoucherError("");
                    }}
                    className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors font-['TT_Commons_Pro_DemiBold']"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Logout Button - Bottom */}
        <div className="text-center mt-8">
          <button
            onClick={handleLogout}
            className="text-gray-500 hover:text-gray-700 transition-colors font-['TT_Commons_Pro_DemiBold'] text-sm flex items-center gap-2 mx-auto"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
