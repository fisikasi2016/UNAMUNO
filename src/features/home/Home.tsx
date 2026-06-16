import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type Props = {
  session: {
    teamId: string;
    teamName: string;
    role: string;
  };
  goTo: (page: any) => void;
};

export function Home({ session, goTo }: Props) {
  const [coaches, setCoaches] = useState<any[]>([]);

  useEffect(() => {
    loadCoaches();
  }, []);

  async function loadCoaches() {
    if (!supabase) return;

    const { data } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('team_id', session.teamId);

    setCoaches(data ?? []);
  }

  return (
    <section className="home-page">
      <div className="home-hero">
        <h2>{session.teamName}</h2>
        <p>
          {session.role === 'coordinator'
            ? 'Koordinatzaile panela'
            : 'Entrenatzaileen panela'}
        </p>
      </div>

      <div className="coach-list">
        <h3>Entrenatzaileak</h3>

        {coaches.map((coach, index) => (
          <div key={index} className="coach-item">
            {coach.display_name}
          </div>
        ))}
      </div>

      <div className="home-grid">
        <button onClick={() => goTo('team')}>
            <span>👥</span>
            <strong>Nire taldea</strong>
            <small>Jokalariak eta jarraipena</small>
        </button>

        <button onClick={() => goTo('matches')}>
            <span>🏆</span>
            <strong>Asteburuko partidak</strong>
            <small>Partidak eta emaitzak</small>
        </button>

        <button onClick={() => goTo('schedules')}>
            <span>📅</span>
            <strong>Ordutegiak</strong>
            <small>Entrenamenduak</small>
        </button>

        <button onClick={() => goTo('resources')}>
            <span>🏀</span>
            <strong>Baliabideak</strong>
            <small>Ariketak eta materialak</small>
        </button>

        <button onClick={() => goTo('news')}>
            <span>📰</span>
            <strong>Berriak</strong>
            <small>Klubeko albisteak</small>
        </button>

        <button onClick={() => goTo('changes')}>
            <span>🔁</span>
            <strong>Aldaketa eskaerak</strong>
            <small>Ordutegi eta partida aldaketak</small>
        </button>

        {session.role === 'coordinator' && (
        <button onClick={() => goTo('passwords')}>
            <span>🔑</span>
            <strong>Pasahitzak</strong>
            <small>Erabiltzaileen pasahitzak kudeatu</small>
        </button>
        )}
        </div>

    </section>
  );
}