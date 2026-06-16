import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type Session = {
  role: string;
};

type ChangeType = 'training' | 'match';
type ChangeStatus = 'sin_leer' | 'leida' | 'aceptada' | 'denegada';

type ChangeRequest = {
  id: string;
  type: ChangeType;
  request_type: string | null;
  title: string | null;
  description: string | null;
  previous_info: string | null;
  requested_info: string | null;
  reason: string | null;
  status: ChangeStatus;
  owner_id: string | null;
  author_profile_id: string | null;
  author_name: string | null;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_note: string | null;
};

export function ChangeRequests({ session }: { session: Session }) {
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');

  const [type, setType] = useState<ChangeType>('training');
  const [title, setTitle] = useState('');
  const [previousInfo, setPreviousInfo] = useState('');
  const [requestedInfo, setRequestedInfo] = useState('');
  const [reason, setReason] = useState('');

  const [currentDate, setCurrentDate] = useState('');
  const [currentStartTime, setCurrentStartTime] = useState('');
  const [currentEndTime, setCurrentEndTime] = useState('');
  const [editingRequest, setEditingRequest] = useState<ChangeRequest | null>(null);

  const isCoordinator = session.role === 'coordinator';

  useEffect(() => {
    init();
    }, []);

    async function init() {
    const userId = await loadCurrentUser();
    await loadRequests(userId);
    }

  async function loadCurrentUser() {
    if (!supabase) return '';

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const userId = user?.id ?? '';
    setCurrentUserId(userId);

    return userId;
    }

  async function loadRequests(userId = currentUserId) {
    if (!supabase) return;

    setLoading(true);

    let query = supabase
        .from('change_requests')
        .select(
            `
            id,
            type,
            request_type,
            title,
            description,
            previous_info,
            requested_info,
            reason,
            status,
            owner_id,
            author_profile_id,
            author_name,
            created_at,
            resolved_at,
            resolved_by,
            resolution_note
        `
        )
        .order('created_at', { ascending: false });

        if (!isCoordinator && userId) {
            query = query.eq('owner_id', userId);
        }

        const { data, error } = await query;

    if (error) {
      alert(error.message);
      console.error(error);
      setLoading(false);
      return;
    }

    setRequests((data ?? []) as unknown as ChangeRequest[]);
    setLoading(false);
  }

  function resetForm() {
    setType('training');
    setTitle('');
    setPreviousInfo('');
    setRequestedInfo('');
    setReason('');
    setCurrentDate('');
    setCurrentStartTime('');
    setCurrentEndTime('');
  }

  function closeForm() {
    resetForm();
    setEditingRequest(null);
    setShowForm(false);
    }

  function openEditRequest(request: ChangeRequest) {
    setEditingRequest(request);

    setType(request.type);
    setTitle(request.title ?? '');
    setPreviousInfo(request.previous_info ?? '');
    setRequestedInfo(request.requested_info ?? '');
    setReason(request.reason ?? '');

    setShowForm(true);
    }

  async function getAuthorName(userId: string) {
    if (!supabase) return 'Erabiltzailea';

    const { data, error } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', userId)
        .single();

    if (error) {
        console.error(error);
        return 'Erabiltzailea';
    }

    return data?.display_name ?? 'Erabiltzailea';
    }

  async function createRequest() {
    if (!supabase) return;

    if (!title.trim()) {
      alert('Izenburua beharrezkoa da.');
      return;
    }

    if (!requestedInfo.trim()) {
      alert('Eskatutako aldaketa idatzi behar da.');
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert('Saioa ez da aurkitu.');
      return;
    }

    const authorName = await getAuthorName(user.id);

    const payload = {
    type,
    request_type: type,
    title: title.trim(),
    description: reason.trim() || null,
    previous_info:
        currentDate || currentStartTime || currentEndTime
        ? `${currentDate} · ${currentStartTime}-${currentEndTime}`
        : previousInfo.trim() || null,
    requested_info: requestedInfo.trim(),
    reason: reason.trim() || null,
    };

    const { error } = editingRequest
    ? await supabase
        .from('change_requests')
        .update(payload)
        .eq('id', editingRequest.id)
    : await supabase.from('change_requests').insert({
        ...payload,
        status: 'sin_leer',
        owner_id: user.id,
        author_profile_id: user.id,
        author_name: authorName,
        });

    if (error) {
      alert(error.message);
      console.error(error);
      return;
    }

    closeForm();
    await loadRequests();
    setEditingRequest(null);
  }

  async function updateStatus(
    request: ChangeRequest,
    status: ChangeStatus
  ) {
    if (!supabase || !isCoordinator) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('change_requests')
      .update({
        status,
        resolved_at:
          status === 'aceptada' || status === 'denegada'
            ? new Date().toISOString()
            : null,
        resolved_by:
          status === 'aceptada' || status === 'denegada'
            ? user?.id ?? null
            : null,
      })
      .eq('id', request.id);

    if (error) {
      alert(error.message);
      console.error(error);
      return;
    }

    await loadRequests();
  }

  async function deleteRequest(request: ChangeRequest) {
    if (!supabase) return;

    const ok = window.confirm('Eskaera hau ezabatu nahi duzu?');
    if (!ok) return;

    const { error } = await supabase
      .from('change_requests')
      .delete()
      .eq('id', request.id);

    if (error) {
      alert(error.message);
      console.error(error);
      return;
    }

    await loadRequests();
  }

  function canDelete(request: ChangeRequest) {
    return isCoordinator || request.owner_id === currentUserId;
  }

  function formatDate(value: string) {
    return new Date(value).toLocaleDateString('eu-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  function typeLabel(value: ChangeType) {
    return value === 'match' ? 'Partida' : 'Entrenamendua';
  }

  function statusLabel(value: ChangeStatus) {
    if (value === 'sin_leer') return 'Irakurri gabe';
    if (value === 'leida') return 'Irakurrita';
    if (value === 'aceptada') return 'Onartuta';
    if (value === 'denegada') return 'Baztertuta';

    return value;
  }

  function statusClass(value: ChangeStatus) {
    return `change-status ${value}`;
  }

  return (
    <section>
      <div className="section-head">
        <h2>Aldaketa eskaerak</h2>

        <button onClick={() => setShowForm(true)}>
          + Eskaera
        </button>
      </div>

      {loading ? (
        <p>Kargatzen...</p>
      ) : (
        <div className="request-list">
          {requests.map((request) => (
            <article
              className="request-card"
              key={request.id}
            >
              <div className="request-head">
                <div>
                  <strong>
                    {typeLabel(request.type)} aldaketa
                  </strong>

                  <h3>
                    {request.title ?? 'Izenbururik gabe'}
                  </h3>

                  <small>
                    {request.author_name ?? 'Erabiltzailea'} ·{' '}
                    {formatDate(request.created_at)}
                  </small>
                </div>

                <span className={statusClass(request.status)}>
                  {statusLabel(request.status)}
                </span>
              </div>

              {request.previous_info && (
                <p>
                  <b>Uneko egoera:</b> {request.previous_info}
                </p>
              )}

              <p>
                <b>Eskaria:</b> {request.requested_info}
              </p>

              {request.reason && (
                <p>
                  <b>Arrazoia:</b> {request.reason}
                </p>
              )}

              {request.resolution_note && (
                <p>
                  <b>Erantzuna:</b> {request.resolution_note}
                </p>
              )}

              <div className="request-actions">
                {isCoordinator && (
                  <>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() =>
                        updateStatus(request, 'leida')
                      }
                    >
                      Irakurrita
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        updateStatus(request, 'aceptada')
                      }
                    >
                      Onartu
                    </button>

                    <button
                      type="button"
                      className="danger"
                      onClick={() =>
                        updateStatus(request, 'denegada')
                      }
                    >
                      Baztertu
                    </button>
                  </>
                )}

                {(isCoordinator || request.owner_id === currentUserId) && (
                    <button
                        type="button"
                        className="ghost"
                        onClick={() => openEditRequest(request)}
                    >
                        Editatu
                    </button>
                )}

                {canDelete(request) && (
                  <button
                    type="button"
                    className="danger"
                    onClick={() => deleteRequest(request)}
                  >
                    Ezabatu
                  </button>
                )}
              </div>
            </article>
          ))}

          {requests.length === 0 && (
            <p className="hint">
              Oraindik ez dago aldaketa eskaerarik.
            </p>
          )}
        </div>
      )}

      {showForm && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>{editingRequest ? 'Eskaera editatu' : 'Eskaera berria'}</h3>

            <label>
              Mota
              <select
                value={type}
                onChange={(event) =>
                  setType(event.target.value as ChangeType)
                }
              >
                <option value="training">
                  Entrenamendua
                </option>
                <option value="match">
                  Partida
                </option>
              </select>
            </label>

            <label>
              Izenburua
              <input
                value={title}
                onChange={(event) =>
                  setTitle(event.target.value)
                }
                placeholder="Adib. Astearteko entrenamendua aldatu"
              />
            </label>

            <label>
                Oraingo egoera
                </label>

                <div className="change-current-grid">
                <label>
                    Eguna
                    <input
                    type="date"
                    value={currentDate}
                    onChange={(event) => setCurrentDate(event.target.value)}
                    />
                </label>

                <label>
                    Hasiera
                    <input
                    type="time"
                    value={currentStartTime}
                    onChange={(event) => setCurrentStartTime(event.target.value)}
                    />
                </label>

                <label>
                    Amaiera
                    <input
                    type="time"
                    value={currentEndTime}
                    onChange={(event) => setCurrentEndTime(event.target.value)}
                    />
                </label>
                </div>

            <label>
              Eskatutako aldaketa
              <textarea
                value={requestedInfo}
                onChange={(event) =>
                  setRequestedInfo(event.target.value)
                }
                placeholder="Adib. 19:00-20:30era pasatzea"
              />
            </label>

            <label>
              Arrazoia
              <textarea
                value={reason}
                onChange={(event) =>
                  setReason(event.target.value)
                }
                placeholder="Zergatik eskatzen da aldaketa?"
              />
            </label>

            <div className="modal-actions">
              <button type="button" onClick={closeForm}>
                Utzi
              </button>

              <button type="button" onClick={createRequest}>
                {editingRequest ? 'Gorde aldaketak' : 'Bidali'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}