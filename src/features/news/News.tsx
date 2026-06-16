import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type Session = {
  role: string;
  teamId: string;
};

type NewsPost = {
  id: string;
  title: string;
  body: string | null;
  video_url: string | null;
  video_urls: string[] | null;
  pdf_url: string | null;
  image_url: string | null;
  image_urls: string[] | null;
  media_url: string | null;
  storage_path: string | null;
  owner_id: string | null;
  author_profile_id: string | null;
  author_name: string | null;
  created_at: string;
};

export function News({ session }: { session: Session }) {
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPost, setEditingPost] = useState<NewsPost | null>(null);
  const [selectedPostId, setSelectedPostId] = useState('');
  const [expandedPosts, setExpandedPosts] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [videoUrlsText, setVideoUrlsText] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [authorName, setAuthorName] = useState('');
  const [saving, setSaving] = useState(false);

  const isCoordinator = session.role === 'coordinator';

  useEffect(() => {
    loadCurrentUser();
    loadPosts();
  }, []);

  async function loadCurrentUser() {
    if (!supabase) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    setCurrentUserId(user?.id ?? '');
  }

  async function loadPosts() {
    if (!supabase) return;

    setLoading(true);

    const { data, error } = await supabase
      .from('news_posts')
      .select(
        `
        id,
        title,
        body,
        video_url,
        video_urls,
        pdf_url,
        image_url,
        image_urls,
        media_url,
        storage_path,
        owner_id,
        author_profile_id,
        author_name,
        created_at
      `
      )
      .order('created_at', { ascending: false });

    if (error) {
      alert(error.message);
      console.error(error);
      setLoading(false);
      return;
    }

    setPosts((data ?? []) as unknown as NewsPost[]);
    setLoading(false);
  }

  function resetForm() {
    setTitle('');
    setBody('');
    setVideoUrlsText('');
    setPdfFile(null);
    setImageFiles([]);
    setAuthorName('');
  }

  function openCreateForm() {
    resetForm();
    setEditingPost(null);
    setShowForm(true);
  }

  function getPostVideoUrls(post: NewsPost) {
    if (post.video_urls && post.video_urls.length > 0) return post.video_urls;
    return post.video_url ? [post.video_url] : [];
  }

  function getPostImageUrls(post: NewsPost) {
    if (post.image_urls && post.image_urls.length > 0) return post.image_urls;
    return post.image_url ? [post.image_url] : [];
  }

  function openEditForm(post: NewsPost) {
    setEditingPost(post);
    setTitle(post.title);
    setBody(post.body ?? '');
    setVideoUrlsText(getPostVideoUrls(post).join('\n'));
    setPdfFile(null);
    setImageFiles([]);
    setShowForm(true);
    setAuthorName(post.author_name ?? '');
  }

  function closeForm() {
    resetForm();
    setEditingPost(null);
    setShowForm(false);
  }

  function parseVideoUrls(value: string) {
    return value
      .split('\n')
      .map((url) => url.trim())
      .filter(Boolean);
  }

  function getYoutubeId(url: string | null) {
    if (!url) return '';

    const watchMatch = url.match(/[?&]v=([^&]+)/);
    if (watchMatch) return watchMatch[1];

    const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
    if (shortMatch) return shortMatch[1];

    const shortsMatch = url.match(/shorts\/([^?&]+)/);
    if (shortsMatch) return shortsMatch[1];

    return '';
  }

  function getYoutubeThumb(url: string | null) {
    const id = getYoutubeId(url);
    return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : '';
  }

  async function uploadFile(file: File, userId: string, folder: string) {
    const ext = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const path = `news/${userId}/${folder}/${fileName}`;

    const { error } = await supabase!.storage
      .from('resources')
      .upload(path, file);

    if (error) throw error;

    const { data } = supabase!.storage.from('resources').getPublicUrl(path);

    return data.publicUrl;
  }

  async function savePost() {
    if (!supabase || saving) return;

    if (!authorName.trim()) {
      alert('Egilea beharrezkoa da.');
      return;
    }

    if (!title.trim()) {
      alert('Izenburua beharrezkoa da.');
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert('Saioa ez da aurkitu.');
        return;
      }

      const parsedVideoUrls = parseVideoUrls(videoUrlsText);

      let uploadedPdfUrl = editingPost?.pdf_url ?? null;
      let uploadedImageUrls = editingPost ? getPostImageUrls(editingPost) : [];

      if (pdfFile) {
        uploadedPdfUrl = await uploadFile(pdfFile, user.id, 'pdfs');
      }

      if (imageFiles.length > 0) {
        uploadedImageUrls = [];

        for (const imageFile of imageFiles) {
          const imageUrl = await uploadFile(imageFile, user.id, 'images');
          uploadedImageUrls.push(imageUrl);
        }
      }

      const firstVideo = parsedVideoUrls[0] ?? null;
      const firstImage = uploadedImageUrls[0] ?? null;

      const payload = {
        title: title.trim(),
        body: body.trim() || null,

        video_url: firstVideo,
        video_urls: parsedVideoUrls,

        pdf_url: uploadedPdfUrl,

        image_url: firstImage,
        image_urls: uploadedImageUrls,

        media_url: firstVideo || firstImage || uploadedPdfUrl,
        storage_path: uploadedPdfUrl,
      };

      const { error } = editingPost
        ? await supabase
            .from('news_posts')
            .update(payload)
            .eq('id', editingPost.id)
        : await supabase.from('news_posts').insert({
            ...payload,
            owner_id: user.id,
            author_profile_id: user.id,
            author_name: authorName.trim(),
          });

      if (error) {
        alert(error.message);
        console.error(error);
        return;
      }

      closeForm();
      await loadPosts();
    } catch (error: any) {
      alert(error.message ?? 'Errorea berria gordetzean.');
      console.error(error);
    } finally {
      setSaving(false);
    }
  }

  async function deletePost(post: NewsPost) {
    if (!supabase) return;

    const ok = window.confirm('Sarrera hau ezabatu nahi duzu?');
    if (!ok) return;

    const { error } = await supabase.from('news_posts').delete().eq('id', post.id);

    if (error) {
      alert(error.message);
      console.error(error);
      return;
    }

    await loadPosts();
  }

  function canManage(post: NewsPost) {
    return isCoordinator || post.owner_id === currentUserId;
  }

  function formatDate(value: string) {
    return new Date(value).toLocaleDateString('eu-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  function togglePost(id: string) {
    setExpandedPosts((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  function goToPost(id: string) {
    setSelectedPostId(id);

    const element = document.getElementById(`post-${id}`);

    element?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });

    if (id && !expandedPosts.includes(id)) {
      setExpandedPosts((current) => [...current, id]);
    }
  }

  return (
    <section>
      <div className="section-head">
        <h2>Berriak</h2>

        <button onClick={openCreateForm}>+ Sarrera berria</button>
      </div>

      {!loading && posts.length > 0 && (
        <div className="field-group">
          <label htmlFor="news-jump">Berrien zerrenda</label>

          <select
            id="news-jump"
            value={selectedPostId}
            onChange={(event) => goToPost(event.target.value)}
          >
            <option value="">Aukeratu sarrera...</option>

            {posts.map((post) => (
              <option key={post.id} value={post.id}>
                {formatDate(post.created_at)} · {post.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <p>Kargatzen...</p>
      ) : (
        <div className="blog-list">
          {posts.map((post) => {
            const isExpanded = expandedPosts.includes(post.id);
            const videoUrls = getPostVideoUrls(post);
            const imageUrls = getPostImageUrls(post);

            return (
              <article className="blog-card" id={`post-${post.id}`} key={post.id}>
                <header className="blog-header">
                  <div>
                    <h2>{post.title}</h2>

                    <div className="blog-meta">
                      {post.author_name ?? 'Erabiltzailea'} ·{' '}
                      {formatDate(post.created_at)}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="ghost"
                    onClick={() => togglePost(post.id)}
                  >
                    {isExpanded ? '▲ Tolestu' : '▼ Irakurri'}
                  </button>
                </header>

                {isExpanded && (
                    <>
                        {post.pdf_url && (
                        <div className="blog-pdf-card">
                            <button
                            type="button"
                            className="ghost"
                            onClick={() => window.open(post.pdf_url!, '_blank')}
                            >
                            📄 PDF ireki
                            </button>
                        </div>
                        )}

                        {post.body && (
                        <div className="blog-text-block">
                            <div className="blog-text">
                            {post.body}
                            </div>
                        </div>
                        )}

                        {imageUrls.length > 0 && (
                        <div className="blog-gallery">
                            {imageUrls.map((imageUrl) => (
                            <img
                                key={imageUrl}
                                src={imageUrl}
                                alt={post.title}
                                className="blog-gallery-image"
                            />
                            ))}
                        </div>
                        )}

                        {videoUrls.length > 0 && (
                        <div className="blog-videos">
                            {videoUrls.map((url) => {
                            const thumb = getYoutubeThumb(url);

                            return thumb ? (
                                <div
                                key={url}
                                className="video-thumb-wrap"
                                onClick={() => window.open(url, '_blank')}
                                >
                                <img
                                    src={thumb}
                                    alt={post.title}
                                    className="blog-video-thumb"
                                />

                                <span className="video-play-badge">
                                    ▶
                                </span>
                                </div>
                            ) : (
                                <button
                                key={url}
                                type="button"
                                className="ghost"
                                onClick={() => window.open(url, '_blank')}
                                >
                                ▶ Bideoa ireki
                                </button>
                            );
                            })}
                        </div>
                        )}
                        
                    {canManage(post) && (
                      <div className="blog-actions">
                        <button
                          type="button"
                          className="ghost"
                          onClick={() => openEditForm(post)}
                        >
                          Editatu
                        </button>

                        <button
                          type="button"
                          className="danger"
                          onClick={() => deletePost(post)}
                        >
                          Ezabatu
                        </button>
                      </div>
                    )}
                  </>
                )}
              </article>
            );
          })}

          {posts.length === 0 && (
            <p className="hint">Oraindik ez dago berririk.</p>
          )}
        </div>
      )}

      {showForm && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>{editingPost ? 'Sarrera editatu' : 'Sarrera berria'}</h3>


            <label>
              Egilea
              <input
                value={authorName}
                onChange={(event) => setAuthorName(event.target.value)}
                placeholder="Adib. Ibon, Infantil Femenino A..."
              />
            </label>

            <label>
              Izenburua
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>

            <label>
              Testua
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
              />
            </label>

            <label>
              Bideoen URL-ak
              <textarea
                value={videoUrlsText}
                onChange={(event) => setVideoUrlsText(event.target.value)}
                placeholder={`https://youtube.com/...

https://youtube.com/...`}
              />
            </label>

            <label>
              PDF igo
              <div className="file-upload">
                <label className="file-upload-button">
                  PDF aukeratu

                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(event) => {
                      setPdfFile(event.target.files?.[0] ?? null);
                    }}
                  />
                </label>

                <span className="file-upload-name">
                  {pdfFile?.name ??
                    (editingPost?.pdf_url
                      ? 'PDF bat dago gordeta'
                      : 'Ez da fitxategirik aukeratu')}
                </span>
              </div>
            </label>

            <label>
              Irudiak igo
              <div className="file-upload">
                <label className="file-upload-button">
                  Irudiak aukeratu

                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) => {
                      setImageFiles(Array.from(event.target.files ?? []));
                    }}
                  />
                </label>

                <span className="file-upload-name">
                  {imageFiles.length > 0
                    ? `${imageFiles.length} irudi aukeratuta`
                    : editingPost && getPostImageUrls(editingPost).length > 0
                    ? `${getPostImageUrls(editingPost).length} irudi gordeta`
                    : 'Ez da irudirik aukeratu'}
                </span>
              </div>
            </label>

            <div className="modal-actions">
              <button type="button" onClick={closeForm}>
                Utzi
              </button>

              <button type="button" onClick={savePost} disabled={saving}>
                {saving
                  ? 'Argitaratzen...'
                  : editingPost
                  ? 'Gorde aldaketak'
                  : 'Argitaratu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}