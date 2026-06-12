import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';

type Session = {
  role: string;
  teamId: string;
};

type ResourceItem = {
  id: string;
  title: string;
  description: string | null;
  kind: string | null;
  resource_type: string | null;
  section: string | null;
  subsection: string | null;
  tags: string[] | null;
  url: string | null;
  video_url: string | null;
  pdf_url: string | null;
  notes: string | null;
  players_count: string | null;
  materials: string | null;
  space: string | null;
  variants: string | null;
  owner_id: string | null;
  author_profile_id: string | null;
};

type MainSection =
  | 'home'
  | 'clinics'
  | 'tasks'
  | 'physical'
  | 'injuries'
  | 'planning'
  | 'unamuno';

type FormMode = null | 'clinic' | 'task' | 'generic';

const mainBlocks = [
  { key: 'clinics', label: 'Clinics' },
  { key: 'tasks', label: 'Ariketen bankua' },
  { key: 'physical', label: 'Prestaketa fisikoa' },
  { key: 'injuries', label: 'Lesioak' },
  { key: 'planning', label: 'Planifikazioa' },
  { key: 'unamuno', label: 'Unamuno' },
] as const;

const fixedPdfButtons = {
  physical: [
    { label: 'Adinen araberako progresioa', section: 'physical', subsection: 'age_progression' },
  ],
  injuries: [
    { label: 'Lesionatzen denean', section: 'injuries', subsection: 'when_injured' },
    { label: 'Lesiotik buelta', section: 'injuries', subsection: 'return_from_injury' },
  ],
  planning: [
    { label: 'Urtea', section: 'planning', subsection: 'year' },
    { label: 'Astea', section: 'planning', subsection: 'week' },
    { label: 'Entrenamendua', section: 'planning', subsection: 'training' },
  ],
  unamuno: [
    { label: 'Teknika', section: 'unamuno', subsection: 'technique' },
    { label: 'Filosofia', section: 'unamuno', subsection: 'philosophy' },
  ],
};

const physicalButtons = [
  { label: 'Mugikortasuna', subsection: 'mobility' },
  { label: 'Aktibazioa', subsection: 'activation' },
  { label: 'Lesioen prebentzioa', subsection: 'injury_prevention' },
];

const injuriesButtons = [
  { label: 'Lesioan zehar', subsection: 'during_injury' },
];

const tacticButtons = [
  { label: 'Defentsa', subsection: 'defense' },
  { label: 'Erasoa', subsection: 'attack' },
];

