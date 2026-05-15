import { useAuth as useAuthFromProvider } from '../providers/AuthProvider';

export const useAuth = () => {
  const { user, profile, loading, signIn, logout, isStaff } = useAuthFromProvider();
  
  // SET_SUPERADMIN_UID_HERE: Add logic for specific UID-based superadmin
  const superAdminUid = ''; 
  const isGlobalAdmin = profile?.role === 'Admin' || profile?.role === 'Staff' || profile?.role === 'Співробітник' || user?.uid === superAdminUid || user?.email === 'aptecar87@gmail.com';

  const canEditFinance = isGlobalAdmin || profile?.role === 'finance_editor' || profile?.role === 'Finance' || profile?.role === 'Senior Mentor';
  const canEditLibrary = isGlobalAdmin || profile?.role === 'library_manager' || profile?.role === 'Library';
  const canEditPatients = isGlobalAdmin || profile?.role === 'mentor' || profile?.role === 'Mentor' || profile?.role === 'Senior Mentor';
  const canChat = !!user; // Everyone authenticated can chat

  return {
    user,
    profile,
    loading,
    signIn,
    logout,
    isStaff,
    isAdmin: isGlobalAdmin,
    canEditFinance,
    canEditLibrary,
    canEditPatients,
    canChat
  };
};
