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

type TrainingSchedule = {
  id: string;
  schedule_group_id: string;
  team_id: string;
  venue_id: string;
  weekday: number;
  date: string;
  start_time: string;
  end_time: string;
  teams?: {
    name: string;
    color: string;
  } | null;
  venues?: {
    name: string;
  } | null;
};

type ModalMode = null | 'create' | 'edit';

type WeeklySlot = {
  weekday: number;
  venueId: string;
  startTime: string;
  endTime: string;
};

const weekdays = [
  'Astelehena',
  'Asteartea',
  'Asteazkena',
  'Osteguna',
  'Ostirala',
  'Larunbata',
  'Igandea',
];

const weekdayOptions = [
  { label: 'Astelehena', value: 1 },
  { label: 'Asteartea', value: 2 },
  { label: 'Asteazkena', value: 3 },
  { label: 'Osteguna', value: 4 },
  { label: 'Ostirala', value: 5 },
  { label: 'Larunbata', value: 6 },
  { label: 'Igandea', value: 0 },
];

export function Schedules({ session }: { session: { role: string } }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [schedules, setSchedules] = useState<TrainingSchedule[]>([]);

  const [selectedVenueId, setSelectedVenueId] = useState('');
  const [selectedWeekDate, setSelectedWeekDate] = useState(toIsoDate(new Date()));
  const [loading, setLoading] = useState(true);

  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingSchedule, setEditingSchedule] = useState<TrainingSchedule | null>(
    null
  );

  const [teamId, setTeamId] = useState('');
  const [venueId, setVenueId] = useState('');
  const [weeklySlots, setWeeklySlots] = useState<WeeklySlot[]>([
    {
        weekday: 1,
        venueId: '',
        startTime: '',
        endTime: '',
    },
    ]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  const isCoordinator = session.role === 'coordinator';

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    if (!supabase) return;

    setLoading(true);

    const [
      { data: teamData, error: teamError },
      { data: venueData, error: venueError },
      { data: scheduleData, error: scheduleError },
    ] = await Promise.all([
      supabase.from('teams').select('id,name,color').order('name'),
      supabase.from('venues').select('id,name').order('name'),
      supabase
        .from('training_schedules')
        .select(
        `
        id,
        schedule_group_id,
        team_id,
        venue_id,
        weekday,
        date,
        start_time,
        end_time,
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
    if (scheduleError) console.error('Schedules error:', scheduleError);

    const loadedVenues = (venueData ?? []).filter(
      (venue) => venue.name !== 'Partidos fuera de casa'
    );

    setTeams(teamData ?? []);
    setVenues(loadedVenues);
    setSchedules((scheduleData ?? []) as unknown as TrainingSchedule[]);

    if (!selectedVenueId && loadedVenues.length > 0) {
      setSelectedVenueId(loadedVenues[0].id);
    }

    setLoading(false);
  }

  function resetForm() {
    setEditingSchedule(null);
    setTeamId('');
    setVenueId(selectedVenueId);
    setWeeklySlots([
    {
        weekday: 1,
        venueId: selectedVenueId,
        startTime: '',
        endTime: '',
    },
    ]);
    setStartDate('');
    setEndDate('');
    setStartTime('');
    setEndTime('');
  }

  function openCreateModal() {
    resetForm();
    setModalMode('create');
  }

  function openEditModal(schedule: TrainingSchedule) {
    setEditingSchedule(schedule);
    setTeamId(schedule.team_id);
    setVenueId(schedule.venue_id);
    setWeeklySlots([
    {
        weekday: new Date(schedule.date).getDay(),
        venueId: schedule.venue_id,
        startTime: schedule.start_time.slice(0, 5),
        endTime: schedule.end_time.slice(0, 5),
    },
    ]);
    setStartDate(schedule.date);
    setEndDate(schedule.date);
    setStartTime(schedule.start_time.slice(0, 5));
    setEndTime(schedule.end_time.slice(0, 5));
    setModalMode('edit');
  }

  function closeModal() {
    resetForm();
    setModalMode(null);
  }

  async function saveSchedule(scope: 'single' | 'series' = 'single') {
    if (!supabase || !isCoordinator) return;

    if (!teamId) {
      alert('Taldea aukeratu behar da.');
      return;
    }

    if (modalMode === 'edit' && !venueId) {
      alert('Lekua aukeratu behar da.');
      return;
    }

    if (!startDate) {
      alert('Hasiera data aukeratu behar da.');
      return;
    }

    if (!endDate) {
      alert('Amaiera data aukeratu behar da.');
      return;
    }

    if (modalMode === 'edit' && (!startTime || !endTime)) {
      alert('Hasiera eta amaiera orduak aukeratu behar dira.');
      return;
    }

    if (modalMode === 'create') {
      const invalidSlot = weeklySlots.some(
        (slot) => !slot.venueId || !slot.startTime || !slot.endTime
      );

      if (invalidSlot) {
        alert('Entrenamendu guztiek lekua eta ordutegia behar dute.');
        return;
      }
    }

    if (modalMode === 'edit' && editingSchedule) {
      const payload = {
        team_id: teamId,
        venue_id: venueId,
        start_time: startTime,
        end_time: endTime,
      };

      const query =
        scope === 'series'
          ? supabase
              .from('training_schedules')
              .update(payload)
              .eq('schedule_group_id', editingSchedule.schedule_group_id)
          : supabase
              .from('training_schedules')
              .update({
                ...payload,
                date: startDate,
              })
              .eq('id', editingSchedule.id);

      const { error } = await query;

      if (error) {
        alert(error.message);
        console.error(error);
        return;
      }

      setSelectedWeekDate(startDate);
      setSelectedVenueId(venueId);
      closeModal();
      await loadInitialData();
      return;
    }

    const scheduleGroupId = crypto.randomUUID();

    const rows = weeklySlots.flatMap((slot) =>
      generateDates(startDate, endDate, [slot.weekday]).map((date) => ({
        schedule_group_id: scheduleGroupId,
        team_id: teamId,
        venue_id: slot.venueId,
        weekday: slot.weekday,
        date,
        start_time: slot.startTime,
        end_time: slot.endTime,
      }))
    );



    try {
      const insertPromise = supabase
        .from('training_schedules')
        .insert(rows);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error('Supabase ez du erantzun 8 segundotan.')),
          8000
        )
      );

      const result = await Promise.race([
        insertPromise,
        timeoutPromise,
      ]) as { error: any };

      if (result.error) {
        alert(result.error.message);
        console.error(result.error);
        return;
      }

      setSelectedWeekDate(startDate);
      setSelectedVenueId(weeklySlots[0].venueId);
      closeModal();
      await loadInitialData();
    } catch (error: any) {
      alert(error.message ?? 'Errore ezezaguna.');
      console.error(error);
    }
  }

  async function deleteSchedule(scope: 'single' | 'series') {
    if (!supabase || !isCoordinator || !editingSchedule) return;

    const ok = window.confirm(
      scope === 'series'
        ? 'Serie osoa ezabatu nahi duzu?'
        : 'Entrenamendu hau ezabatu nahi duzu?'
    );

    if (!ok) return;

    const query =
      scope === 'series'
        ? supabase
            .from('training_schedules')
            .delete()
            .eq('schedule_group_id', editingSchedule.schedule_group_id)
        : supabase
            .from('training_schedules')
            .delete()
            .eq('id', editingSchedule.id);

    const { error } = await query;

    if (error) {
      alert('Errorea ezabatzean.');
      console.error(error);
      return;
    }

    closeModal();
    await loadInitialData();
  }

  async function saveScheduleWeekdaySeries() {
    if (!supabase || !isCoordinator || !editingSchedule) return;

    if (!venueId || !startTime || !endTime) {
        alert('Lekua, hasiera ordua eta amaiera ordua bete behar dira.');
        return;
    }

    const { error } = await supabase
        .from('training_schedules')
        .update({
        team_id: teamId,
        venue_id: venueId,
        start_time: startTime,
        end_time: endTime,
        })
        .eq('schedule_group_id', editingSchedule.schedule_group_id)
        .eq('weekday', editingSchedule.weekday)
        .gte('date', editingSchedule.date);

    if (error) {
        alert('Errorea asteko egun hori aldatzean.');
        console.error(error);
        return;
    }

    closeModal();
    await loadInitialData();
    }

  function generateDates(from: string, to: string, days: number[]) {
    const result: string[] = [];
    const current = new Date(`${from}T12:00:00`);
    const end = new Date(`${to}T12:00:00`);

    while (current <= end) {
      if (days.includes(current.getDay())) {
        result.push(toIsoDate(current));
      }

      current.setDate(current.getDate() + 1);
    }

    return result;
  }

  function addWeeklySlot() {
  setWeeklySlots((current) => [
    ...current,
    {
      weekday: 1,
      venueId: selectedVenueId,
      startTime: '',
      endTime: '',
    },
  ]);
}

    function updateWeeklySlot(
    index: number,
    field: keyof WeeklySlot,
    value: string | number
    ) {
    setWeeklySlots((current) =>
        current.map((slot, slotIndex) =>
        slotIndex === index
            ? {
                ...slot,
                [field]: value,
            }
            : slot
        )
    );
    }

    function removeWeeklySlot(index: number) {
    setWeeklySlots((current) =>
        current.length === 1
        ? current
        : current.filter((_, slotIndex) => slotIndex !== index)
    );
    }

  function getWeekDates(baseDateString: string) {
    const baseDate = new Date(`${baseDateString}T12:00:00`);
    const day = baseDate.getDay();

    const monday = new Date(baseDate);
    const distanceToMonday = day === 0 ? -6 : 1 - day;
    monday.setDate(baseDate.getDate() + distanceToMonday);

    return Array.from({ length: 7 }).map((_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return toIsoDate(date);
    });
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

  function getGridRow(schedule: TrainingSchedule) {
    const [hours, minutes] = schedule.start_time.split(':').map(Number);
    const startMinutes = 8 * 60;
    const currentMinutes = hours * 60 + minutes;
    const slot = Math.max(0, Math.floor((currentMinutes - startMinutes) / 30));

    const [endHours, endMinutes] = schedule.end_time.split(':').map(Number);
    const duration =
      endHours * 60 + endMinutes - (hours * 60 + minutes);
    const span = Math.max(2, Math.ceil(duration / 30));

    return `${slot + 2} / span ${span}`;
  }

  const weekDates = getWeekDates(selectedWeekDate);

  const filteredSchedules = useMemo(() => {
    return schedules.filter(
      (schedule) =>
        schedule.venue_id === selectedVenueId && weekDates.includes(schedule.date)
    );
  }, [schedules, selectedVenueId, weekDates.join('|')]);

  function schedulesForDate(date: string) {
    return filteredSchedules.filter((schedule) => schedule.date === date);
  }

  function timeToMinutes(time: string) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
    }

    function schedulesOverlap(a: TrainingSchedule, b: TrainingSchedule) {
    return (
        timeToMinutes(a.start_time) < timeToMinutes(b.end_time) &&
        timeToMinutes(b.start_time) < timeToMinutes(a.end_time)
    );
    }

    function getOverlapLevel(
    schedule: TrainingSchedule,
    daySchedules: TrainingSchedule[]
    ) {
    const sorted = [...daySchedules].sort((a, b) =>
        a.start_time.localeCompare(b.start_time)
    );

    return sorted.findIndex((item) => item.id === schedule.id);
    }

    function getMaxOverlap(daySchedules: TrainingSchedule[]) {
    if (daySchedules.length === 0) return 1;

    return Math.max(
        1,
        ...daySchedules.map(
        (schedule) =>
            daySchedules.filter((item) => schedulesOverlap(schedule, item)).length
        )
    );
    }

    function getDayColumnCount(daySchedules: TrainingSchedule[]) {
      if (daySchedules.length === 0) return 1;

      return Math.max(
        1,
        ...daySchedules.map(
          (schedule) =>
            daySchedules.filter((item) => schedulesOverlap(schedule, item)).length
        )
      );
    }

  return (
    <section>
      <div className="section-head">
        <h2>Ordutegiak</h2>

        {isCoordinator && (
          <button onClick={openCreateModal}>+ Ordutegia</button>
        )}
      </div>

      <div className="weekend-picker">
        <label>
          Astea aukeratu
          <input
            type="date"
            value={selectedWeekDate}
            onChange={(event) => setSelectedWeekDate(event.target.value)}
          />
        </label>
      </div>

      <div className="field-group">
        <label htmlFor="schedule-venue">Lekua aukeratu</label>

        <select
          id="schedule-venue"
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
        <div className="schedule-scroll">
          <div className="schedule-week">
            {weekDates.map((date, index) => (
            <div
                className="schedule-day"
                key={date}
                style={{
                minWidth: `${230 * getDayColumnCount(schedulesForDate(date))}px`,
                }}
            >
                <h3>
                  {weekdays[index]}
                  <small> {formatDate(date)}</small>
                </h3>

                {schedulesForDate(date).map((schedule) => {
                const daySchedules = schedulesForDate(date);
                const column = getOverlapLevel(schedule, daySchedules);

                return (
                    <article
                    className="schedule-card"
                    key={schedule.id}
                    style={{
                        gridRow: getGridRow(schedule),
                        gridColumn: column + 1,
                        backgroundColor: `${schedule.teams?.color ?? '#94a3b8'}22`,
                        borderColor: `${schedule.teams?.color ?? '#94a3b8'}55`,
                    }}
                    onClick={() => {
                        if (isCoordinator) openEditModal(schedule);
                    }}
                    >
                    <strong>{schedule.teams?.name ?? 'Taldea'}</strong>
                    <span>
                        {schedule.start_time.slice(0, 5)} -{' '}
                        {schedule.end_time.slice(0, 5)}
                    </span>
                    </article>
                );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {modalMode && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>
              {editingSchedule ? 'Ordutegia editatu' : 'Ordutegi berria'}
            </h3>

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

            {modalMode === 'edit' && (
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
            )}

            <label>
              Hasiera data
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </label>

            <label>
              Amaiera data
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </label>

            {modalMode === 'create' && (
            <div className="weekly-slots">
                <h4>Asteko entrenamenduak</h4>

                {weeklySlots.map((slot, index) => (
                <div className="weekly-slot-card" key={index}>
                    <label>
                    Eguna
                    <select
                        value={slot.weekday}
                        onChange={(event) =>
                        updateWeeklySlot(index, 'weekday', Number(event.target.value))
                        }
                    >
                        {weekdayOptions.map((day) => (
                        <option key={day.value} value={day.value}>
                            {day.label}
                        </option>
                        ))}
                    </select>
                    </label>

                    <label>
                    Lekua
                    <select
                        value={slot.venueId}
                        onChange={(event) =>
                        updateWeeklySlot(index, 'venueId', event.target.value)
                        }
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
                    Hasiera
                    <input
                        type="time"
                        value={slot.startTime}
                        onChange={(event) =>
                        updateWeeklySlot(index, 'startTime', event.target.value)
                        }
                    />
                    </label>

                    <label>
                    Amaiera
                    <input
                        type="time"
                        value={slot.endTime}
                        onChange={(event) =>
                        updateWeeklySlot(index, 'endTime', event.target.value)
                        }
                    />
                    </label>

                    <button
                    type="button"
                    className="ghost"
                    onClick={() => removeWeeklySlot(index)}
                    >
                    Ezabatu egun hau
                    </button>
                </div>
                ))}

                <div className="weekly-add-row">
                <button type="button" onClick={addWeeklySlot}>
                    + Beste egun bat
                </button>
                </div>
            </div>
            )}

            {modalMode === 'edit' && (
            <>
                <label>
                Hasiera ordua
                <input
                    type="time"
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                />
                </label>

                <label>
                Amaiera ordua
                <input
                    type="time"
                    value={endTime}
                    onChange={(event) => setEndTime(event.target.value)}
                />
                </label>
            </>
            )}

            <div className="modal-actions">
              <button type="button" onClick={closeModal}>
                Utzi
              </button>

              {editingSchedule ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    saveSchedule('single');
                  }}
                >
                  Hau gorde
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    // alert('Klik Sortu!');
                    saveSchedule('single');
                  }}
                >
                  Sortu
                </button>
              )}
            </div>


            {editingSchedule && (
            <>
                <div className="modal-actions">
                <button onClick={saveScheduleWeekdaySeries}>
                    Egun hau betirako aldatu
                </button>

                <button onClick={() => deleteSchedule('single')}>
                    Hau ezabatu
                </button>
                </div>

                <button
                className="danger full-width"
                onClick={() => deleteSchedule('series')}
                >
                Serie osoa ezabatu
                </button>
            </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}