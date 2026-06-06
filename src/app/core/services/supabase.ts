import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { BehaviorSubject } from 'rxjs';

export interface Profile {
  id: string;
  company_id: string;
  full_name: string;
  username: string;
  role: string;
  companies?: { name: string };
  email?: string; // added manually via joined query if needed
}

@Injectable({
  providedIn: 'root'
})
export class Supabase {
  private supabase: SupabaseClient;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private currentProfileSubject = new BehaviorSubject<Profile | null>(null);

  currentUser$ = this.currentUserSubject.asObservable();
  currentProfile$ = this.currentProfileSubject.asObservable();

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
    
    this.supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        this.setUserAndProfile(session.user);
      }
    });

    this.supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        this.setUserAndProfile(session.user);
      } else {
        this.currentUserSubject.next(null);
        this.currentProfileSubject.next(null);
      }
    });
  }

  private async setUserAndProfile(user: User) {
    this.currentUserSubject.next(user);
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*, companies(name)')
      .eq('id', user.id)
      .single();
      
    if (data && !error) {
      this.currentProfileSubject.next(data as Profile);
    }
  }

  async signIn(email: string, password: string) {
    return this.supabase.auth.signInWithPassword({ email, password });
  }

  async signOut() {
    return this.supabase.auth.signOut();
  }

  getUser() {
    return this.currentUserSubject.value;
  }
  
  getProfile() {
    return this.currentProfileSubject.value;
  }

  // --- User Management (RPC Wrappers) ---
  
  async getCompanyUsers() {
    const profile = this.currentProfileSubject.value;
    if (!profile) return { data: null, error: new Error('No profile') };
    
    // We fetch profiles and join with auth.users to get the email if possible.
    // Wait, by default auth.users is NOT readable by normal users even with RLS!
    // So we can only fetch from public.profiles. 
    return this.supabase
      .from('profiles')
      .select('*')
      .eq('company_id', profile.company_id)
      .order('full_name', { ascending: true });
  }

  async createTenantUser(params: { new_email: string; new_password: string; new_role: string; new_full_name: string; new_username: string }) {
    return this.supabase.rpc('create_tenant_user', params);
  }

  async updateTenantUser(params: { target_user_id: string; new_full_name: string; new_username: string; new_role: string; new_password?: string }) {
    return this.supabase.rpc('update_tenant_user', params);
  }

  async deleteTenantUser(target_user_id: string) {
    return this.supabase.rpc('delete_tenant_user', { target_user_id });
  }
}
