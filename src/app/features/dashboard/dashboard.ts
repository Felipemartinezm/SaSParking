import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Supabase } from '../../core/services/supabase';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private supabase = inject(Supabase);
  private router = inject(Router);

  profile$ = this.supabase.currentProfile$;
  user$ = this.supabase.currentUser$;

  async signOut() {
    await this.supabase.signOut();
    this.router.navigate(['/login']);
  }
}
