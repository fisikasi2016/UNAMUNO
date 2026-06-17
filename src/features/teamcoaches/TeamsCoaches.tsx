import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type Team = {
  id: string;
  name: string;
  color: string | null;
};

type Coach = {
  id: string;
  display_name: string | null;
  email: string | null;
  role: string;
  team_id: string | null;
};

export function TeamsCoaches() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [showCoordinatorForm, setShowCoordinatorForm] = useState(false);

  const [teamName, setTeamName] = useState('');
  const [teamColor, setTeamColor] = useState('#f97316');

  const [coordinatorName, setCoordinatorName] = useState('');
  const [coordinatorUsername, setCoordinatorUsername] = useState('');
  const [coordinatorPassword, setCoordinatorPassword] = useState('');

  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showCoachForm, setShowCoachForm] = useState(false);

  const [coachName, setCoachName] = useState('');
  const [coachUsername, setCoachUsername] = useState('');
  const [coachPassword, setCoachPassword] = useState('');

  
  const [editingCoach, setEditingCoach] = useState<Coach | null>(null);
  const [editingCoachName, setEditingCoachName] = useState('');
  const [editingCoachUsername, setEditingCoachUsername] = useState('');
  const [editingCoachTeamId, setEditingCoachTeamId] = useState('');

  const [editingCoordinator, setEditingCoordinator] = useState<Coach | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    if (!supabase) return;

    setLoading(true);

    const [{ data: teamsData }, { data: coachesData }] =
      await Promise.all([
        supabase
          .from('teams')
          .select('id,name,color')
          .order('name'),

        supabase
          .from('profiles')
          .select('id,display_name,email,role,team_id')
          .order('display_name'),
      ]);

    setTeams((teamsData ?? []) as Team[]);
    setCoaches((coachesData ?? []) as Coach[]);

    setLoading(false);
  }

  if (loading) {
    return <p>Kargatzen...</p>;
  }

  function usernameToEmail(username: string) {
    return `${username.trim().toLowerCase()}@unamuno.com`;
  }

  function resetTeamForm() {
    setTeamName('');
    setTeamColor('#f97316');
  }

  function resetCoordinatorForm() {
    setCoordinatorName('');
    setCoordinatorUsername('');
    setCoordinatorPassword('');
  }

  async function createTeam() {
    if (!supabase) return;

    if (!teamName.trim()) {
      alert('Taldearen izena beharrezkoa da.');
      return;
    }

    const payload = {
      name: teamName.trim(),
      color: teamColor,
    };

    const { error } = editingTeam
      ? await supabase
          .from('teams')
          .update(payload)
          .eq('id', editingTeam.id)
      : await supabase.from('teams').insert(payload);

    if (error) {
      alert(error.message);
      console.error(error);
      return;
    }

    resetTeamForm();
    setEditingTeam(null);
    setShowTeamForm(false);
    await loadData();
  }

  async function createCoordinator() {
    if (!supabase) return;

    if (!coordinatorName.trim()) {
      alert('Koordinatzailearen izena beharrezkoa da.');
      return;
    }

    if (!coordinatorUsername.trim()) {
      alert('Erabiltzailea beharrezkoa da.');
      return;
    }

    if (!coordinatorPassword || coordinatorPassword.length < 6) {
      alert('Pasahitzak gutxienez 6 karaktere izan behar ditu.');
      return;
    }

    const { data, error } = await supabase.functions.invoke(
      'create-user-profile',
      {
        body: {
          displayName: coordinatorName.trim(),
          username: coordinatorUsername.trim().toLowerCase(),
          email: usernameToEmail(coordinatorUsername),
          password: coordinatorPassword,
          role: 'coordinator',
          teamId: null,
        },
      }
    );

    if (error) {
      alert(error.message);
      console.error(error);
      return;
    }

    if (data?.error) {
      alert(data.error);
      return;
    }

    resetCoordinatorForm();
    setShowCoordinatorForm(false);
    await loadData();

    alert('Koordinatzailea sortuta.');
  }

  function openEditTeam(team: Team) {
    setEditingTeam(team);
    setTeamName(team.name);
    setTeamColor(team.color ?? '#f97316');
    setShowTeamForm(true);
  }

  function openCoachForm(team: Team) {
    setSelectedTeam(team);
    setCoachName('');
    setCoachUsername('');
    setCoachPassword('');
    setShowCoachForm(true);
  }

  function openEditCoordinator(coach: Coach) {
    setEditingCoordinator(coach);
    setCoordinatorName(coach.display_name ?? '');
    setCoordinatorUsername(coach.email?.replace('@unamuno.com', '') ?? '');
    setShowCoordinatorForm(true);
  }

  async function createCoach() {
    if (!supabase || !selectedTeam) return;

    if (!coachName.trim()) {
      alert('Entrenatzailearen izena beharrezkoa da.');
      return;
    }

    if (!coachUsername.trim()) {
      alert('Erabiltzailea beharrezkoa da.');
      return;
    }

    if (!coachPassword || coachPassword.length < 6) {
      alert('Pasahitzak gutxienez 6 karaktere izan behar ditu.');
      return;
    }

    const { data, error } = await supabase.functions.invoke(
      'create-user-profile',
      {
        body: {
          displayName: coachName.trim(),
          username: coachUsername.trim().toLowerCase(),
          email: usernameToEmail(coachUsername),
          password: coachPassword,
          role: 'coach',
          teamId: selectedTeam.id,
        },
      }
    );

    if (error) {
      alert(error.message);
      console.error(error);
      return;
    }

    if (data?.error) {
      alert(data.error);
      return;
    }

    setShowCoachForm(false);
    setSelectedTeam(null);
    setCoachName('');
    setCoachUsername('');
    setCoachPassword('');
    await loadData();

    alert('Entrenatzailea sortuta.');
  }

  async function saveCoordinator() {
    if (!supabase) return;

    if (!coordinatorName.trim()) {
      alert('Koordinatzailearen izena beharrezkoa da.');
      return;
    }

    if (editingCoordinator) {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: coordinatorName.trim(),
          username: coordinatorUsername.trim().toLowerCase(),
          email: usernameToEmail(coordinatorUsername),
        })
        .eq('id', editingCoordinator.id);

      if (error) {
        alert(error.message);
        console.error(error);
        return;
      }

      resetCoordinatorForm();
      setEditingCoordinator(null);
      setShowCoordinatorForm(false);
      await loadData();
      return;
    }

    await createCoordinator();
  }

  function openEditCoach(coach: Coach) {
    setEditingCoach(coach);
    setEditingCoachName(coach.display_name ?? '');
    setEditingCoachUsername(coach.email?.replace('@unamuno.com', '') ?? '');
    setEditingCoachTeamId(coach.team_id ?? '');
  }

  async function saveCoachChanges() {
    if (!supabase || !editingCoach) return;

    if (!editingCoachName.trim()) {
      alert('Entrenatzailearen izena beharrezkoa da.');
      return;
    }

    if (!editingCoachUsername.trim()) {
      alert('Erabiltzailea beharrezkoa da.');
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: editingCoachName.trim(),
        username: editingCoachUsername.trim().toLowerCase(),
        email: usernameToEmail(editingCoachUsername),
        team_id: editingCoachTeamId || null,
      })
      .eq('id', editingCoach.id);

    if (error) {
      alert(error.message);
      console.error(error);
      return;
    }

    setEditingCoach(null);
    setEditingCoachName('');
    setEditingCoachUsername('');
    setEditingCoachTeamId('');
    await loadData();
  }

  async function removeCoachFromTeam(coach: Coach) {
    if (!supabase) return;

    const ok = window.confirm(
      `${coach.display_name ?? 'Entrenatzaile hau'} taldetik kendu nahi duzu?`
    );

    if (!ok) return;

    const { data, error } = await supabase
      .from('profiles')
      .update({ team_id: null })
      .eq('id', coach.id)
      .select();


    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }

    await loadData();
  }

  return (
    <section className="teams-coaches-page">

      <div className="section-head">
        <h2>Taldeak eta entrenatzaileak</h2>
      </div>

      <div className="button-row">
        <button onClick={() => setShowTeamForm(true)}>
          + Taldea sortu
        </button>

        <button onClick={() => setShowCoordinatorForm(true)}>
          + Koordinatzailea sortu
        </button>
      </div>

      <div className="coordinators-block">
        <div className="block-title-row">
          <h3>🎯 Koordinatzaileak</h3>
        </div>

        <div className="coordinators-grid">
          {coaches
            .filter((coach) => coach.role === 'coordinator')
            .map((coach) => (
              <article key={coach.id} className="coordinator-card">
                <div className="coordinator-avatar">
                  {coach.display_name?.charAt(0).toUpperCase() ?? 'K'}
                </div>

                <div className="coordinator-info">
                  <strong>{coach.display_name}</strong>
                  <small>Koordinatzailea</small>
                </div>

                <button
                  type="button"
                  className="ghost"
                  onClick={() => openEditCoordinator(coach)}
                >
                  Editatu
                </button>
              </article>
            ))}
        </div>
      </div>
      
      <div className="teams-block">
        <h3>🏀 Taldeak</h3>

        {teams.map((team) => {
          const teamCoaches = coaches.filter(
            (coach) =>
              coach.role === 'coach' &&
              coach.team_id === team.id
          );

          return (
            <article
              key={team.id}
              className="team-card modern-team-card"
              style={{
                borderLeft: `8px solid ${
                  team.color ?? '#f97316'
                }`,
              }}
            >
              <div className="team-header">
                <h4>{team.name}</h4>
              </div>

              <div className="team-coaches">
                {teamCoaches.length === 0 ? (
                  <p>Entrenatzailerik ez</p>
                ) : (
                  teamCoaches.map((coach) => (
                    <div key={coach.id} className="team-coach-pill">
                      <span className="coach-name">
                        👤 {coach.display_name}
                      </span>

                      <button
                        type="button"
                        className="mini-edit"
                        onClick={() => openEditCoach(coach)}
                      >
                        Editatu
                      </button>

                      <button
                        type="button"
                        className="mini-remove"
                        onClick={() => removeCoachFromTeam(coach)}
                      >
                        Kendu
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="team-actions">
                <button type="button" onClick={() => openEditTeam(team)}>
                  Editatu
                </button>

                <button type="button" onClick={() => openCoachForm(team)}>
                  + Entrenatzailea
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <div className="unassigned-coaches-block">
        <h3>👥 Talderik gabeko entrenatzaileak</h3>

        {coaches.filter((coach) => coach.role === 'coach' && !coach.team_id).length === 0 ? (
          <p className="hint">Ez dago talderik gabeko entrenatzailerik.</p>
        ) : (
          coaches
            .filter((coach) => coach.role === 'coach' && !coach.team_id)
            .map((coach) => (
              <article key={coach.id} className="coach-card">
                <strong>{coach.display_name}</strong>

                <div className="team-actions">
                  <button
                    type="button"
                    onClick={() => openEditCoach(coach)}
                  >
                    Editatu / taldera esleitu
                  </button>
                </div>
              </article>
            ))
        )}
      </div>


    {showTeamForm && (
      <div className="modal-backdrop">
        <div className="modal-card">
          <h3>{editingTeam ? 'Taldea editatu' : 'Talde berria'}</h3>

          <label>
            Taldearen izena
            <input
              value={teamName}
              onChange={(event) => setTeamName(event.target.value)}
              placeholder="Adib. Infantil Femenino A"
            />
          </label>

          <label>
            Kolorea
            <input
              type="color"
              value={teamColor}
              onChange={(event) => setTeamColor(event.target.value)}
            />
          </label>

          <div className="modal-actions">
            <button
              type="button"
              onClick={() => {
                resetTeamForm();
                setShowTeamForm(false);
              }}
            >
              Utzi
            </button>

            <button type="button" onClick={createTeam}>
              {editingTeam ? 'Gorde aldaketak' : 'Sortu'}
            </button>
          </div>
        </div>
      </div>
    )}

    {showCoordinatorForm && (
      <div className="modal-backdrop">
        <div className="modal-card">
          <h3>{editingCoordinator ? 'Koordinatzailea editatu' : 'Koordinatzaile berria'}</h3>

          <label>
            Izena
            <input
              value={coordinatorName}
              onChange={(event) => setCoordinatorName(event.target.value)}
              placeholder="Adib. Ibon Rekalde"
            />
          </label>

          <label>
            Erabiltzailea
            <input
              value={coordinatorUsername}
              onChange={(event) => setCoordinatorUsername(event.target.value)}
              placeholder="adib. ibonrec"
            />
          </label>

          <label>
            Pasahitza
            <input
              type="password"
              value={coordinatorPassword}
              onChange={(event) => setCoordinatorPassword(event.target.value)}
              placeholder="Gutxienez 6 karaktere"
            />
          </label>

          <div className="modal-actions">
            <button
              type="button"
              onClick={() => {
                resetCoordinatorForm();
                setShowCoordinatorForm(false);
              }}
            >
              Utzi
            </button>

            <button type="button" onClick={saveCoordinator}>
              Sortu
            </button>
          </div>
        </div>
      </div>
    )}

    {showCoachForm && selectedTeam && (
      <div className="modal-backdrop">
        <div className="modal-card">
          <h3>Entrenatzaile berria</h3>

          <p>
            Taldea: <strong>{selectedTeam.name}</strong>
          </p>

          <label>
            Izena
            <input
              value={coachName}
              onChange={(event) => setCoachName(event.target.value)}
              placeholder="Adib. Ane García"
            />
          </label>

          <label>
            Erabiltzailea
            <input
              value={coachUsername}
              onChange={(event) => setCoachUsername(event.target.value)}
              placeholder="adib. anegarcia"
            />
          </label>

          <label>
            Pasahitza
            <input
              type="password"
              value={coachPassword}
              onChange={(event) => setCoachPassword(event.target.value)}
              placeholder="Gutxienez 6 karaktere"
            />
          </label>

          <div className="modal-actions">
            <button
              type="button"
              onClick={() => {
                setShowCoachForm(false);
                setSelectedTeam(null);
              }}
            >
              Utzi
            </button>

            <button type="button" onClick={createCoach}>
              Sortu
            </button>
          </div>
        </div>
      </div>
    )}

    {editingCoach && (
      <div className="modal-backdrop">
        <div className="modal-card">
          <h3>Entrenatzailea editatu</h3>

          <label>
            Izena
            <input
              value={editingCoachName}
              onChange={(event) => setEditingCoachName(event.target.value)}
            />
          </label>

          <label>
            Erabiltzailea
            <input
              value={editingCoachUsername}
              onChange={(event) => setEditingCoachUsername(event.target.value)}
            />
          </label>

          <label>
            Taldea
            <select
              value={editingCoachTeamId}
              onChange={(event) => setEditingCoachTeamId(event.target.value)}
            >
              <option value="">Talderik gabe</option>

              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>

          <div className="modal-actions">
            <button
              type="button"
              onClick={() => setEditingCoach(null)}
            >
              Utzi
            </button>

            <button
              type="button"
              onClick={saveCoachChanges}
            >
              Gorde aldaketak
            </button>
          </div>
        </div>
      </div>
    )}

    </section>
  );
}