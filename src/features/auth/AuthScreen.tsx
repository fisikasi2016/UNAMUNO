import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export function AuthScreen({ onLogin }: { onLogin: () => void }) {
  const [username, setUsername] = useState('ibonrec');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function login() {
    setError('');

    if (!supabase) {
      setError('Supabase ez dago konfiguratuta.');
      return;
    }

    if (!username.trim()) {
      setError('Erabiltzailea idatzi behar da.');
      return;
    }

    setLoading(true);

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('email')
      .eq('username', username.trim().toLowerCase())
      .single();

    if (profileError || !profile?.email) {
      setLoading(false);
      setError('Erabiltzailea ez da existitzen.');
      return;
    }

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password,
    });

    setLoading(false);

    if (loginError) {
      setError('Pasahitza ez da zuzena.');
      return;
    }

    onLogin();
  }

  return (
    <section className="login-screen">
      <div className="login-card">
        <div className="ball">🏀</div>
        <h1>Unamuno Kluba</h1>
        <p>Taldearen erabiltzailearekin sartu.</p>

        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Erabiltzailea"
          autoCapitalize="none"
          autoCorrect="off"
        />

        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Pasahitza"
          type="password"
        />

        <button onClick={login} disabled={loading}>
          {loading ? 'Sartzen...' : 'Sartu'}
        </button>

        {error && <small className="error">{error}</small>}
      </div>
    </section>
  );
}