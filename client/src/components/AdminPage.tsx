import React, { useState, useEffect } from "react";
import { Users, QrCode, CheckCircle, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { ScavengerAPI } from "../api";
import SimpleQRScanner from "./SimpleQRScanner";

interface AdminPageProps {}

const AdminPage: React.FC<AdminPageProps> = () => {
  const [totalUsers, setTotalUsers] = useState(0);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [claimMessage, setClaimMessage] = useState("");
  const [usersList, setUsersList] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    loadTotalUsers();
  }, []);

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

  const handleClaimScan = async (qrCode: string) => {
    try {
      console.log("Scanning claim QR code:", qrCode);
      
      // Check if it's a valid claim QR code
      if (!qrCode.startsWith("TALABAT_CLAIM_")) {
        setClaimMessage("❌ Invalid QR code format");
        setTimeout(() => setClaimMessage(""), 3000);
        return;
      }
      
      // Call API to mark user as claimed using QR code
      const response = await ScavengerAPI.markUserAsClaimed(qrCode);
      
      if (response.success) {
        setClaimMessage("✅ Reward claimed successfully!");
        // Refresh total users
        loadTotalUsers();
      } else {
        setClaimMessage(`❌ ${response.error || "Failed to claim reward"}`);
      }
      
      setTimeout(() => setClaimMessage(""), 3000);
      setShowQRScanner(false);
      
    } catch (error) {
      console.error("Error claiming reward:", error);
      setClaimMessage("❌ Error processing claim");
      setTimeout(() => setClaimMessage(""), 3000);
    }
  };

  const closeQRScanner = () => {
    setShowQRScanner(false);
  };

  // Filter users based on search term (phone number only)
  const filteredUsers = usersList.filter(user =>
    user.phoneNumber?.toLowerCase().includes(searchTerm.toLowerCase())
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

  if (showQRScanner) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
        <div className="bg-white rounded-xl p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
          <h3 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">
            Scan Claim QR Code
          </h3>
          <p className="text-sm sm:text-base text-gray-600 mb-4">
            Scan the QR code from the user's dashboard to mark them as claimed
          </p>
          
          <SimpleQRScanner
            title="Scan Claim QR Code"
            expectedQRCode="TALABAT_CLAIM_"
            onScan={handleClaimScan}
            onClose={closeQRScanner}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-400 to-red-500 p-2 sm:p-4">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
                 <div className="mb-4">
           <div>
             <h1 className="text-2xl sm:text-3xl font-bold text-orange-600">
               talabat Admin
             </h1>
             <p className="text-sm sm:text-base text-gray-600">Booth Management</p>
           </div>
         </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-orange-50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="bg-orange-100 p-2 rounded-lg">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-orange-600">
                  {isLoading ? "..." : totalUsers}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Claim Message */}
        {claimMessage && (
          <div className={`mb-4 p-3 rounded-lg text-center font-semibold ${
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
             onClick={() => setShowQRScanner(true)}
             className="bg-orange-500 text-white py-3 px-4 rounded-lg hover:bg-orange-600 transition-colors font-semibold flex items-center justify-center gap-2 text-sm sm:text-base"
           >
             <QrCode className="w-4 h-4 sm:w-5 sm:h-5" />
             <span className="hidden sm:inline">Scan Claim QR Code</span>
             <span className="sm:hidden">Scan QR</span>
           </button>
           
           <button
             onClick={loadTotalUsers}
             className="bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors font-semibold flex items-center justify-center gap-2 text-sm sm:text-base"
           >
             <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
             <span className="hidden sm:inline">Refresh Data</span>
             <span className="sm:hidden">Refresh</span>
           </button>
         </div>

                 {/* Users List */}
         <div className="bg-white rounded-xl shadow-lg overflow-hidden">
           <div className="p-6 border-b border-gray-200">
             <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
               <h3 className="text-xl font-bold text-gray-800">Users Progress & Claim Status</h3>
               
               {/* Search Bar */}
               <div className="relative">
                 <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                                   <input
                    type="text"
                    placeholder="Search by phone number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent w-full sm:w-64"
                  />
               </div>
             </div>
           </div>

           {isLoading ? (
             <div className="text-center py-12">
               <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
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
                      <tr className="bg-gradient-to-r from-orange-50 to-red-50 border-b border-gray-200">
                        <th className="text-left py-4 px-6 font-semibold text-gray-700 text-sm uppercase tracking-wider">
                          Phone Number
                        </th>
                        <th className="hidden sm:table-cell text-center py-4 px-6 font-semibold text-gray-700 text-sm uppercase tracking-wider">
                          Games Completed
                        </th>
                        <th className="hidden sm:table-cell text-center py-4 px-6 font-semibold text-gray-700 text-sm uppercase tracking-wider">
                          Scavenger Hunt
                        </th>
                        <th className="text-center py-4 px-6 font-semibold text-gray-700 text-sm uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentUsers.map((user, index) => (
                        <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                          <td className="py-4 px-6">
                            <div className="text-sm font-medium text-gray-900">
                              {user.phoneNumber || 'Unknown'}
                            </div>
                          </td>
                          <td className="hidden sm:table-cell py-4 px-6 text-center">
                            <div className="flex items-center justify-center">
                              <div className="bg-blue-100 rounded-full px-3 py-1">
                                <span className="text-blue-800 font-semibold text-sm">
                                  {user.completedGames || '0/4'}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="hidden sm:table-cell py-4 px-6 text-center">
                            <div className="flex items-center justify-center">
                              <div className="bg-purple-100 rounded-full px-3 py-1">
                                <span className="text-purple-800 font-semibold text-sm">
                                  {user.scavengerProgress || '0/8'}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-center">
                            {user.isClaimed ? (
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-800">
                                <span className="text-lg">✓</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 text-orange-800">
                                <span className="text-lg">X</span>
                              </span>
                            )}
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
                       Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                       <span className="font-medium">{Math.min(endIndex, filteredUsers.length)}</span> of{' '}
                       <span className="font-medium">{filteredUsers.length}</span> results
                     </div>
                     
                     <div className="flex items-center space-x-2">
                       <button
                         onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                         disabled={currentPage === 1}
                         className="px-3 py-1 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
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
                               className={`px-3 py-1 text-sm font-medium rounded-md ${
                                 currentPage === pageNum
                                   ? 'bg-orange-500 text-white'
                                   : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
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
                         className="px-3 py-1 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
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
      </div>
    </div>
  );
};

export default AdminPage;
