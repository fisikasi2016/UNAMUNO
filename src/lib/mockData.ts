import { Attendance, ChangeRequest, NewsPost, Notification, Player, Resource, TeamEvent } from '../types/domain';
export const sessionMock = { role:'coach' as const, teamId:'senior-fem-nac', teamName:'Senior Femenino Nacional' };
export const players: Player[] = [
{id:'p1',teamId:'senior-fem-nac',name:'Ane Bilbao',category:'Senior',notes:[{id:'n1',text:'Oso ondo entrenatu du aste honetan.',createdAt:'2026-06-08',showDate:true}]},
{id:'p2',teamId:'senior-fem-nac',name:'June Perez',category:'Senior',notes:[]},
{id:'p3',teamId:'senior-fem-nac',name:'Maddi Ruiz',category:'Senior',notes:[]}
];
export const events: TeamEvent[] = [
{id:'e1',teamId:'senior-fem-nac',type:'training',date:'2026-06-09',start:'18:00',end:'19:30',venue:'La Casilla'},
{id:'e2',teamId:'senior-fem-nac',type:'training',date:'2026-06-11',start:'19:30',end:'21:00',venue:'Sarriko'},
{id:'e3',teamId:'senior-fem-nac',type:'match',date:'2026-06-13',start:'12:00',venue:'La Casilla',opponent:'Askartza',home:true}
];
export const attendance: Attendance[] = [{playerId:'p1',eventId:'e1',status:'present'},{playerId:'p2',eventId:'e1',status:'absent'},{playerId:'p3',eventId:'e1',status:'injured'}];
export const resources: Resource[] = [
{id:'r1',kind:'clinic',title:'Pick and roll irakurketa',description:'YouTubeko clinic laburra.',tags:['erasoa','spacing'],url:'https://youtube.com',authorTeamId:'senior-fem-nac',createdAt:'2026-06-01'},
{id:'r2',kind:'task',title:'3x2 abantaila jarraitua',description:'Trantsizio ariketa intentsiboa.',tags:['trantsizioa','3x2'],authorTeamId:'junior-fem-a',createdAt:'2026-06-02'}
];
export const news: NewsPost[] = [{id:'b1',title:'Denboraldi amaierako bilera',body:'Koordinazio oharra eta hurrengo asteetako lanak.',authorTeamId:'senior-fem-nac',createdAt:'2026-06-07'}];
export const changes: ChangeRequest[] = [{id:'c1',type:'match',teamId:'senior-fem-nac',previous:'Larunbata 12:00 La Casilla',requested:'Igandea 10:00 Sarriko',reason:'Jokalari falta.',status:'sin_leer',createdAt:'2026-06-08'}];
export const notifications: Notification[] = [{id:'no1',title:'Ordutegi talka',body:'Senior Femenino Nacional eta Junior Femenino A ordu berean daude.',targetRole:'coordinator',read:false,createdAt:'2026-06-08'}];
