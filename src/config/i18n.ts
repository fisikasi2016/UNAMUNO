export const defaultLanguage = 'eu';
export const languageSwitcherVisible = false;
export const t = {
  eu: { appName:'Unamuno Kluba', login:'Sartu', email:'Emaila', password:'Pasahitza', logout:'Irten', team:'Nire taldea', coordinatorTeam:'Taldeen jarraipena', weekend:'Asteburuko partidak', schedules:'Ordutegiak', resources:'Baliabideak', news:'Berriak', changes:'Aldaketa eskaerak' },
  es: { appName:'Club Unamuno', login:'Entrar', email:'Email', password:'Contraseña', logout:'Salir', team:'Mi equipo', coordinatorTeam:'Seguimiento equipos', weekend:'Partidos del fin de semana', schedules:'Horarios', resources:'Recursos', news:'Noticias', changes:'Peticiones de cambio' }
};
export type Lang = keyof typeof t;
