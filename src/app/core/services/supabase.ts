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
  email?: string; 
}

export interface CompanyArea {
  id: string;
  company_id: string;
  name: string;
  is_default: boolean;
  created_at?: string;
}

export interface Visit {
  id: string;
  company_id: string;
  driver_name: string;
  driver_dni: string;
  truck_plate: string;
  trailer_plate: string;
  status: string; // 'En espera', 'En tránsito', 'En área', 'Finalizado'
  current_area_id?: string;
  requested_area_id?: string;
  created_at?: string;
  updated_at?: string;
  
  // Joins
  current_area?: { name: string };
  requested_area?: { name: string };
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

  // --- Areas Management ---
  async getAreas() {
    const profile = this.currentProfileSubject.value;
    if (!profile) return { data: null, error: new Error('No profile') };
    return this.supabase.from('areas').select('*').eq('company_id', profile.company_id).order('is_default', { ascending: false }).order('name');
  }

  async createArea(name: string) {
    const profile = this.currentProfileSubject.value;
    if (!profile) return { data: null, error: new Error('No profile') };
    return this.supabase.from('areas').insert({
      company_id: profile.company_id,
      name,
      is_default: false
    }).select().single();
  }

  async deleteArea(id: string) {
    return this.supabase.from('areas').delete().eq('id', id);
  }

  // --- Visits Management ---
  async getVisits(activeOnly = true) {
    const profile = this.currentProfileSubject.value;
    if (!profile) return { data: null, error: new Error('No profile') };
    let query = this.supabase.from('visits').select(`
      *,
      current_area:current_area_id(name),
      requested_area:requested_area_id(name)
    `).eq('company_id', profile.company_id).order('created_at', { ascending: false });

    if (activeOnly) {
      query = query.neq('status', 'Finalizado');
    }
    return query;
  }

  async createVisit(visit: Partial<Visit>) {
    const profile = this.currentProfileSubject.value;
    if (!profile) return { data: null, error: new Error('No profile') };
    return this.supabase.from('visits').insert({
      ...visit,
      company_id: profile.company_id,
      status: 'En espera'
    }).select().single();
  }

  async updateVisit(id: string, updates: Partial<Visit>) {
    return this.supabase.from('visits').update(updates).eq('id', id).select().single();
  }
}
