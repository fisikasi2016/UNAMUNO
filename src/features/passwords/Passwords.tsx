import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type Profile = {
  id: string;
  display_name: string | null;
  username: string | null;
  role: string;
};

export function Passwords() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    if (!supabase) return;

    setLoading(true);

    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, username, role')
      .order('display_name', { ascending: true });

    if (error) {
      alert(error.message);
      console.error(error);
      setLoading(false);
      return;
    }

    setUsers((data ?? []) as Profile[]);
    setLoading(false);
  }

  function setPassword(userId: string, value: string) {
    setPasswords((current) => ({
      ...current,
      [userId]: value,
    }));
  }

  async function updatePassword(user: Profile) {
    if (!supabase) return;

    const newPassword = passwords[user.id]?.trim();

    if (!newPassword || newPassword.length < 6) {
      alert('Pasahitzak gutxienez 6 karaktere izan behar ditu.');
      return;
    }

    const ok = window.confirm(
      `${user.display_name ?? user.username ?? 'Erabiltzailea'} erabiltzailearen pasahitza aldatu nahi duzu?`
    );

    if (!ok) return;

    setSavingId(user.id);

    const { data, error } = await supabase.functions.invoke(
      'reset-user-password',
      {
        body: {
          userId: user.id,
          newPassword,
        },
      }
    );

    setSavingId('');

    if (error) {
      alert(error.message);
      console.error(error);
      return;
    }

    if (data?.error) {
      alert(data.error);
      return;
    }

    alert('Pasahitza eguneratuta.');

    setPasswords((current) => ({
      ...current,
      [user.id]: '',
    }));
  }

  return (
    <section>
      <div className="section-head">
        <h2>Pasahitzak</h2>
      </div>

      {loading ? (
        <p>Kargatzen...</p>
      ) : (
        <div className="password-list">
          {users.map((user) => (
            <article className="password-card" key={user.id}>
              <div>
                <h3>{user.display_name ?? user.username ?? 'Erabiltzailea'}</h3>
                <small>{user.role}</small>
              </div>

              <label>
                Pasahitz berria
                <input
                  type="password"
                  value={passwords[user.id] ?? ''}
                  onChange={(event) =>
                    setPassword(user.id, event.target.value)
                  }
                  placeholder="Gutxienez 6 karaktere"
                />
              </label>

              <button
                type="button"
                onClick={() => updatePassword(user)}
                disabled={savingId === user.id}
              >
                {savingId === user.id ? 'Eguneratzen...' : 'Eguneratu'}
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}