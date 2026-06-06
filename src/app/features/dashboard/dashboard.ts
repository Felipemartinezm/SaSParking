import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Supabase, Profile } from '../../core/services/supabase';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {
  private supabase = inject(Supabase);
  private router = inject(Router);

  profile$ = this.supabase.currentProfile$;
  
  users: Profile[] = [];
  loadingUsers = false;
  errorMessage = '';
  successMessage = '';

  // Modal State
  showModal = false;
  isEditing = false;
  modalUser: any = {
    id: '',
    full_name: '',
    username: '',
    email: '',
    password: '',
    role: 'Operario'
  };
  modalLoading = false;

  ngOnInit() {
    this.loadUsers();
  }

  async loadUsers() {
    this.loadingUsers = true;
    const { data, error } = await this.supabase.getCompanyUsers();
    if (data) {
      this.users = data as Profile[];
    } else if (error) {
      console.error(error);
    }
    this.loadingUsers = false;
  }

  openCreateModal() {
    this.isEditing = false;
    this.modalUser = { id: '', full_name: '', username: '', email: '', password: '', role: 'Operario' };
    this.errorMessage = '';
    this.showModal = true;
  }

  openEditModal(user: Profile) {
    this.isEditing = true;
    this.modalUser = {
      id: user.id,
      full_name: user.full_name,
      username: user.username,
      email: '', // Not editable via this simple UI
      password: '', // Optional to change
      role: user.role
    };
    this.errorMessage = '';
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  async saveUser() {
    this.modalLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      if (this.isEditing) {
        const { error } = await this.supabase.updateTenantUser({
          target_user_id: this.modalUser.id,
          new_full_name: this.modalUser.full_name,
          new_username: this.modalUser.username,
          new_role: this.modalUser.role,
          new_password: this.modalUser.password || undefined
        });
        if (error) throw error;
        this.successMessage = 'Usuario actualizado correctamente.';
      } else {
        if (!this.modalUser.email || !this.modalUser.password) {
          throw new Error('Email y contraseña son obligatorios para nuevos usuarios.');
        }
        const { error } = await this.supabase.createTenantUser({
          new_email: this.modalUser.email,
          new_password: this.modalUser.password,
          new_full_name: this.modalUser.full_name,
          new_username: this.modalUser.username,
          new_role: this.modalUser.role
        });
        if (error) throw error;
        this.successMessage = 'Usuario creado correctamente.';
      }
      this.closeModal();
      this.loadUsers();
      
      setTimeout(() => this.successMessage = '', 3000);
    } catch (err: any) {
      this.errorMessage = err.message || 'Error al guardar usuario';
    } finally {
      this.modalLoading = false;
    }
  }

  async deleteUser(id: string) {
    if (!confirm('¿Estás seguro de eliminar a este usuario?')) return;
    
    try {
      const { error } = await this.supabase.deleteTenantUser(id);
      if (error) throw error;
      this.successMessage = 'Usuario eliminado.';
      this.loadUsers();
      setTimeout(() => this.successMessage = '', 3000);
    } catch (err: any) {
      alert(err.message || 'Error al eliminar usuario');
    }
  }

  async signOut() {
    await this.supabase.signOut();
    this.router.navigate(['/login']);
  }
}
