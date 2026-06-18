import { useEffect, useState } from 'react';
import { Pie, PieChart, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabase';
import { Role } from '../../types/domain';

type Team = {
  id: string;
  name: string;
  color: string;
};

type Venue = {
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

type EventItem = {
  id: string;
  team_id: string;
  type: 'training' | 'match';
  date: string;
  start_time: string;
  end_time: string | null;
  opponent: string | null;
  venue_id: string | null;
};

type AttendanceStatus = 'present' | 'absent' | 'injured';

type AttendanceItem = {
  player_id: string;
  event_id: string;
  status: AttendanceStatus;
};

type PlayerNote = {
  id: string;
  player_id: string;
  body: string;
  show_date: boolean;
  created_at: string;
};

type Session = {
  role: Role;
  teamId: string;
  teamName?: string;
};

type ModalMode = null | 'player' | 'training' | 'match';

const symbols: Record<AttendanceStatus | '', string> = {
  present: '✓',
  absent: '✕',
  injured: '🩹',
  '': '',
};

const pieColors = ['#22c55e', '#ef4444', '#9ca3af'];

export function TeamDashboard({ session }: { session: Session }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>(session.teamId);
  const [players, setPlayers] = useState<Player[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [attendance, setAttendance] = useState<AttendanceItem[]>([]);
  const [notes, setNotes] = useState<PlayerNote[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const [playerName, setPlayerName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventStart, setEventStart] = useState('');
  const [eventEnd, setEventEnd] = useState('');
  const [opponent, setOpponent] = useState('');
  const [venueId, setVenueId] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [playerDetailOpen, setPlayerDetailOpen] = useState(false);

  const isCoordinator = session.role === 'coordinator';
  const canEdit = !isCoordinator;

  const selectedPlayer =
    players.find((player) => player.id === selectedPlayerId) ?? players[0] ?? null;

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedTeamId) {
      loadTeamData(selectedTeamId);
    }
  }, [selectedTeamId]);

  useEffect(() => {
    if (!selectedPlayerId && players.length > 0) {
      setSelectedPlayerId(players[0].id);
    }

    if (selectedPlayerId && !players.some((player) => player.id === selectedPlayerId)) {
      setSelectedPlayerId(players[0]?.id ?? null);
    }
  }, [players, selectedPlayerId]);

  async function loadInitialData() {
    if (!supabase) return;

    setLoading(true);

    const { data: venueData } = await supabase
    .from('venues')
    .select('id,name')
    .order('name');

    setVenues(venueData ?? []);

    if (isCoordinator) {
      const { data: teamData, error } = await supabase
        .from('teams')
        .select('id,name,color')
        .order('name');

      if (error) {
        console.error('Teams load error:', error);
      }

      const loadedTeams = teamData ?? [];
      setTeams(loadedTeams);

      if (loadedTeams.length > 0) {
        setSelectedTeamId(loadedTeams[0].id);
      }
    } else {
      setTeams([
        {
          id: session.teamId,
          name: session.teamName ?? 'Nire taldea',
          color: '#f97316',
        },
      ]);

      setSelectedTeamId(session.teamId);
    }

    setLoading(false);
  }

  async function loadTeamData(teamId: string) {
    if (!supabase) return;

    setLoading(true);

    const [{ data: playerData, error: playerError }, { data: eventData, error: eventError }] =
      await Promise.all([
        supabase
          .from('players')
          .select(`
            id,
            name,
            team_id,
            blue_jersey_number,
            white_jersey_number
          `)
          .eq('team_id', teamId)
          .order('created_at'),

        supabase
          .from('events')
          .select('id,team_id,type,date,start_time,end_time,opponent,venue_id')
          .eq('team_id', teamId)
          .order('date', { ascending: false })
          .order('start_time', { ascending: false }),
      ]);

    if (playerError) console.error('Players load error:', playerError);
    if (eventError) console.error('Events load error:', eventError);

    const loadedPlayers = playerData ?? [];
    const loadedEvents = eventData ?? [];

    setPlayers(loadedPlayers);
    setEvents(loadedEvents);

    if (loadedPlayers.length === 0) {
      setAttendance([]);
      setNotes([]);
      setSelectedPlayerId(null);
      setLoading(false);
      return;
    }

    const [{ data: attendanceData, error: attendanceError }, { data: notesData, error: notesError }] =
      await Promise.all([
        loadedEvents.length > 0
          ? supabase
              .from('attendance')
              .select('player_id,event_id,status')
              .in(
                'player_id',
                loadedPlayers.map((player) => player.id)
              )
              .in(
                'event_id',
                loadedEvents.map((event) => event.id)
              )
          : Promise.resolve({ data: [], error: null }),

        supabase
          .from('player_notes')
          .select('id,player_id,body,show_date,created_at')
          .in(
            'player_id',
            loadedPlayers.map((player) => player.id)
          )
          .order('created_at', { ascending: false }),
      ]);

    if (attendanceError) console.error('Attendance load error:', attendanceError);
    if (notesError) console.error('Notes load error:', notesError);

    setAttendance((attendanceData ?? []) as AttendanceItem[]);
    setNotes((notesData ?? []) as PlayerNote[]);
    setLoading(false);
  }

  function resetForm() {
    setPlayerName('');
    setEventDate('');
    setEventStart('');
    setEventEnd('');
    setOpponent('');
    setVenueId('');
    setEditingPlayerId(null);
    setEditingEventId(null);
  }

  function openCreateModal(mode: ModalMode) {
    resetForm();
    setModalMode(mode);
  }

  function openEditPlayer(player: Player) {
    setEditingPlayerId(player.id);
    setPlayerName(player.name);
    setModalMode('player');
  }

  function openEditEvent(event: EventItem) {
    setEditingEventId(event.id);
    setEventDate(event.date);
    setEventStart(event.start_time === '00:00:00' ? '' : event.start_time.slice(0, 5));
    setEventEnd(event.end_time ? event.end_time.slice(0, 5) : '');
    setOpponent(event.opponent ?? '');
    setModalMode(event.type);
    setVenueId(event.venue_id ?? '');
  }

  function closeModal() {
    resetForm();
    setModalMode(null);
  }

  async function savePlayer() {
    if (!supabase || !canEdit) return;

    if (!playerName.trim()) {
      alert('Jokalariaren izena beharrezkoa da.');
      return;
    }

    const query = editingPlayerId
      ? supabase
          .from('players')
          .update({ name: playerName.trim() })
          .eq('id', editingPlayerId)
      : supabase.from('players').insert({
          name: playerName.trim(),
          team_id: selectedTeamId,
        });

    const { error } = await query;

    if (error) {
      alert('Errorea jokalaria gordetzean');
      console.error(error);
      return;
    }

    closeModal();
    await loadTeamData(selectedTeamId);
  }

  async function deletePlayer(player: Player) {
    if (!supabase || !canEdit) return;

    const ok = window.confirm(`${player.name} ezabatu nahi duzu?`);
    if (!ok) return;

    const { error } = await supabase.from('players').delete().eq('id', player.id);

    if (error) {
      alert('Errorea jokalaria ezabatzean');
      console.error(error);
      return;
    }

    await loadTeamData(selectedTeamId);
  }

  async function saveEvent(type: 'training' | 'match') {
    if (!supabase || !canEdit) return;

    if (!eventDate) {
      alert('Data aukeratu behar da.');
      return;
    }

    if (type === 'match' && !opponent.trim()) {
      alert('Aurkaria idatzi behar da.');
      return;
    }

    const payload = {
      team_id: selectedTeamId,
      type,
      date: eventDate,
      start_time: eventStart || '00:00',
      end_time: eventEnd || null,
      venue_id: venueId || null,
      opponent: type === 'match' ? opponent.trim() : null,
      home: type === 'match' ? true : null,
    };

    const query = editingEventId
      ? supabase.from('events').update(payload).eq('id', editingEventId)
      : supabase.from('events').insert(payload);

    const { error } = await query;

    if (error) {
      alert(type === 'training' ? 'Errorea entrenamendua gordetzean' : 'Errorea partida gordetzean');
      console.error(error);
      return;
    }

    closeModal();
    await loadTeamData(selectedTeamId);
  }

  async function deleteEvent(event: EventItem) {
    if (!supabase || !canEdit) return;

    const ok = window.confirm('Ekitaldi hau ezabatu nahi duzu?');
    if (!ok) return;

    const { error } = await supabase.from('events').delete().eq('id', event.id);

    if (error) {
      alert('Errorea ekitaldia ezabatzean');
      console.error(error);
      return;
    }

    await loadTeamData(selectedTeamId);
  }

  function getStatus(playerId: string, eventId: string): AttendanceStatus | '' {
    return (
      attendance.find(
        (item) => item.player_id === playerId && item.event_id === eventId
      )?.status ?? ''
    );
  }

    async function updateAttendance(
    playerId: string,
    eventId: string,
    next: AttendanceStatus | ''
    ) {
    if (!supabase || !canEdit) return;

    if (next === '') {
        const { error } = await supabase
        .from('attendance')
        .delete()
        .eq('player_id', playerId)
        .eq('event_id', eventId);

        if (error) {
        console.error('Attendance delete error:', error);
        return;
        }
    } else {
        const { error } = await supabase.from('attendance').upsert({
        player_id: playerId,
        event_id: eventId,
        status: next,
        });

        if (error) {
        console.error('Attendance upsert error:', error);
        return;
        }
    }

    await loadTeamData(selectedTeamId);
    }

    async function updateJerseyNumber(
      playerId: string,
      field: 'blue_jersey_number' | 'white_jersey_number',
      value: string
    ) {
      if (!supabase || !canEdit) return;

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
        console.error(error);
        await loadTeamData(selectedTeamId);
      }
    }

  async function addNote() {
    if (!supabase || !canEdit || !selectedPlayer) return;

    if (!noteBody.trim()) {
      alert('Oharra idatzi behar da.');
      return;
    }

    const { error } = 
    await supabase.from('player_notes').insert({
    player_id: selectedPlayer.id,
    body: noteBody,
    show_date: true,
    });

    if (error) {
      alert('Errorea oharra gordetzean');
      console.error(error);
      return;
    }

    setNoteBody('');
    await loadTeamData(selectedTeamId);
  }

  async function deleteNote(note: PlayerNote) {
    if (!supabase || !canEdit) return;

    const ok = window.confirm('Ohar hau ezabatu nahi duzu?');
    if (!ok) return;

    const { error } = await supabase.from('player_notes').delete().eq('id', note.id);

    if (error) {
      alert('Errorea oharra ezabatzean');
      console.error(error);
      return;
    }

    await loadTeamData(selectedTeamId);
  }

  function exportExcel() {
    const rows = players.map((player) => {
      const row: Record<string, string> = {
        Jokalaria: player.name,
      };

      events.forEach((event) => {
        row[getEventHeaderLines(event).join(' ')] = symbols[getStatus(player.id, event.id)];
      });

      return row;
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, 'Asistentzia');
    XLSX.writeFile(wb, 'unamuno-asistentzia.xlsx');
  }

  function formatShortDate(value: string) {
    const [, month, day] = value.split('-');
    return `${day}/${month}`;
  }

    function getEventHeaderLines(event: EventItem) {
    if (event.type === 'match') {
        return [
        event.opponent ?? 'Partida',
        formatShortDate(event.date),
        ];
    }

    return [
        'ENT',
        formatShortDate(event.date),
    ];
    }

  function getSelectedPlayerAttendance() {
    if (!selectedPlayer) {
      return [];
    }

    return attendance.filter((item) => item.player_id === selectedPlayer.id);
  }

  const selectedAttendance = getSelectedPlayerAttendance();

  const pie = [
    {
      name: 'Bertaratuta',
      value: selectedAttendance.filter((item) => item.status === 'present').length,
    },
    {
      name: 'Ez bertaratuta',
      value: selectedAttendance.filter((item) => item.status === 'absent').length,
    },
    {
      name: 'Lesioa',
      value: selectedAttendance.filter((item) => item.status === 'injured').length,
    },
  ];

  const selectedNotes = selectedPlayer
    ? notes.filter((note) => note.player_id === selectedPlayer.id)
    : [];

  return (
    <section>
      <div className="section-head">
        <h2>{isCoordinator ? 'Taldeen jarraipena' : 'Nire taldea'}</h2>
        <button onClick={exportExcel}>Excelera deskargatu</button>
      </div>

      {isCoordinator && (
        <div className="field-group">
          <label htmlFor="team-selector">Taldea aukeratu</label>

          <select
            id="team-selector"
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
      )}

      {canEdit && (
        <div className="action-grid">
          <button onClick={() => openCreateModal('player')}>+ Jokalaria</button>
          <button onClick={() => openCreateModal('training')}>+ Entrenamendua</button>
          <button onClick={() => openCreateModal('match')}>+ Partida</button>
        </div>
      )}

      {isCoordinator && (
        <p className="muted">
          Koordinatzaile moduan zaude: talde guztien jarraipena ikus dezakezu,
          baina atal honetan ezin duzu asistentzia editatu.
        </p>
      )}

      {loading ? (
        <p>Kargatzen...</p>
      ) : (
        <div className="sheet-wrap">
          <table className="sheet">
            <thead>
              <tr>
                <th>Jokalaria</th>
                <th className="jersey-header">🔵</th>
                <th className="jersey-header">⚪</th>

                {events.map((event) => (
                    <th key={event.id}>
                    <div className="event-head">
                        {getEventHeaderLines(event).map((line) => (
                        <span key={line}>{line}</span>
                        ))}

                        {canEdit && (
                        <div className="event-actions">
                            <button onClick={() => openEditEvent(event)}>✏️</button>
                            <button onClick={() => deleteEvent(event)}>🗑️</button>
                        </div>
                        )}
                    </div>
                    </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {players.map((player) => (
                <tr key={player.id}>
                  <th className="player-cell">
                    <button
                        className={
                        selectedPlayer?.id === player.id
                            ? 'player-name active'
                            : 'player-name'
                        }
                        onClick={() => {
                        setSelectedPlayerId(player.id);
                        setPlayerDetailOpen(true);
                        }}
                    >
                        {player.name}
                    </button>

                    {canEdit && (
                        <div className="player-actions">
                        <button onClick={() => openEditPlayer(player)}>✏️</button>
                        <button onClick={() => deletePlayer(player)}>🗑️</button>
                        </div>
                    )}
                    </th>
                    
                    <td className="jersey-cell">
                      {canEdit ? (
                        <input
                          className="jersey-input blue"
                          type="number"
                          min="0"
                          value={player.blue_jersey_number ?? ''}
                          onChange={(event) =>
                            updateJerseyNumber(
                              player.id,
                              'blue_jersey_number',
                              event.target.value
                            )
                          }
                        />
                      ) : (
                        player.blue_jersey_number ?? ''
                      )}
                    </td>

                    <td className="jersey-cell">
                      {canEdit ? (
                        <input
                          className="jersey-input white"
                          type="number"
                          min="0"
                          value={player.white_jersey_number ?? ''}
                          onChange={(event) =>
                            updateJerseyNumber(
                              player.id,
                              'white_jersey_number',
                              event.target.value
                            )
                          }
                        />
                      ) : (
                        player.white_jersey_number ?? ''
                      )}
                    </td>

                  {events.map((event) => (
                    <td
                        key={event.id}
                        className={`attendance-cell ${
                            getStatus(player.id, event.id) === 'present'
                            ? 'attendance-present'
                            : getStatus(player.id, event.id) === 'absent'
                            ? 'attendance-absent'
                            : getStatus(player.id, event.id) === 'injured'
                            ? 'attendance-injured'
                            : ''
                        }`}
                        >
                        {canEdit ? (
                            <select
                            className="attendance-select"
                            value={getStatus(player.id, event.id)}
                            onChange={(eventChange) =>
                                updateAttendance(
                                player.id,
                                event.id,
                                eventChange.target.value as AttendanceStatus | ''
                                )
                            }
                            >
                            <option value=""> </option>
                            <option value="present">✓</option>
                            <option value="absent">✕</option>
                            <option value="injured">🩹</option>
                            </select>
                        ) : (
                            symbols[getStatus(player.id, event.id)]
                        )}
                        </td>
                  ))}
                </tr>
              ))}

              {players.length === 0 && (
                <tr>
                  <td colSpan={events.length + 3}>
                    Oraindik ez dago jokalaririk.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

    

      {playerDetailOpen && selectedPlayer && (
        <div className="modal-backdrop">
            <div className="modal-card player-detail-modal">
            <div className="modal-title-row">
                <h3>{selectedPlayer.name}</h3>
                <button onClick={() => setPlayerDetailOpen(false)}>Itxi</button>
            </div>

            <p>
                🟢 {pie[0].value} bertaratuta · 🔴 {pie[1].value} ez bertaratuta · ⚪{' '}
                {pie[2].value} lesio
            </p>

            <div className="donut">
                <ResponsiveContainer>
                <PieChart>
                    <Pie
                        data={pie}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={35}
                        outerRadius={70}
                        >
                    {pie.map((_, index) => (
                        <Cell key={index} fill={pieColors[index]} />
                    ))}
                    </Pie>

                    <Tooltip />
                </PieChart>
                </ResponsiveContainer>
            </div>

            <h4>Oharrak</h4>

            <div className="notes-list">
                {selectedNotes.map((note) => (
                <div key={note.id} className="note-card">
                    {note.show_date && (
                    <small>{new Date(note.created_at).toLocaleDateString()}</small>
                    )}

                    <p>{note.body}</p>

                    {canEdit && <button onClick={() => deleteNote(note)}>Ezabatu</button>}
                </div>
                ))}

                {selectedNotes.length === 0 && <p className="muted">Ez dago oharrik.</p>}
            </div>

            {canEdit && (
                <div className="note-form">
                <textarea
                    value={noteBody}
                    onChange={(event) => setNoteBody(event.target.value)}
                    placeholder="Idatzi jokalariari buruzko oharra..."
                />


                <button onClick={addNote}>+ Oharra</button>
                </div>
            )}
            </div>
        </div>
        )}

      {modalMode && (
        <div className="modal-backdrop">
          <div className="modal-card">
            {modalMode === 'player' && (
              <>
                <h3>{editingPlayerId ? 'Jokalaria editatu' : 'Jokalari berria'}</h3>

                <label>
                  Izena
                  <input
                    value={playerName}
                    onChange={(event) => setPlayerName(event.target.value)}
                    placeholder="Adibidez: Ane Bilbao"
                  />
                </label>

                <div className="modal-actions">
                  <button onClick={closeModal}>Utzi</button>
                  <button onClick={savePlayer}>Gorde</button>
                </div>
              </>
            )}

            {modalMode === 'training' && (
              <>
                <h3>
                  {editingEventId ? 'Entrenamendua editatu' : 'Entrenamendu berria'}
                </h3>

                <label>
                  Data
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(event) => setEventDate(event.target.value)}
                  />
                </label>

                <label>
                  Hasiera ordua
                  <input
                    type="time"
                    value={eventStart}
                    onChange={(event) => setEventStart(event.target.value)}
                  />
                </label>

                <label>
                  Amaiera ordua
                  <input
                    type="time"
                    value={eventEnd}
                    onChange={(event) => setEventEnd(event.target.value)}
                  />
                </label>

                <label>
                    Lekua
                    <select
                        value={venueId}
                        onChange={(event) => setVenueId(event.target.value)}
                    >
                        <option value="">Aukeratu...</option>

                        {venues.map((venue) => (
                        <option key={venue.id} value={venue.id}>
                            {venue.name}
                        </option>
                        ))}
                    </select>
                </label>

                <div className="modal-actions">
                  <button onClick={closeModal}>Utzi</button>
                  <button onClick={() => saveEvent('training')}>Gorde</button>
                </div>
              </>
            )}

            {modalMode === 'match' && (
              <>
                <h3>{editingEventId ? 'Partida editatu' : 'Partida berria'}</h3>

                <label>
                  Data
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(event) => setEventDate(event.target.value)}
                  />
                </label>

                <label>
                  Hasiera ordua
                  <input
                    type="time"
                    value={eventStart}
                    onChange={(event) => setEventStart(event.target.value)}
                  />
                </label>

                <label>
                  Amaiera ordua
                  <input
                    type="time"
                    value={eventEnd}
                    onChange={(event) => setEventEnd(event.target.value)}
                  />
                </label>

                <label>
                    Lekua
                    <select
                        value={venueId}
                        onChange={(event) => setVenueId(event.target.value)}
                    >
                        <option value="">Aukeratu...</option>

                        {venues.map((venue) => (
                        <option key={venue.id} value={venue.id}>
                            {venue.name}
                        </option>
                        ))}
                    </select>
                </label>

                <label>
                  Aurkaria
                  <input
                    value={opponent}
                    onChange={(event) => setOpponent(event.target.value)}
                    placeholder="Adibidez: Askartza"
                  />
                </label>

                <div className="modal-actions">
                  <button onClick={closeModal}>Utzi</button>
                  <button onClick={() => saveEvent('match')}>Gorde</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}