import { AuthUser } from '../interfaces/auth.interface'; 

export const BECADOS_DATA: AuthUser[] = [
  // 15 Becados
  { username: 'lsanchez', name: 'Lucas Sanchez', dni: '71347877' }, 
  
  // Otros becados con DNI placeholder
  { username: 'jperez', name: 'Juan Perez', dni: '70000001' },
  { username: 'amartinez', name: 'Andrea Martinez', dni: '70000002' },
  { username: 'jrodriguez', name: 'Javier Rodriguez', dni: '70000003' },
  { username: 'glopez', name: 'Gabriela Lopez', dni: '70000004' },
  { username: 'mhernandez', name: 'Manuel Hernandez', dni: '70000005' },
  { username: 'cgonzalez', name: 'Carmen Gonzalez', dni: '70000006' },
  { username: 'dramos', name: 'Diego Ramos', dni: '70000007' },
  { username: 'rvelasquez', name: 'Rosa Velasquez', dni: '70000008' },
  { username: 'sbravo', name: 'Sofia Bravo', dni: '70000009' },
  { username: 'emorales', name: 'Enrique Morales', dni: '70000010' },
  { username: 'cguerrero', name: 'Claudia Guerrero', dni: '70000011' },
  { username: 'aarias', name: 'Alejandro Arias', dni: '70000012' },
  { username: 'jflores', name: 'Juliana Flores', dni: '70000013' },
  { username: 'vhuanca', name: 'Victor Huanca', dni: '70000014' },
];

export const PASSWORD_FIJA = 'Colquisiri2025$$';
export const USER_STORAGE_KEY = 'currentUser';