import { Component, signal, WritableSignal, inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule, isPlatformBrowser } from '@angular/common';

import { BECADOS_DATA, PASSWORD_FIJA, USER_STORAGE_KEY } from '../../interfaces/becados';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {

  username: string = '';
  password: string = '';
  errorMessage: WritableSignal<string | null> = signal(null);

  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  login(): void {
    this.errorMessage.set(null); 

    if (this.password !== PASSWORD_FIJA) {
      this.errorMessage.set('Contraseña incorrecta.');
      return;
    }

    console.log('Usuario:', this.username);
  console.log('Contraseña ingresada:', this.password);
  console.log('Contraseña esperada:', PASSWORD_FIJA);
  
    const foundUser = BECADOS_DATA.find(
      user => user.username.toLowerCase() === this.username.toLowerCase()
    );

    if (foundUser) {
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(foundUser));
      }
      
      this.router.navigate(['/formulario']);
    } else {
      this.errorMessage.set('Usuario no encontrado. Verifica tu usuario.');
    }
  }
}
