import { AuthUser } from '../interfaces/auth.interface';

export const BECADOS_DATA: AuthUser[] = [
  // 15 Becados
  { username: 'lsanchez', name: 'Lucas Sanchez', dni: '71347877' },

  // Otros becados con DNI placeholder
  { username: 'eperez', name: 'Esmeralda Pérez Gómez', dni: '60338189' },
  { username: 'icosme', name: 'Isabel Yesenia Cosme Garcilazo', dni: '61088077' },
  { username: 'aflores', name: 'Anyeli Flores Pino', dni: '60774149' },
  { username: 'jcastillo', name: 'Franklin Olortegui Dominguez', dni: '60022089' },
  { username: 'yreyquez', name: 'Yeff Yayko Requez Flores', dni: '60623170' },
  { username: 'naldana', name: 'Nicol Sharlot Aldana Huaraca', dni: '61253853' },
  { username: 'jsaavedra', name: 'Jhordan Michael Saavedra Condori', dni: '61091722' },
  { username: 'aavendaño', name: 'Avelino Avendaño Jearen', dni: '61035191' },
  { username: 'jmontañez', name: 'Jefferson Montañez Roque', dni: '61201006' },
  { username: 'jrodriguez', name: 'Dennis Jhordan Rodriguez Rosales', dni: '61111104' },
  { username: 'svergara', name: 'Stefany Jarumi Vergara Paredes', dni: '60853167' },
  { username: 'tvillanueva', name: 'Tatiana Sofia Villanueva Povis', dni: '60479674' },
  { username: 'frodriguez', name: 'Fernando Rodriguez Malvas', dni: '63301006' },
  { username: 'mcarhuas', name: 'Margarita Samar Carhuas', dni: '60567906' },
  { username: 'lchavez', name: 'Luz Yadira Chavez Ramirez', dni: '60228196' },
  { username: 'jperez', name: 'Jairo Irven Perez Huiza', dni: '61276579' },
  { username: 'kluicho', name: 'Kristel Yassady Luicho Tarazona', dni: '61027487' },
  { username: 'cchavez', name: 'Caterin Diana Chavez Ferrer', dni: '61111296' },

];

export const PASSWORD_FIJA = 'Colquisiri2025$$';
export const USER_STORAGE_KEY = 'currentUser';