import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Supabase } from '../../core/services/supabase';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
})
export class Login {
  email = '';
  password = '';
  loading = false;
  errorMessage = '';

  private supabase = inject(Supabase);
  private router = inject(Router);

  async onSubmit() {
    this.loading = true;
    this.errorMessage = '';
    
    try {
      const { error } = await this.supabase.signIn(this.email, this.password);
      if (error) throw error;
      this.router.navigate(['/dashboard']);
    } catch (error: any) {
      this.errorMessage = error.message || 'Error al iniciar sesión';
    } finally {
      this.loading = false;
    }
  }
}
