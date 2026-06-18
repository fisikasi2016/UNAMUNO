import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type Team = {
  id: string;
  name: string;
};

type Player = {
  id: string;
  name: string;
  team_id: string;
  blue_jersey_number: number | null;
  white_jersey_number: number | null;
};

export function Kits({ session }: { session: any }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState(session.teamId);
  const [loading, setLoading] = useState(true);

  const isCoordinator = session.role === 'coordinator';

  useEffect(() => {
    loadTeams();
  }, []);

  useEffect(() => {
    if (selectedTeamId) {
      loadPlayers(selectedTeamId);
    }
  }, [selectedTeamId]);

  async function loadTeams() {
    if (!supabase) return;

    setLoading(true);

    if (isCoordinator) {
      const { data, error } = await supabase
        .from('teams')
        .select('id,name')
        .order('name');

      if (error) {
        alert(error.message);
        console.error(error);
        setLoading(false);
        return;
      }

      setTeams(data ?? []);

      if (!selectedTeamId && data && data.length > 0) {
        setSelectedTeamId(data[0].id);
      }
    } else {
      setTeams([
        {
          id: session.teamId,
          name: session.teamName ?? 'Nire taldea',
        },
      ]);

      setSelectedTeamId(session.teamId);
    }

    setLoading(false);
  }

  async function loadPlayers(teamId: string) {
    if (!supabase) return;

    const { data, error } = await supabase
      .from('players')
      .select(
        `
        id,
        name,
        team_id,
        blue_jersey_number,
        white_jersey_number
      `
      )
      .eq('team_id', teamId)
      .order('name');

    if (error) {
      alert(error.message);
      console.error(error);
      return;
    }

    setPlayers((data ?? []) as Player[]);
  }

  async function updateJersey(
    playerId: string,
    field: 'blue_jersey_number' | 'white_jersey_number',
    value: string
  ) {
    if (!supabase) return;

    const cleanValue = value === '' ? null : Number(value);

    setPlayers((current) =>
      current.map((player) =>
        player.id === playerId
          ? {
              ...player,
              [field]: cleanValue,
            }
          : player
      )
    );

    const { error } = await supabase
      .from('players')
      .update({
        [field]: cleanValue,
      })
      .eq('id', playerId);

    if (error) {
      alert(error.message);
      console.error(error);
      await loadPlayers(selectedTeamId);
    }
  }

  return (
    <section>
      <div className="section-head">
        <h2>Ekipazioak</h2>
      </div>

      <div className="field-group">
        <label htmlFor="kit-team-selector">Taldea aukeratu</label>

        <select
          id="kit-team-selector"
          value={selectedTeamId}
          onChange={(event) => setSelectedTeamId(event.target.value)}
        >
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p>Kargatzen...</p>
      ) : (
        <div className="kit-table-wrap">
          <table className="kit-table">
            <thead>
              <tr>
                <th>Jokalaria</th>
                <th>🔵Ekipazio urdina</th>
                <th>⚪ Ekipazio zuria</th>
              </tr>
            </thead>

            <tbody>
              {players.map((player) => (
                <tr key={player.id}>
                  <td>
                    <strong>{player.name}</strong>
                  </td>

                  <td>
                    <input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={player.blue_jersey_number ?? ''}
                      onChange={(event) =>
                        updateJersey(
                          player.id,
                          'blue_jersey_number',
                          event.target.value
                        )
                      }
                    />
                  </td>

                  <td>
                    <input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={player.white_jersey_number ?? ''}
                      onChange={(event) =>
                        updateJersey(
                          player.id,
                          'white_jersey_number',
                          event.target.value
                        )
                      }
                    />
                  </td>
                </tr>
              ))}

              {players.length === 0 && (
                <tr>
                  <td colSpan={3}>Talde honetan ez dago jokalaririk.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}