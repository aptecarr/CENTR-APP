
export type UserRole = 'Senior Mentor' | 'Mentor' | 'Admin' | 'Staff';

export interface User {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  isOwner?: boolean;
  status: 'active' | 'blocked';
}

// Mocking the current logged in user
export const currentUser: User = {
  uid: '123',
  name: 'Олександр Сила',
  email: 'aptecar87@gmail.com',
  role: 'Admin', // In a real app, this would come from Firebase
  isOwner: true,
  status: 'active'
};

export const hasPermission = (user: User, permission: 'manage_users' | 'edit_sermons' | 'manage_finance') => {
  if (user.status === 'blocked') return false;
  if (user.isOwner) return true;
  
  switch (permission) {
    case 'manage_users':
      return user.role === 'Admin' || user.isOwner;
    case 'edit_sermons':
      return user.role === 'Admin' || user.role === 'Senior Mentor' || user.isOwner;
    case 'manage_finance':
      return user.role === 'Admin' || user.isOwner;
    default:
      return false;
  }
};