export function Resources({ session }: { session: Session }) {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [activeSection, setActiveSection] = useState<MainSection>('home');
  const [activeSubsection, setActiveSubsection] = useState<string>('');
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [loading, setLoading] = useState(true);
  const [tagQuery, setTagQuery] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [notes, setNotes] = useState('');
  const [playersCount, setPlayersCount] = useState('');
  const [materials, setMaterials] = useState('');
  const [space, setSpace] = useState('');
  const [variants, setVariants] = useState('');
  const [formSection, setFormSection] = useState('');
  const [formSubsection, setFormSubsection] = useState('');
  const [variantsModalText, setVariantsModalText] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [editingResource, setEditingResource] = useState<ResourceItem | null>(null);

  const isCoordinator = session.role === 'coordinator';

  useEffect(() => {
    loadResources();
  }, []);

  async function loadResources() {
    if (!supabase) return;

    setLoading(true);

    const { data, error } = await supabase
      .from('resources')
      .select(
        `
        id,
        title,
        description,
        kind,
        resource_type,
        section,
        subsection,
        tags,
        url,
        video_url,
        pdf_url,
        notes,
        players_count,
        materials,
        space,
        variants,
        owner_id,
        author_profile_id
      `
      )
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      alert('Errorea baliabideak kargatzean.');
      setLoading(false);
      return;
    }

    setResources((data ?? []) as unknown as ResourceItem[]);
    setLoading(false);
  }

  function resetForm() {
    setTitle('');
    setDescription('');
    setVideoUrl('');
    setPdfUrl('');
    setTagsText('');
    setNotes('');
    setPlayersCount('');
    setMaterials('');
    setSpace('');
    setVariants('');
    setPdfFile(null);
  }

  function openForm(mode: FormMode, subsection = '') {
    resetForm();
    setFormMode(mode);
    setFormSection(getCurrentSection());
    setFormSubsection(activeSubsection);
    if (subsection) setActiveSubsection(subsection);
  }

    function closeForm() {
    resetForm();
    setEditingResource(null);
    setFormMode(null);
    }

  function openEditForm(resource: ResourceItem) {
    setEditingResource(resource);
    setPdfFile(null);

    setTitle(resource.title ?? '');
    setDescription(resource.description ?? '');
    setVideoUrl(resource.video_url ?? resource.url ?? '');
    setPdfUrl(resource.pdf_url ?? '');
    setTagsText((resource.tags ?? []).join(', '));
    setNotes(resource.notes ?? '');
    setPlayersCount(resource.players_count ?? '');
    setMaterials(resource.materials ?? '');
    setSpace(resource.space ?? '');
    setVariants(resource.variants ?? '');

    setFormMode(
        resource.resource_type === 'task' ? 'task' :
        resource.resource_type === 'video' ? 'clinic' :
        'generic'
    );
    }

  function getCurrentSection() {
    if (activeSection === 'clinics') return 'clinics';
    if (activeSection === 'tasks') return 'tasks';
    if (activeSection === 'physical') return 'physical';
    if (activeSection === 'injuries') return 'injuries';
    if (activeSection === 'unamuno') return 'unamuno';
    return 'general';
  }

  function normalizeTags(value: string) {
    return value
      .split(',')
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean);
  }

    async function saveResource() {
    if (!supabase || !formMode) return;

    if (!title.trim()) {
        alert('Izenburua beharrezkoa da.');
        return;
    }

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        alert('Saioa ez da aurkitu.');
        return;
    }

    const parsedTags = normalizeTags(tagsText);
    const section = formSection || getCurrentSection();
    const subsection = formSubsection || activeSubsection;

    const resourceType =
        formMode === 'clinic'
        ? 'video'
        : formMode === 'task'
        ? 'task'
        : videoUrl.trim()
        ? 'video'
        : pdfUrl.trim()
        ? 'pdf'
        : 'text';

    const canCreate =
        section === 'clinics'
            ? isCoordinator
            : section === 'unamuno' && ['defense', 'attack'].includes(subsection)
            ? isCoordinator
            : true;

    if (!canCreate) {
        alert('Atal honetan koordinatzaileek bakarrik sortu dezakete.');
        return;
    }

    let uploadedPdfUrl = pdfUrl.trim() || null;

    if (pdfFile) {
    const fileExt = pdfFile.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `resources/${user.id}/${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from('resources')
        .upload(filePath, pdfFile);

    if (uploadError) {
        alert(uploadError.message);
        console.error(uploadError);
        return;
    }

    const { data } = supabase.storage
        .from('resources')
        .getPublicUrl(filePath);

    uploadedPdfUrl = data.publicUrl;
    }
    const payload = {
        title: title.trim(),
        description: description.trim() || null,
        kind: resourceType,
        resource_type: resourceType,
        section,
        subsection: subsection || null,
        tags: parsedTags,
        url: videoUrl.trim() || uploadedPdfUrl,
        pdf_url: uploadedPdfUrl,
        video_url: videoUrl.trim() || null,
        notes: notes.trim() || null,
        players_count: playersCount.trim() || null,
        materials: materials.trim() || null,
        space: space.trim() || null,
        variants: variants.trim() || null,
        };

    const { error } = editingResource
    ? await supabase
        .from('resources')
        .update(payload)
        .eq('id', editingResource.id)
    : await supabase.from('resources').insert({
        ...payload,
        owner_id: user.id,
        author_profile_id: user.id,
        });

    if (error) {
        alert(error.message);
        console.error(error);
        return;
    }

    closeForm();
    await loadResources();
    }

  async function deleteResource(resource: ResourceItem) {
    if (!supabase) return;

    const ok = window.confirm('Baliabide hau ezabatu nahi duzu?');
    if (!ok) return;

    const { error } = await supabase
      .from('resources')
      .delete()
      .eq('id', resource.id);

    if (error) {
      alert(error.message);
      console.error(error);
      return;
    }

    await loadResources();
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

  function openResource(resource: ResourceItem) {
    const target = resource.video_url || resource.url || resource.pdf_url;

    if (target) {
      window.open(target, '_blank', 'noopener,noreferrer');
    }
  }

function sectionNeedsSubsection(section: MainSection) {
  return ['physical', 'injuries', 'unamuno'].includes(section);
}

    function matchesCurrentView(resource: ResourceItem) {
    if (activeSection === 'home') return false;

    if (resource.section !== getCurrentSection()) return false;

    if (sectionNeedsSubsection(activeSection) && !activeSubsection) {
        return false;
    }

    if (activeSubsection && resource.subsection !== activeSubsection) {
        return false;
    }

    return true;
    }

  function matchesTags(resource: ResourceItem) {
    const selectedTags = normalizeTags(tagQuery);

    if (selectedTags.length === 0) return true;

    const resourceTags = resource.tags ?? [];

    return selectedTags.every((tag) => resourceTags.includes(tag));
  }

  const visibleResources = useMemo(() => {
    return resources.filter(
      (resource) => matchesCurrentView(resource) && matchesTags(resource)
    );
  }, [resources, activeSection, activeSubsection, tagQuery]);

  function sectionTitle() {
    if (activeSection === 'home') return 'Baliabideak';
    const found = mainBlocks.find((block) => block.key === activeSection);
    return found?.label ?? 'Baliabideak';
  }

  function canShowCreateButton() {
    if (activeSection === 'home') return false;
    if (activeSection === 'planning') return false;
    if (activeSection === 'clinics') return isCoordinator;
    if (activeSection === 'unamuno' && !['defense', 'attack'].includes(activeSubsection)) {
      return false;
    }
    if (activeSection === 'unamuno') return isCoordinator;
    return true;
  }

  function currentFormMode(): FormMode {
    if (activeSection === 'clinics') return 'clinic';
    if (activeSection === 'tasks') return 'task';
    return 'generic';
  }

  function goToSection(section: MainSection) {
    setActiveSection(section);
    setActiveSubsection('');
    setTagQuery('');
  }

  function formatSpace(spaceValue: string | null) {
    if (spaceValue === 'medio_campo') return 'Kantxa erdia';
    if (spaceValue === 'campo_entero') return 'Kantxa osoa';
    if (spaceValue === 'fuera_cancha') return 'Kantxatik kanpo';

    return spaceValue ?? '';
    }

  return (
    <section>
      <div className="section-head">
        <h2>{sectionTitle()}</h2>

        {activeSection !== 'home' && (
          <button className="ghost" onClick={() => goToSection('home')}>
            Atzera
          </button>
        )}

        {canShowCreateButton() && (
          <button onClick={() => openForm(currentFormMode())}>
            + Baliabidea
          </button>
        )}
      </div>

      {activeSection === 'home' && (
        <div className="resource-menu">
          {mainBlocks.map((block) => (
            <button
              key={block.key}
              onClick={() => goToSection(block.key)}
            >
              {block.label}
            </button>
          ))}
        </div>
      )}

      {activeSection === 'physical' && (
        <div className="resource-menu">
          {physicalButtons.map((button) => (
            <button
              key={button.subsection}
              onClick={() => setActiveSubsection(button.subsection)}
            >
              {button.label}
            </button>
          ))}

          {fixedPdfButtons.physical.map((button) => (
            <button key={button.subsection}>
              {button.label}
            </button>
          ))}
        </div>
      )}

      {activeSection === 'injuries' && (
        <div className="resource-menu">
          {fixedPdfButtons.injuries.map((button) => (
            <button key={button.subsection}>
              {button.label}
            </button>
          ))}

          {injuriesButtons.map((button) => (
            <button
              key={button.subsection}
              onClick={() => setActiveSubsection(button.subsection)}
            >
              {button.label}
            </button>
          ))}
        </div>
      )}

      {activeSection === 'planning' && (
        <div className="resource-menu">
          {fixedPdfButtons.planning.map((button) => (
            <button key={button.subsection}>
              {button.label}
            </button>
          ))}
        </div>
      )}

      {activeSection === 'unamuno' && (
        <>
          <div className="resource-menu">
            {fixedPdfButtons.unamuno.map((button) => (
              <button key={button.subsection}>
                {button.label}
              </button>
            ))}

            <button onClick={() => setActiveSubsection('tactic')}>
              Taktika
            </button>
          </div>

          {activeSubsection === 'tactic' && (
            <div className="resource-menu">
              {tacticButtons.map((button) => (
                <button
                  key={button.subsection}
                  onClick={() => setActiveSubsection(button.subsection)}
                >
                  {button.label}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {activeSection !== 'home' && (
        <>
          <input
            className="search"
            placeholder="Etiketak bilatu: erasoa, defentsa, lesioak..."
            value={tagQuery}
            onChange={(event) => setTagQuery(event.target.value)}
          />

          {loading ? (
            <p>Kargatzen...</p>
          ) : (
            <div className="cards-grid">
              {visibleResources.map((resource) => {
                const thumb = getYoutubeThumb(resource.video_url || resource.url);

                return (
                  <article
                    className="resource-card"
                    key={resource.id}
                    onClick={() => openResource(resource)}
                  >
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={resource.title}
                        className="resource-thumb"
                      />
                    ) : (
                      <div className="thumb">📄</div>
                    )}

                    <h3>{resource.title}</h3>

                    {resource.description && <p>{resource.description}</p>}

                    {resource.players_count && (
                      <small>Jokalariak: {resource.players_count}</small>
                    )}

                    {resource.materials && (
                      <small>Materiala: {resource.materials}</small>
                    )}

                    {resource.space && (
                    <small>Espazioa: {formatSpace(resource.space)}</small>
                    )}

                    <div className="tag-row">
                      {(resource.tags ?? []).map((tag) => (
                        <span key={tag}>#{tag}</span>
                      ))}
                    </div>

                    <div className="resource-actions">
                        {resource.variants && (
                            <button
                            type="button"
                            className="ghost"
                            onClick={(event) => {
                                event.stopPropagation();
                                setVariantsModalText(resource.variants ?? '');
                            }}
                            >
                            Barianteak
                            </button>
                        )}

                        {(isCoordinator || resource.owner_id === session.teamId) && (
                            <>
                            <button
                                className="ghost"
                                onClick={(event) => {
                                event.stopPropagation();
                                openEditForm(resource);
                                }}
                            >
                                Editatu
                            </button>

                            <button
                                className="danger"
                                onClick={(event) => {
                                event.stopPropagation();
                                deleteResource(resource);
                                }}
                            >
                                Ezabatu
                            </button>
                            </>
                        )}
                        </div>
                  </article>
                );
              })}

              {visibleResources.length === 0 && (
                <p className="hint">{sectionNeedsSubsection(activeSection) && !activeSubsection
                    ? 'Aukeratu azpiatal bat baliabideak ikusteko.'
                    : 'Ez dago baliabiderik atal honetan.'}</p>
              )}
            </div>
          )}
        </>
      )}

    {formMode && (
    <div className="modal-backdrop">
        <div className="modal-card">
        <h3>{editingResource ? 'Baliabidea editatu' : 'Baliabide berria'}</h3>

        <label>
            Atala
            <select
            value={formSection}
            onChange={(event) => {
                setFormSection(event.target.value);
                setFormSubsection('');
            }}
            >
            <option value="clinics">Clinics</option>
            <option value="tasks">Ariketen bankua</option>
            <option value="physical">Prestaketa fisikoa</option>
            <option value="injuries">Lesioak</option>
            <option value="unamuno">Unamuno</option>
            </select>
        </label>

        {(formSection === 'physical' ||
            formSection === 'injuries' ||
            formSection === 'unamuno') && (
            <label>
            Azpiatala
            <select
                value={formSubsection}
                onChange={(event) => setFormSubsection(event.target.value)}
            >
                <option value="">Aukeratu...</option>

                {formSection === 'physical' && (
                <>
                    <option value="mobility">Mugikortasuna</option>
                    <option value="activation">Aktibazioa</option>
                    <option value="injury_prevention">Lesioen prebentzioa</option>
                </>
                )}

                {formSection === 'injuries' && (
                <>
                    <option value="during_injury">Lesioan zehar</option>
                </>
                )}

                {formSection === 'unamuno' && (
                <>
                    <option value="defense">Taktika - Defentsa</option>
                    <option value="attack">Taktika - Erasoa</option>
                </>
                )}
            </select>
            </label>
        )}

        <label>
            Izenburua
            <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            />
        </label>

        <label>
            Deskribapena
            <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            />
        </label>

        {formMode === 'task' && (
            <>
            <label>
                Jokalari kopurua
                <input
                value={playersCount}
                onChange={(event) => setPlayersCount(event.target.value)}
                />
            </label>

            <label>
                Materiala
                <input
                value={materials}
                onChange={(event) => setMaterials(event.target.value)}
                />
            </label>

            <label>
                Espazioa
                <select
                value={space}
                onChange={(event) => setSpace(event.target.value)}
                >
                <option value="">Aukeratu...</option>
                <option value="medio_campo">Kantxa erdia</option>
                <option value="campo_entero">Kantxa osoa</option>
                <option value="fuera_cancha">Kantxatik kanpo</option>
                </select>
            </label>

            <label>
            Barianteak
            <textarea
                className="variant-textarea"
                value={variants}
                onChange={(event) => setVariants(event.target.value)}
            />
            </label>
            </>
        )}

        <label>
            Bideoaren URL-a
            <input
            value={videoUrl}
            onChange={(event) => setVideoUrl(event.target.value)}
            placeholder="YouTube URL"
            />
        </label>

        <label>
            PDF URL-a
            <input
            value={pdfUrl}
            onChange={(event) => setPdfUrl(event.target.value)}
            placeholder="Oraingoz URL bidez"
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
            {pdfFile?.name ?? 'Ez da fitxategirik aukeratu'}
            </span>
        </div>
        </label>     

        <label>
            Etiketak
            <input
            value={tagsText}
            onChange={(event) => setTagsText(event.target.value)}
            placeholder="erasoa, defentsa, tiroa"
            />
        </label>

        <div className="modal-actions">
            <button type="button" onClick={closeForm}>
            Utzi
            </button>

            <button type="button" onClick={saveResource}>
            {editingResource ? 'Gorde aldaketak' : 'Gorde'}
            </button>
        </div>
        </div>
    </div>
    )}

    {variantsModalText && (
        <div className="modal-backdrop">
            <div className="modal-card">
            <h3>Barianteak</h3>

            <p style={{ whiteSpace: 'pre-wrap' }}>
                {variantsModalText}
            </p>

            <div className="modal-actions">
                <button
                type="button"
                onClick={() => setVariantsModalText('')}
                >
                Itxi
                </button>
            </div>
            </div>
        </div>
        )}
    </section>
  );
}