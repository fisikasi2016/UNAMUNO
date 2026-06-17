import {
  Bell,
  KeyRound,
  CalendarDays,
  Dumbbell,
  Newspaper,
  Repeat,
  Trophy,
  Users,
  House,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { AuthScreen } from '../features/auth/AuthScreen';
import { ChangeRequests } from '../features/changeRequests/ChangeRequests';
import { Matches } from '../features/matches/Matches';
import { News } from '../features/news/News';
import { NotificationsPanel } from '../features/notifications/NotificationsPanel';
import { Resources } from '../features/resources/Resources';
import { Schedules } from '../features/schedules/Schedules';
import { TeamDashboard } from '../features/team/TeamDashboard';
import { Passwords } from '../features/passwords/Passwords';
import { t } from '../config/i18n';
import { supabase } from '../lib/supabase';
import { Role } from '../types/domain';
import { Home } from '../features/home/Home';
import { TeamsCoaches } from '../features/teamcoaches/TeamsCoaches';

type Page =
  | 'home'
  | 'team'
  | 'matches'
  | 'schedules'
  | 'resources'
  | 'news'
  | 'changes'
  | 'passwords'
  | 'teams-coaches';

type AppSession = {
  role: Role;
  teamId: string;
  teamName: string;
};

const labels = t.eu;

export function App() {
  const [session, setSession] = useState<AppSession | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [page, setPage] = useState<Page>('home');
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  async function logout() {
    if (supabase) {
      await supabase.auth.signOut();
    }

    setSession(null);
  }

  async function loadSession() {
    if (!supabase) {
      setSession(null);
      setLoadingSession(false);
      return;
    }

    const {
      data: { session: authSession },
    } = await supabase.auth.getSession();

    if (!authSession?.user) {
      setSession(null);
      setLoadingSession(false);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select(
        `
        role,
        team_id,
        teams (
          name
        )
      `
      )
      .eq('id', authSession.user.id)
      .single();
    

    if (error || !data) {
      console.error('Profile load error:', error);
      setSession(null);
      setLoadingSession(false);
      return;
    }

    const teamRelation = Array.isArray(data.teams)
      ? data.teams[0]
      : data.teams;

    setSession({
      role: data.role as Role,
      teamId: data.team_id,
      teamName: teamRelation?.name ?? 'Unamuno',
    });

    setLoadingSession(false);
  }

  useEffect(() => {
    loadSession();

    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadSession();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loadingSession) {
    return (
      <section className="login-screen">
        <div className="login-card">
          <div className="ball">🏀</div>
          <h1>Unamuno Kluba</h1>
          <p>Saioa egiaztatzen...</p>
        </div>
      </section>
    );
  }

  if (!session) {
    return <AuthScreen onLogin={loadSession} />;
  }

  type NavItem = [Page, string, typeof Users];

  const items: NavItem[] = [
    ['home', 'Hasiera', House],
  ];

  if (session.role === 'coordinator') {
    items.push(['teams-coaches', 'Taldeak', Users]);
  }

  items.push(
    ['team', session.role === 'coordinator' ? labels.coordinatorTeam : labels.team, Users],
    ['schedules', labels.schedules, CalendarDays],
    ['matches', labels.weekend, Trophy],
    ['resources', labels.resources, Dumbbell],
    ['news', labels.news, Newspaper],
    ['changes', labels.changes, Repeat]
  );

  if (session.role === 'coordinator') {
    items.push(['passwords', 'Pasahitzak', KeyRound]);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Unamuno Saskibaloia</p>
          <h1>{labels.appName}</h1>
          <span>
            {session.teamName} ·{' '}
            {session.role === 'coordinator' ? 'Koordinatzailea' : 'Entrenatzailea'}
          </span>
        </div>

        <button
          className="icon-button"
          onClick={() => setNotificationsOpen(!notificationsOpen)}
          aria-label="Jakinarazpenak"
        >
          <Bell size={22} />
          <strong>1</strong>
        </button>
        <button
          onClick={logout}
          style={{
            marginLeft: '8px',
            padding: '8px 12px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Irten
        </button>
      </header>

      {notificationsOpen && (
        <NotificationsPanel role={session.role} teamId={session.teamId} />
      )}

      <main className="content-card">
        {page === 'home' && (
          <Home session={session} goTo={setPage} />
        )}
        {page === 'team' && <TeamDashboard session={session} />}
        {page === 'matches' && <Matches session={session} />}
        {page === 'schedules' && <Schedules session={session} />}
        {page === 'resources' && <Resources session={session} />}
        {page === 'news' && <News session={session} />}
        {page === 'changes' && <ChangeRequests session={session} />}
        {page === 'teams-coaches' && <TeamsCoaches />}
        {page === 'passwords' && <Passwords />}
      </main>

      <nav className="bottom-nav">
        {items.map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setPage(id)}
            className={page === id ? 'active' : ''}
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}