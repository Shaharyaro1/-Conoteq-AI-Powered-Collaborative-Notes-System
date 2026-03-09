import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';

interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  role: string;
  status: 'active' | 'inactive';
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
    password: '',
    role: 'user',
    status: 'active'
  };

  roles = ['admin', 'user'];
  statuses = ['active', 'inactive'];

  private refreshInterval: any;

  ngOnInit() {
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
    // Load users from localStorage
    const storedUsers = localStorage.getItem('users');
    if (storedUsers) {
      this.users = JSON.parse(storedUsers).map((user: User) => ({
        ...user,
        showPassword: false
      }));
    } else {
      // Add some default users if no users exist
      this.users = [
        {
          id: 'admin-1',
          username: 'admin',
          email: 'admin@conoteq.com',
          password: 'admin123',
          role: 'admin',
          status: 'active',
          createdAt: new Date().toISOString(),
          lastActive: new Date().toISOString(),
          showPassword: false
        }
      ];
      localStorage.setItem('users', JSON.stringify(this.users));
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

  // Password visibility toggle
  togglePasswordVisibility(user: User) {
    user.showPassword = !user.showPassword;
  }

  openAddUserModal() {
    this.newUser = {
      username: '',
      email: '',
      password: '',
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
    if (this.newUser.username && this.newUser.email && this.newUser.password) {
      const user: User = {
        id: Date.now().toString(),
        username: this.newUser.username,
        email: this.newUser.email,
        password: this.newUser.password,
        role: this.newUser.role || 'user',
        status: this.newUser.status || 'active',
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        showPassword: false
      };
      
      this.users.push(user);
      this.saveUsersToLocalStorage();
      this.filterUsers();
      this.closeModals();
    }
  }

  updateUser() {
    if (this.selectedUser) {
      const index = this.users.findIndex(u => u.id === this.selectedUser!.id);
      if (index !== -1) {
        this.users[index] = { ...this.selectedUser };
        this.saveUsersToLocalStorage();
        this.filterUsers();
        this.closeModals();
      }
    }
  }

  deleteUser(userId: string) {
    if (confirm('Are you sure you want to delete this user?')) {
      this.users = this.users.filter(u => u.id !== userId);
      this.saveUsersToLocalStorage();
      this.filterUsers();
    }
  }

  toggleUserStatus(user: User) {
    user.status = user.status === 'active' ? 'inactive' : 'active';
    user.lastActive = new Date().toISOString();
    this.saveUsersToLocalStorage();
    this.filterUsers();
  }

  private saveUsersToLocalStorage() {
    const usersToSave = this.users.map(user => {
      const { showPassword, ...userWithoutShowPassword } = user;
      return userWithoutShowPassword;
    });
    localStorage.setItem('users', JSON.stringify(usersToSave));
  }
}
