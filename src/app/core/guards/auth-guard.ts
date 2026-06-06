import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Supabase } from '../services/supabase';
import { map, take } from 'rxjs/operators';

export const authGuard: CanActivateFn = (route, state) => {
  const supabaseService = inject(Supabase);
  const router = inject(Router);

  return supabaseService.currentUser$.pipe(
    take(1),
    map(user => {
      if (user) {
        return true;
      } else {
        const u = supabaseService.getUser();
        if (u) return true;
        
        return router.parseUrl('/login');
      }
    })
  );
};
