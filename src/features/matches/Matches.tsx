import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';

type Team = {
  id: string;
  name: string;
  color: string;
};

type Venue = {
  id: string;
  name: string;
};

type WeekendMatch = {
  id: string;
  team_id: string;
  venue_id: string | null;
  date: string;
  start_time: string;
  end_time: string | null;
  opponent: string;
  home: boolean;
  teams?: {
  name: string;
  color: string;
  } | null;
  venues?: {
    name: string;
  } | null;
};

type MatchModalMode = null | 'create' | 'edit';

export function Matches({ session }: { session: any }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [matches, setMatches] = useState<WeekendMatch[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState('');
  const [loading, setLoading] = useState(true);

  const [modalMode, setModalMode] = useState<MatchModalMode>(null);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);

  const [teamId, setTeamId] = useState('');
  const [venueId, setVenueId] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [opponent, setOpponent] = useState('');
  const [selectedWeekendDate, setSelectedWeekendDate] = useState(
    toIsoDate(new Date())
  );

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    if (!supabase) return;

    setLoading(true);

    const [
      { data: teamData, error: teamError },
      { data: venueData, error: venueError },
      { data: matchData, error: matchError },
    ] = await Promise.all([
      supabase.from('teams').select('id,name,color').order('name'),
      supabase.from('venues').select('id,name').order('name'),
      supabase
        .from('weekend_matches')
        .select(
          `
          id,
          team_id,
          venue_id,
          date,
          start_time,
          end_time,
          opponent,
          home,
         teams (
         name,
         color
         ),
          venues (
            name
          )
        `
        )
        .order('date')
        .order('start_time'),
    ]);

    if (teamError) console.error('Teams error:', teamError);
    if (venueError) console.error('Venues error:', venueError);
    if (matchError) console.error('Matches error:', matchError);

    const loadedTeams = teamData ?? [];
    const loadedVenues = venueData ?? [];

    setTeams(loadedTeams);
    const orderedVenues = [...loadedVenues].sort((a, b) => {
        if (a.name === 'Partidos fuera de casa') return 1;
        if (b.name === 'Partidos fuera de casa') return -1;
        return a.name.localeCompare(b.name);
    });

        setVenues(orderedVenues);
    setMatches((matchData ?? []) as unknown as WeekendMatch[]);

    if (!selectedVenueId && loadedVenues.length > 0) {
      setSelectedVenueId(loadedVenues[0].id);
    }

    setLoading(false);
  }

  function resetForm() {
    setEditingMatchId(null);
    setTeamId('');
    setVenueId(selectedVenueId);
    setDate('');
    setStartTime('');
    setOpponent('');
  }

  function openCreateModal() {
    resetForm();
    setModalMode('create');
  }

  function openEditModal(match: WeekendMatch) {
    setEditingMatchId(match.id);
    setTeamId(match.team_id);
    setVenueId(match.venue_id ?? '');
    setDate(match.date);
    setStartTime(match.start_time.slice(0, 5));
    setOpponent(match.opponent);
    setModalMode('edit');
  }

  function closeModal() {
    resetForm();
    setModalMode(null);
  }

  async function saveMatch() {
    if (!supabase) return;

    if (!teamId) {
      alert('Taldea aukeratu behar da.');
      return;
    }

    if (!venueId) {
      alert('Lekua aukeratu behar da.');
      return;
    }

    if (!date) {
      alert('Data aukeratu behar da.');
      return;
    }

    if (!startTime) {
      alert('Ordua aukeratu behar da.');
      return;
    }

    if (!opponent.trim()) {
      alert('Aurkaria idatzi behar da.');
      return;
    }

    const payload = {
      team_id: teamId,
      venue_id: venueId,
      date,
      start_time: startTime,
      end_time: addMinutesToTime(startTime, 90),
      opponent: opponent.trim(),
      created_by: session?.userId ?? null,
    };

    const query = editingMatchId
      ? supabase.from('weekend_matches').update(payload).eq('id', editingMatchId)
      : supabase.from('weekend_matches').insert(payload);

    const { error } = await query;

    if (error) {
      alert('Errorea partida gordetzean.');
      console.error(error);
      return;
    }

    closeModal();
    await loadInitialData();
  }

  async function deleteMatch(match: WeekendMatch) {
    if (!supabase) return;

    const ok = window.confirm('Partida hau ezabatu nahi duzu?');
    if (!ok) return;

    const { error } = await supabase
      .from('weekend_matches')
      .delete()
      .eq('id', match.id);

    if (error) {
      alert('Errorea partida ezabatzean.');
      console.error(error);
      return;
    }

    await loadInitialData();
  }

    function getWeekendDates(baseDateString: string) {
    const baseDate = new Date(`${baseDateString}T12:00:00`);
    const day = baseDate.getDay();

    const saturday = new Date(baseDate);
    const distanceToSaturday = day === 6 ? 0 : day === 0 ? -1 : 6 - day;
    saturday.setDate(baseDate.getDate() + distanceToSaturday);

    const sunday = new Date(saturday);
    sunday.setDate(saturday.getDate() + 1);

    return {
        saturday: toIsoDate(saturday),
        sunday: toIsoDate(sunday),
    };
    }

    function getEarliestWeekendMinutes() {
        const allWeekendMatches = [...saturdayMatches, ...sundayMatches];

        if (allWeekendMatches.length === 0) {
            return 8 * 60;
        }

        return Math.min(
            ...allWeekendMatches.map((match) => {
            const [hours, minutes] = match.start_time.split(':').map(Number);
            return hours * 60 + minutes;
            })
        );
    }

    function toIsoDate(value: Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
    }

  function formatDate(value: string) {
    const [, month, day] = value.split('-');
    return `${day}/${month}`;
  }

  function addMinutesToTime(time: string, minutes: number) {
    const [hours, mins] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, mins + minutes, 0, 0);

    return `${String(date.getHours()).padStart(2, '0')}:${String(
        date.getMinutes()
    ).padStart(2, '0')}`;
    }

  const weekend = getWeekendDates(selectedWeekendDate);

  const selectedVenueName =
    venues.find((venue) => venue.id === selectedVenueId)?.name ?? '';

  function moveWeekend(days: number) {
    const current = new Date(`${selectedWeekendDate}T12:00:00`);
    current.setDate(current.getDate() + days);
    setSelectedWeekendDate(toIsoDate(current));
    }

    function getGridRowForTime(time: string) {
    const [hours, minutes] = time.split(':').map(Number);
    const earliestMinutes = getEarliestWeekendMinutes();
    const currentMinutes = hours * 60 + minutes;

    const slot = Math.max(0, Math.floor((currentMinutes - earliestMinutes) / 30));

    return `${slot + 2} / span 3`;
    }

  const filteredMatches = useMemo(() => {
    return matches.filter(
      (match) =>
        match.venue_id === selectedVenueId &&
        (match.date === weekend.saturday || match.date === weekend.sunday)
    );
  }, [matches, selectedVenueId, weekend.saturday, weekend.sunday]);

    const saturdayMatches =
    selectedVenueName === 'Partidos fuera de casa'
        ? filteredMatches
            .filter((match) => match.date === weekend.saturday)
            .sort((a, b) =>
            a.start_time.localeCompare(b.start_time)
            )
        : filteredMatches.filter(
            (match) => match.date === weekend.saturday
        );

    const sundayMatches =
    selectedVenueName === 'Partidos fuera de casa'
        ? filteredMatches
            .filter((match) => match.date === weekend.sunday)
            .sort((a, b) =>
            a.start_time.localeCompare(b.start_time)
            )
        : filteredMatches.filter(
            (match) => match.date === weekend.sunday
        );

  function getMatchTitle(match: WeekendMatch) {
    const teamName = match.teams?.name ?? 'Unamuno';

    return match.home
      ? `${teamName} - ${match.opponent}`
      : `${match.opponent} - ${teamName}`;
  }

    function renderMatchCard(match: WeekendMatch) {
    const isAwayVenue = selectedVenueName === 'Partidos fuera de casa';
    const teamColor = match.teams?.color ?? '#94a3b8';

    const cardStyle = {
        ...(isAwayVenue ? {} : { gridRow: getGridRowForTime(match.start_time) }),
        backgroundColor: `${teamColor}22`,
        borderColor: `${teamColor}55`,
    };

    return (
        <article
        className={isAwayVenue ? 'weekend-card away-card' : 'weekend-card'}
        style={cardStyle}
        key={match.id}
        onClick={() => openEditModal(match)}
        >
        <strong>{match.teams?.name ?? 'Taldea'}</strong>
        <span>{match.opponent}</span>
        <small>{match.start_time.slice(0, 5)}</small>
        </article>
    );
    }

  function exportWeekendMatches() {
    const weekendMatches = matches
      .filter(
        (match) =>
          match.date === weekend.saturday ||
          match.date === weekend.sunday
      )
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.start_time.localeCompare(b.start_time);
      });

    if (weekendMatches.length === 0) {
      alert('Asteburu honetan ez dago partidarik esportatzeko.');
      return;
    }

    const awayVenueName = 'Partidos fuera de casa';

    const grouped = venues
      .map((venue) => {
        const venueMatches = weekendMatches.filter(
          (match) => match.venue_id === venue.id
        );

        return {
          venue,
          matches: venueMatches,
        };
      })
      .filter((group) => group.matches.length > 0)
      .sort((a, b) => {
        const aIsAway = a.venue.name === awayVenueName;
        const bIsAway = b.venue.name === awayVenueName;

        if (aIsAway && !bIsAway) return 1;
        if (!aIsAway && bIsAway) return -1;

        return b.matches.length - a.matches.length;
      });

    const formatDayName = (dateValue: string) =>
      dateValue === weekend.saturday
        ? `Larunbata ${formatDate(weekend.saturday)}`
        : `Igandea ${formatDate(weekend.sunday)}`;

    const renderMatchRow = (match: WeekendMatch) => {
      const teamName = match.teams?.name ?? 'Taldea';
      const color = match.teams?.color ?? '#94a3b8';
      const title = match.home
        ? `${teamName} - ${match.opponent}`
        : `${match.opponent} - ${teamName}`;

      return `
        <div class="match-row">
          <div class="team-color" style="background:${color}"></div>
          <div class="match-time">${match.start_time.slice(0, 5)}</div>
          <div class="match-title">${escapeHtml(title)}</div>
        </div>
      `;
    };

    const venueSections = grouped
      .map((group) => {
        const saturday = group.matches
          .filter((match) => match.date === weekend.saturday)
          .sort((a, b) => a.start_time.localeCompare(b.start_time));

        const sunday = group.matches
          .filter((match) => match.date === weekend.sunday)
          .sort((a, b) => a.start_time.localeCompare(b.start_time));

        const venueTitle =
          group.venue.name === awayVenueName
            ? '🚍 KANPOKO PARTIDAK'
            : `🏟️ ${escapeHtml(group.venue.name)}`;

        return `
          <section class="venue-section">
            <div class="venue-header">
              <h2>${venueTitle}</h2>
              <span>${group.matches.length} partida</span>
            </div>

            ${
              saturday.length > 0
                ? `
                  <h3>${formatDayName(weekend.saturday)}</h3>
                  ${saturday.map(renderMatchRow).join('')}
                `
                : ''
            }

            ${
              sunday.length > 0
                ? `
                  <h3>${formatDayName(weekend.sunday)}</h3>
                  ${sunday.map(renderMatchRow).join('')}
                `
                : ''
            }
          </section>
        `;
      })
      .join('');

    const printableHtml = `
      <!doctype html>
      <html lang="eu">
        <head>
          <meta charset="utf-8" />
          <title>Asteburuko partidak</title>

          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 28px;
              font-family: Inter, Arial, sans-serif;
              color: #0f172a;
              background: #f8fafc;
            }

            .page {
              max-width: 900px;
              margin: 0 auto;
              background: white;
              border-radius: 24px;
              padding: 28px;
              border: 1px solid #e2e8f0;
            }

            .main-header {
              display: flex;
              justify-content: space-between;
              gap: 20px;
              align-items: flex-start;
              border-bottom: 3px solid #0f172a;
              padding-bottom: 18px;
              margin-bottom: 22px;
            }

            .eyebrow {
              margin: 0;
              color: #f97316;
              font-weight: 900;
              letter-spacing: .08em;
              text-transform: uppercase;
              font-size: 12px;
            }

            h1 {
              margin: 4px 0 0;
              font-size: 32px;
            }

            .weekend-date {
              font-weight: 900;
              color: #475569;
              text-align: right;
            }

            .venue-section {
              break-inside: avoid;
              border: 1px solid #dbe3ef;
              border-radius: 18px;
              padding: 16px;
              margin-bottom: 18px;
              background: #ffffff;
            }

            .venue-header {
              display: flex;
              justify-content: space-between;
              gap: 12px;
              align-items: center;
              margin-bottom: 12px;
            }

            .venue-header h2 {
              margin: 0;
              font-size: 20px;
            }

            .venue-header span {
              background: #fff7ed;
              color: #f97316;
              border-radius: 999px;
              padding: 7px 11px;
              font-size: 13px;
              font-weight: 900;
            }

            h3 {
              margin: 16px 0 8px;
              font-size: 15px;
              color: #475569;
              text-transform: uppercase;
              letter-spacing: .04em;
            }

            .match-row {
              display: grid;
              grid-template-columns: 8px 58px 1fr;
              gap: 10px;
              align-items: center;
              padding: 9px 0;
              border-bottom: 1px solid #e2e8f0;
            }

            .match-row:last-child {
              border-bottom: none;
            }

            .team-color {
              width: 8px;
              height: 32px;
              border-radius: 999px;
            }

            .match-time {
              font-weight: 900;
            }

            .match-title {
              font-weight: 800;
            }

            @media print {
              body {
                background: white;
                padding: 0;
              }

              .page {
                border: none;
                border-radius: 0;
                padding: 18mm;
                max-width: none;
              }

              .venue-section {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>

        <body>
          <main class="page">
            <header class="main-header">
              <div>
                <p class="eyebrow">Unamuno Saskibaloia</p>
                <h1>Asteburuko partidak</h1>
              </div>

              <div class="weekend-date">
                ${formatDate(weekend.saturday)} - ${formatDate(weekend.sunday)}
              </div>
            </header>

            ${venueSections}
          </main>

          <script>
            window.onload = () => {
              window.print();
            };
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');

    if (!printWindow) {
      alert('Ezin izan da esportazio leihoa ireki.');
      return;
    }

    printWindow.document.open();
    printWindow.document.write(printableHtml);
    printWindow.document.close();
  }

  function escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  return (
    <section>
      <div className="section-head">
        <h2>Asteburuko partidak</h2>

        <div className="button-row-inline">
          {session.role === 'coordinator' && (
            <button type="button" onClick={exportWeekendMatches}>
              📄 Asteburua esportatu
            </button>
          )}

          <button onClick={openCreateModal}>+ Partida</button>
        </div>
      </div>

    <div className="weekend-picker">
        <label>
            Asteburua aukeratu
            <input
            type="date"
            value={selectedWeekendDate}
            onChange={(event) => setSelectedWeekendDate(event.target.value)}
            />
        </label>
    </div>

      <div className="field-group">
        <label htmlFor="venue-selector">Lekua aukeratu</label>

        <select
          id="venue-selector"
          value={selectedVenueId}
          onChange={(event) => setSelectedVenueId(event.target.value)}
        >
          {venues.map((venue) => (
            <option key={venue.id} value={venue.id}>
              {venue.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p>Kargatzen...</p>
      ) : (
        
        <div className="weekend-grid">
            <div className={selectedVenueName === 'Partidos fuera de casa' ? 'weekend-day away-day' : 'weekend-day'}>
                <h3>Larunbata {formatDate(weekend.saturday)}</h3>

                {saturdayMatches.length > 0 ? (
                saturdayMatches.map(renderMatchCard)
                ) : (
                <p className="muted">Ez dago partidarik.</p>
                )}
            </div>

            <div className="weekend-day">
                <h3>Igandea {formatDate(weekend.sunday)}</h3>

                {sundayMatches.length > 0 ? (
                sundayMatches.map(renderMatchCard)
                ) : (
                <p className="muted">Ez dago partidarik.</p>
                )}
            </div>
            </div>
      )}


      {modalMode && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>{editingMatchId ? 'Partida editatu' : 'Partida berria'}</h3>

            <label>
              Taldea
              <select
                value={teamId}
                onChange={(event) => setTeamId(event.target.value)}
              >
                <option value="">Aukeratu...</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
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
              Data
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>

            <label>
              Ordua
              <input
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
              />
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
              <button onClick={saveMatch}>Gorde</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}