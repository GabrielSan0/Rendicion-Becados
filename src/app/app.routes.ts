import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { FormularioComponent } from './components/formulario/formulario.component';
import { authGuard } from '../app/auth.guard'; 

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { 
    path: 'formulario', 
    component: FormularioComponent,
    canActivate: [authGuard]
  },
  { path: '**', redirectTo: '/login' }
];