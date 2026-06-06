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
    
    // Check active session
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
}
