import { inject } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, CanActivateFn } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';

import { USER_STORAGE_KEY } from '../app/interfaces/becados';

export const authGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
) => {
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  if (isPlatformBrowser(platformId)) {
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    
    if (storedUser) {
      // Usuario autenticado, permite el acceso
      return true;
    } else {
      // Usuario no autenticado, redirige al login
      router.navigate(['/login']);
      return false;
    }
  }
  
  // Si no está en el navegador, no permite acceso
  router.navigate(['/login']);
  return false;
};