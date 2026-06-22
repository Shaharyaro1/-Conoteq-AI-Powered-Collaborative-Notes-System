import { Component, OnInit, OnDestroy, ViewChild, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { UsersService } from '../../../../shared/services/users.service';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  status: 'active' | 'inactive' | 'blocked';
  createdAt: string;
  lastActive: string;
  showPassword?: boolean;
}

@Component({
  selector: 'app-user-manager',
  imports: [CommonModule, FormsModule, MatPaginatorModule],
  templateUrl: './user-manager.component.html',
  styleUrl: './user-manager.component.css'
})
export class UserManagerComponent implements OnInit, OnDestroy {
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  users: User[] = [];
  filteredUsers: User[] = [];
  paginatedUsers: User[] = [];
  searchTerm: string = '';
  selectedRole: string = 'all';
  selectedStatus: string = 'all';
  showAddUserModal: boolean = false;
  showEditUserModal: boolean = false;
  selectedUser: User | null = null;

  // Pagination properties
  pageIndex: number = 0;
  pageSize: number = 5;
  pageSizeOptions: number[] = [5, 10, 25, 50];
  totalItems: number = 0;

  newUser: Partial<User> = {
    username: '',
    email: '',
    role: 'user',
    status: 'active'
  };

  roles = ['admin', 'user'];
  statuses = ['active', 'inactive', 'blocked'];

  private refreshInterval: any;
  isLoading = false;
  errorMessage = '';

  constructor(private usersService: UsersService, @Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit() {
    // Clear localStorage users data to force API loading
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('users');
      console.log('🗑️ Cleared localStorage users data');
    }
    
    this.loadUsers();
    
    // Auto-refresh every 5 seconds to show real-time status updates
    this.refreshInterval = setInterval(() => {
      this.loadUsers();
    }, 5000);
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  loadUsers() {
    this.isLoading = true;
    this.errorMessage = '';
    
    console.log('🔍 Loading users from API...');
    console.log('Search term:', this.searchTerm);
    console.log('Selected role:', this.selectedRole);
    console.log('Selected status:', this.selectedStatus);
    
    this.usersService.getUsers(this.searchTerm, this.selectedRole === 'all' ? undefined : this.selectedRole, this.selectedStatus === 'all' ? undefined : this.selectedStatus).subscribe({
      next: (users) => {
        console.log('✅ Users loaded from API:', users);
        this.users = users.map(user => ({
          ...user,
          showPassword: false
        }));
        this.filterUsers();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Error loading users from API:', error);
        console.error('Error status:', error.status);
        console.error('Error message:', error.message);
        this.errorMessage = `Failed to load users from server: ${error.message}`;
        this.isLoading = false;
        
        // Set empty users array instead of falling back to localStorage
        this.users = [];
        this.filterUsers();
      }
    });
  }

  private loadUsersFromLocalStorage() {
    if (isPlatformBrowser(this.platformId)) {
      const storedUsers = localStorage.getItem('users');
      if (storedUsers) {
        this.users = JSON.parse(storedUsers).map((user: any) => ({
          ...user,
          showPassword: false
        }));
      } else {
        this.users = [];
      }
    } else {
      this.users = [];
    }
    this.filterUsers();
  }

  filterUsers() {
    this.filteredUsers = this.users.filter(user => {
      const matchesSearch = user.username.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                           user.email.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesRole = this.selectedRole === 'all' || user.role === this.selectedRole;
      const matchesStatus = this.selectedStatus === 'all' || user.status === this.selectedStatus;
      
      return matchesSearch && matchesRole && matchesStatus;
    });
    
    this.totalItems = this.filteredUsers.length;
    this.pageIndex = 0;
    this.updatePaginatedUsers();
  }

  updatePaginatedUsers() {
    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedUsers = this.filteredUsers.slice(startIndex, endIndex);
  }

  onPageChange(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updatePaginatedUsers();
  }

  // Password visibility toggle - removed since we don't store passwords
  togglePasswordVisibility(user: User) {
    // This method is no longer needed since we don't display passwords
  }

  openAddUserModal() {
    this.newUser = {
      username: '',
      email: '',
      role: 'user',
      status: 'active'
    };
    this.showAddUserModal = true;
  }

  openEditUserModal(user: User) {
    this.selectedUser = { ...user };
    this.showEditUserModal = true;
  }

  closeModals() {
    this.showAddUserModal = false;
    this.showEditUserModal = false;
    this.selectedUser = null;
  }

  addUser() {
    // Note: User creation is now handled through the signup process
    // This method is kept for future admin user creation functionality
    alert('New users should register through the signup page. Admin user creation will be added in future updates.');
    this.closeModals();
  }

  updateUser() {
    if (this.selectedUser) {
      const updateData = {
        username: this.selectedUser.username,
        email: this.selectedUser.email,
        role: this.selectedUser.role,
        status: this.selectedUser.status
      };

      this.usersService.updateUser(this.selectedUser.id, updateData).subscribe({
        next: (updatedUser) => {
          const index = this.users.findIndex(u => u.id === this.selectedUser!.id);
          if (index !== -1) {
            this.users[index] = { ...updatedUser, showPassword: false };
            this.filterUsers();
          }
          this.closeModals();
        },
        error: (error) => {
          console.error('Error updating user:', error);
          this.errorMessage = 'Failed to update user';
        }
      });
    }
  }

  deleteUser(userId: number) {
    if (confirm('Are you sure you want to delete this user?')) {
      this.usersService.deleteUser(userId).subscribe({
        next: () => {
          this.users = this.users.filter(u => u.id !== userId);
          this.filterUsers();
        },
        error: (error) => {
          console.error('Error deleting user:', error);
          this.errorMessage = 'Failed to delete user';
        }
      });
    }
  }

  toggleUserStatus(user: User) {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    
    this.usersService.updateUserStatus(user.id, newStatus).subscribe({
      next: (updatedUser) => {
        const index = this.users.findIndex(u => u.id === user.id);
        if (index !== -1) {
          this.users[index] = { ...updatedUser, showPassword: false };
          this.filterUsers();
        }
      },
      error: (error) => {
        console.error('Error updating user status:', error);
        this.errorMessage = 'Failed to update user status';
      }
    });
  }

  private saveUsersToLocalStorage() {
    // This method is no longer needed since we're using API
    // Keeping it for backward compatibility
    if (isPlatformBrowser(this.platformId)) {
      // localStorage operations would go here if needed
    }
  }
}
