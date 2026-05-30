import { useState, useEffect } from 'react'
import {
  collection, onSnapshot, addDoc, deleteDoc,
  doc, updateDoc, query, orderBy
} from 'firebase/firestore'
import { db } from './firebase'

const COUPLE_CODE = 'MeryemHamza2025'

const CATEGORIES = ['Cuisine', 'Déco', 'Voyage', 'Salle de bain', 'Chambre', 'Autre']
const EMOJIS = ['🎁','🍽️','🥣','🖼️','🏨','🍷','🛁','📚','🌸','💎','✈️','🏡','🎨','🎵','🌿','💐','🕯️','🪴','☕','🫶']

const DEFAULT_GIFTS = [
  { name: 'Service de vaisselle', description: '12 personnes, porcelaine blanche', price: 280, category: 'Cuisine', emoji: '🍽️', url: '', image: '' },
  { name: 'Robot culinaire', description: 'KitchenAid artisan 4.8L', price: 450, category: 'Cuisine', emoji: '🥣', url: '', image: '' },
  { name: 'Cadre photo personnalisé', description: 'Bois gravé avec nos prénoms', price: 60, category: 'Déco', emoji: '🖼️', url: '', image: '' },
  { name: 'Nuit d\'hôtel romantique', description: 'Suite pour 2 personnes', price: 200, category: 'Voyage', emoji: '🏨', url: '', image: '' },
  { name: 'Cave à vin', description: '36 bouteilles, température réglable', price: 350, category: 'Cuisine', emoji: '🍷', url: '', image: '' },
  { name: 'Linge de bain de luxe', description: 'Coffret 6 serviettes égyptiennes', price: 90, category: 'Salle de bain', emoji: '🛁', url: '', image: '' },
]

async function extractProductFromUrl(url) {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{
          role: 'user',
          content: `Visite cette page produit : ${url}
Extrais les informations suivantes et réponds UNIQUEMENT en JSON valide, sans texte avant ou après :
{
  "name": "nom du produit",
  "description": "description courte (max 100 caractères)",
  "price": 0,
  "image": "url directe de la photo principale du produit"
}
Si tu ne trouves pas une valeur, mets "" ou 0. Le prix doit être un nombre sans symbole monétaire.`
        }]
      })
    })
    const data = await response.json()
    const text = data.content?.filter(b => b.type === 'text').map(b => b.text).join('') || ''
    const clean = text.replace(/```json|```/g, '').trim()
    const start = clean.indexOf('{')
    const end = clean.lastIndexOf('}')
    if (start === -1 || end === -1) throw new Error('No JSON')
    return JSON.parse(clean.slice(start, end + 1))
  } catch (e) {
    console.error(e)
    return null
  }
}

export default function App() {
  const [view, setView] = useState('home')
  const [codeInput, setCodeInput] = useState('')
  const [codeError, setCodeError] = useState(false)
  const [showCodeModal, setShowCodeModal] = useState(false)
  const [gifts, setGifts] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [newGift, setNewGift] = useState({ name: '', description: '', price: '', category: 'Cuisine', emoji: '🎁', url: '', image: '' })
  const [urlLoading, setUrlLoading] = useState(false)
  const [urlError, setUrlError] = useState('')
  const [reserveModal, setReserveModal] = useState(null)
  const [guestName, setGuestName] = useState('')
  const [filterCat, setFilterCat] = useState('Tout')
  const [notif, setNotif] = useState(null)
  const [fbError, setFbError] = useState(false)

  useEffect(() => {
    if (view === 'couple' || view === 'guests') {
      setLoading(true)
      try {
        const q = query(collection(db, 'gifts'), orderBy('createdAt', 'asc'))
        const unsub = onSnapshot(q,
          (snap) => { setGifts(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false); setFbError(false) },
          (err) => { console.error(err); setFbError(true); setLoading(false) }
        )
        return () => unsub()
      } catch (e) { setFbError(true); setLoading(false) }
    }
  }, [view])

  const showNotif = (msg) => { setNotif(msg); setTimeout(() => setNotif(null), 3200) }

  const handleCoupleAccess = () => {
    if (codeInput === COUPLE_CODE) { setShowCodeModal(false); setCodeError(false); setCodeInput(''); setView('couple') }
    else { setCodeError(true); setTimeout(() => setCodeError(false), 1500) }
  }

  const handleUrlFetch = async () => {
    if (!newGift.url.trim()) return
    setUrlLoading(true)
    setUrlError('')
    const result = await extractProductFromUrl(newGift.url.trim())
    if (result) {
      setNewGift(prev => ({
        ...prev,
        name: result.name || prev.name,
        description: result.description || prev.description,
        price: result.price || prev.price,
        image: result.image || prev.image,
      }))
      showNotif('✨ Infos produit chargées automatiquement !')
    } else {
      setUrlError('Impossible de charger les infos, remplissez manuellement.')
    }
    setUrlLoading(false)
  }

  const addGift = async () => {
    if (!newGift.name.trim()) return
    try {
      await addDoc(collection(db, 'gifts'), {
        ...newGift, price: parseFloat(newGift.price) || 0,
        reserved: false, reservedBy: '', createdAt: Date.now()
      })
      setNewGift({ name: '', description: '', price: '', category: 'Cuisine', emoji: '🎁', url: '', image: '' })
      setShowForm(false)
      showNotif('🎁 Cadeau ajouté !')
    } catch (e) { console.error(e) }
  }

  const removeGift = async (id) => {
    try { await deleteDoc(doc(db, 'gifts', id)); showNotif('Cadeau supprimé') }
    catch (e) { console.error(e) }
  }

  const reserveGift = async () => {
    if (!guestName.trim() || !reserveModal) return
    try {
      await updateDoc(doc(db, 'gifts', reserveModal), { reserved: true, reservedBy: guestName.trim() })
      setReserveModal(null)
      const name = guestName.trim()
      setGuestName('')
      showNotif(`✨ Merci ${name} ! Cadeau réservé avec amour 💜`)
    } catch (e) { console.error(e) }
  }

  const seedDefaults = async () => {
    for (const g of DEFAULT_GIFTS) {
      await addDoc(collection(db, 'gifts'), { ...g, reserved: false, reservedBy: '', createdAt: Date.now() })
    }
    showNotif('Cadeaux exemples ajoutés !')
  }

  const availableGifts = gifts.filter(g => !g.reserved)
  const reservedCount = gifts.filter(g => g.reserved).length
  const totalValue = gifts.reduce((s, g) => s + (g.price || 0), 0)
  const categories = ['Tout', ...new Set(gifts.map(g => g.category))]
  const filteredGifts = availableGifts.filter(g => filterCat === 'Tout' || g.category === filterCat)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'Nunito, sans-serif' }}>
      <style>{`
        :root {
          --bg: #f0f0fa; --bg2: #e8e6f8; --primary: #6c5ce7;
          --primary-light: #a29bfe; --primary-dark: #4834d4;
          --text: #2d2b4e; --text2: #6b6896;
          --card: rgba(255,255,255,0.85);
          --shadow: 0 4px 24px rgba(108,92,231,0.12);
          --shadow-lg: 0 12px 40px rgba(108,92,231,0.2);
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: var(--bg); }
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideDown { from { opacity:0; transform:translateY(-16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-8px)} 40%,80%{transform:translateX(8px)} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .btn { border:none; cursor:pointer; font-family:Nunito,sans-serif; font-weight:700; transition:all 0.2s; letter-spacing:0.3px; }
        .btn-primary { background:linear-gradient(135deg,var(--primary),var(--primary-dark)); color:white; padding:14px 36px; border-radius:50px; font-size:16px; box-shadow:0 6px 20px rgba(108,92,231,0.35); }
        .btn-primary:hover { transform:translateY(-2px); box-shadow:0 10px 28px rgba(108,92,231,0.45); }
        .btn-primary:disabled { opacity:0.5; cursor:not-allowed; transform:none; }
        .btn-outline { background:transparent; color:var(--primary); border:2px solid var(--primary-light); padding:12px 32px; border-radius:50px; font-size:15px; }
        .btn-outline:hover { background:var(--bg2); }
        .btn-ghost { background:none; color:var(--text2); padding:8px 16px; border-radius:20px; font-size:14px; border:none; }
        .btn-ghost:hover { color:var(--primary); background:var(--bg2); }
        .btn-fetch { background:var(--bg2); color:var(--primary); border:2px solid var(--primary-light); padding:10px 18px; border-radius:12px; font-size:13px; font-weight:700; cursor:pointer; white-space:nowrap; transition:all 0.2s; font-family:Nunito,sans-serif; }
        .btn-fetch:hover { background:var(--primary); color:white; }
        .btn-fetch:disabled { opacity:0.5; cursor:not-allowed; }
        .input { width:100%; padding:13px 18px; border:2px solid #dddaf5; border-radius:14px; font-family:Nunito,sans-serif; font-size:15px; color:var(--text); background:white; outline:none; transition:border-color 0.2s; }
        .input:focus { border-color:var(--primary-light); }
        .input.error { border-color:#e17055; animation:shake 0.4s ease; }
        .card { background:var(--card); border-radius:20px; box-shadow:var(--shadow); backdrop-filter:blur(8px); border:1px solid rgba(162,155,254,0.2); }
        .gift-card { background:white; border-radius:18px; padding:18px 20px; box-shadow:0 2px 16px rgba(108,92,231,0.08); border:1.5px solid rgba(162,155,254,0.15); transition:all 0.25s; cursor:pointer; animation:fadeUp 0.4s ease forwards; }
        .gift-card:hover { transform:translateY(-4px); box-shadow:var(--shadow-lg); border-color:var(--primary-light); }
        .tag { display:inline-block; padding:3px 11px; border-radius:20px; font-size:11px; font-weight:700; background:var(--bg2); color:var(--primary); }
        .filter-btn { padding:7px 16px; border-radius:20px; cursor:pointer; font-family:Nunito,sans-serif; font-size:13px; font-weight:700; border:1.5px solid #dddaf5; background:white; color:var(--text2); transition:all 0.2s; }
        .filter-btn.active { border-color:var(--primary); background:var(--bg2); color:var(--primary); }
        .emoji-btn { width:38px; height:38px; border-radius:10px; border:2px solid transparent; cursor:pointer; font-size:18px; background:var(--bg); transition:all 0.15s; }
        .emoji-btn:hover, .emoji-btn.sel { border-color:var(--primary); background:var(--bg2); }
        .modal-overlay { position:fixed; inset:0; background:rgba(45,43,78,0.45); display:flex; align-items:center; justify-content:center; z-index:1000; backdrop-filter:blur(6px); }
        .modal { background:white; border-radius:28px; padding:36px; max-width:440px; width:92%; animation:fadeUp 0.3s ease; max-height:90vh; overflow-y:auto; }
        .notif { position:fixed; bottom:32px; left:50%; transform:translateX(-50%); background:var(--text); color:white; padding:14px 28px; border-radius:50px; font-size:14px; font-weight:600; z-index:2000; animation:slideDown 0.3s ease; box-shadow:0 8px 30px rgba(45,43,78,0.25); white-space:nowrap; }
        .stat-card { background:white; border-radius:16px; padding:16px 12px; text-align:center; box-shadow:0 2px 14px rgba(108,92,231,0.08); border:1px solid rgba(162,155,254,0.2); }
        .orb { position:absolute; border-radius:50%; filter:blur(60px); pointer-events:none; opacity:0.35; }
        .spinner { width:16px; height:16px; border:2px solid var(--primary-light); border-top-color:var(--primary); border-radius:50%; animation:spin 0.7s linear infinite; display:inline-block; }
        .gift-img { width:100%; height:160px; object-fit:cover; border-radius:12px; margin-bottom:12px; }
      `}</style>

      {notif && <div className="notif">{notif}</div>}
      {view === 'home' && (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', overflow: 'hidden' }}>
          <div className="orb" style={{ width: 400, height: 400, background: '#a29bfe', top: '-100px', right: '-100px' }} />
          <div className="orb" style={{ width: 300, height: 300, background: '#6c5ce7', bottom: '-80px', left: '-80px' }} />
          <div className="orb" style={{ width: 200, height: 200, background: '#b8b0f8', top: '40%', left: '10%' }} />
          <div style={{ textAlign: 'center', maxWidth: 520, position: 'relative', zIndex: 1 }}>
            <div className="float" style={{ fontSize: 64, marginBottom: 20 }}>💍</div>
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, letterSpacing: 4, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: 12, fontWeight: 300 }}>Mariage de</p>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(44px, 8vw, 68px)', color: 'var(--primary)', lineHeight: 1.1, marginBottom: 6 }}>Meryem</h1>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 6 }}>
              <div style={{ height: 1, width: 60, background: 'var(--primary-light)' }} />
              <span style={{ color: 'var(--primary-light)', fontSize: 22 }}>✦</span>
              <div style={{ height: 1, width: 60, background: 'var(--primary-light)' }} />
            </div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(44px, 8vw, 68px)', color: 'var(--text)', fontStyle: 'italic', lineHeight: 1.1, marginBottom: 32 }}>Hamza</h1>
            <p style={{ color: 'var(--text2)', fontSize: 16, lineHeight: 1.7, marginBottom: 44, fontWeight: 300 }}>Aidez-nous à démarrer notre vie ensemble en choisissant un cadeau dans notre liste. Chaque cadeau réservé disparaît automatiquement 🎀</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
              <button className="btn btn-primary" style={{ fontSize: 17, padding: '16px 52px', width: '100%', maxWidth: 320 }} onClick={() => setView('guests')}>🎁 Voir la liste des cadeaux</button>
              <button className="btn btn-outline" style={{ width: '100%', maxWidth: 320 }} onClick={() => setShowCodeModal(true)}>💑 Espace mariés</button>
            </div>
          </div>
        </div>
      )}

      {showCodeModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCodeModal(false)}>
          <div className="modal">
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ fontSize: 52, marginBottom: 12 }}>🔐</div>
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, color: 'var(--text)', marginBottom: 8 }}>Espace Mariés</h3>
              <p style={{ color: 'var(--text2)', fontSize: 15 }}>Entrez votre code secret pour accéder à la gestion de la liste</p>
            </div>
            <input className={`input ${codeError ? 'error' : ''}`} type="password" placeholder="Code secret..." value={codeInput} onChange={e => setCodeInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCoupleAccess()} style={{ marginBottom: 16, textAlign: 'center', fontSize: 18, letterSpacing: 4 }} autoFocus />
            {codeError && <p style={{ color: '#e17055', fontSize: 13, textAlign: 'center', marginBottom: 12, fontWeight: 600 }}>Code incorrect, réessayez 🔒</p>}
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-outline" onClick={() => { setShowCodeModal(false); setCodeInput(''); setCodeError(false) }} style={{ flex: 1 }}>Annuler</button>
              <button className="btn btn-primary" onClick={handleCoupleAccess} style={{ flex: 2 }}>Entrer ✦</button>
            </div>
          </div>
        </div>
      )}

      {view === 'couple' && (
        <div style={{ maxWidth: 780, margin: '0 auto', padding: '28px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <button className="btn btn-ghost" onClick={() => setView('home')} style={{ padding: '6px 0', marginBottom: 6 }}>← Accueil</button>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, color: 'var(--text)' }}>Gestion de la liste</h2>
              <p style={{ color: 'var(--text2)', fontSize: 14 }}>Meryem & Hamza · Espace privé 🔐</p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>{showForm ? '✕ Annuler' : '+ Ajouter un cadeau'}</button>
          </div>

          {fbError && (
            <div style={{ background: '#fff3f0', border: '1.5px solid #fab1a0', borderRadius: 14, padding: '14px 20px', marginBottom: 20, color: '#c0392b', fontSize: 14 }}>
              ⚠️ <strong>Firebase non configuré.</strong> Ouvrez <code>src/firebase.js</code> et remplacez les valeurs.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
            {[[gifts.length, 'cadeaux total', '🎁'], [reservedCount, 'réservés', '✅'], [`${totalValue} DH`, 'valeur totale', '💰']].map(([v, l, icon]) => (
              <div key={l} className="stat-card">
                <div style={{ fontSize: 22 }}>{icon}</div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: 'var(--primary)', fontWeight: 600 }}>{v}</div>
                <div style={{ color: 'var(--text2)', fontSize: 12 }}>{l}</div>
              </div>
            ))}
          </div>

          {showForm && (
            <div className="card" style={{ padding: 24, marginBottom: 24, animation: 'slideDown 0.3s ease' }}>
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: 'var(--text)', marginBottom: 18 }}>Nouveau cadeau</h3>
              <div style={{ display: 'grid', gap: 12 }}>

                {/* URL auto-fetch */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)', marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    🔗 Lien du produit (optionnel — remplit auto les infos)
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="input" placeholder="https://www.amazon.ma/..." value={newGift.url} onChange={e => setNewGift({ ...newGift, url: e.target.value })} onKeyDown={e => e.key === 'Enter' && handleUrlFetch()} />
                    <button className="btn-fetch" onClick={handleUrlFetch} disabled={urlLoading || !newGift.url.trim()}>
                      {urlLoading ? <span className="spinner" /> : '✨ Charger'}
                    </button>
                  </div>
                  {urlError && <p style={{ color: '#e17055', fontSize: 12, marginTop: 6 }}>⚠️ {urlError}</p>}
                </div>

                {/* Image preview */}
                {newGift.image && (
                  <div style={{ position: 'relative' }}>
                    <img src={newGift.image} alt="aperçu" className="gift-img" onError={e => { e.target.style.display = 'none' }} />
                    <button onClick={() => setNewGift({ ...newGift, image: '' })} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 14 }}>✕</button>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <input className="input" placeholder="Nom du cadeau *" value={newGift.name} onChange={e => setNewGift({ ...newGift, name: e.target.value })} />
                  <input className="input" placeholder="Prix (DH)" type="number" value={newGift.price} onChange={e => setNewGift({ ...newGift, price: e.target.value })} />
                </div>
                <input className="input" placeholder="Description (optionnel)" value={newGift.description} onChange={e => setNewGift({ ...newGift, description: e.target.value })} />
                <input className="input" placeholder="URL image manuelle (optionnel)" value={newGift.image} onChange={e => setNewGift({ ...newGift, image: e.target.value })} />
                <select className="input" value={newGift.category} onChange={e => setNewGift({ ...newGift, category: e.target.value })}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '10px 12px', background: 'var(--bg)', borderRadius: 12 }}>
                  {EMOJIS.map(e => (
                    <button key={e} className={`emoji-btn ${newGift.emoji === e ? 'sel' : ''}`} onClick={() => setNewGift({ ...newGift, emoji: e })}>{e}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="btn btn-primary" onClick={addGift} disabled={!newGift.name.trim()}>Ajouter</button>
                  {gifts.length === 0 && <button className="btn btn-outline" onClick={seedDefaults}>Ajouter des exemples</button>}
                </div>
              </div>
            </div>
          )}

          {gifts.length === 0 && !showForm && !fbError && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎁</div>
              <p style={{ color: 'var(--text2)', marginBottom: 20 }}>Votre liste est vide. Ajoutez votre premier cadeau !</p>
              <button className="btn btn-outline" onClick={seedDefaults}>Ajouter des exemples pour commencer</button>
            </div>
          )}

          <div style={{ display: 'grid', gap: 12 }}>
            {gifts.map(gift => (
              <div key={gift.id} style={{ background: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 14px rgba(108,92,231,0.07)', border: '1.5px solid rgba(162,155,254,0.15)', opacity: gift.reserved ? 0.55 : 1, animation: 'fadeUp 0.4s ease' }}>
                {gift.image && <img src={gift.image} alt={gift.name} style={{ width: '100%', height: 140, objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />}
                <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  {!gift.image && <div style={{ fontSize: 34, minWidth: 44, textAlign: 'center' }}>{gift.emoji}</div>}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
                      <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: 'var(--text)', fontWeight: 600 }}>{gift.name}</span>
                      <span className="tag">{gift.category}</span>
                      {gift.reserved && <span style={{ fontSize: 12, background: '#d4f0d4', color: '#2a7a2a', padding: '2px 10px', borderRadius: 20, fontWeight: 700 }}>✓ {gift.reservedBy}</span>}
                    </div>
                    {gift.description && <p style={{ color: 'var(--text2)', fontSize: 13 }}>{gift.description}</p>}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                      {gift.price > 0 && <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 15 }}>{gift.price} DH</span>}
                      {gift.url && <a href={gift.url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-light)', fontSize: 12, textDecoration: 'none' }} onClick={e => e.stopPropagation()}>🔗 Voir le produit</a>}
                    </div>
                  </div>
                  <button onClick={() => removeGift(gift.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ddd', fontSize: 18, padding: 8, transition: 'color 0.2s' }}
                    onMouseEnter={e => e.target.style.color = '#e17055'}
                    onMouseLeave={e => e.target.style.color = '#ddd'}>✕</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'guests' && (
        <div style={{ maxWidth: 780, margin: '0 auto', padding: '28px 16px' }}>
          <div style={{ textAlign: 'center', marginBottom: 36, position: 'relative' }}>
            <button className="btn btn-ghost" onClick={() => setView('home')} style={{ position: 'absolute', left: 0, top: 0 }}>← Accueil</button>
            <div style={{ fontSize: 48, marginBottom: 10 }}>💌</div>
            <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(26px, 5vw, 38px)', color: 'var(--text)', marginBottom: 6 }}>
              Liste de <em style={{ color: 'var(--primary)' }}>Meryem & Hamza</em>
            </h2>
            <p style={{ color: 'var(--text2)', fontSize: 15 }}>
              {loading ? 'Chargement...' : `${availableGifts.length} cadeau${availableGifts.length > 1 ? 'x' : ''} disponible${availableGifts.length > 1 ? 's' : ''}${reservedCount > 0 ? ` · ${reservedCount} déjà offert${reservedCount > 1 ? 's' : ''}` : ''}`}
            </p>
          </div>

          {fbError && (
            <div style={{ background: '#fff3f0', border: '1.5px solid #fab1a0', borderRadius: 14, padding: '14px 20px', marginBottom: 20, color: '#c0392b', fontSize: 14, textAlign: 'center' }}>
              ⚠️ Connexion Firebase requise.
            </div>
          )}

          {!loading && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
              {categories.map(cat => (
                <button key={cat} className={`filter-btn ${filterCat === cat ? 'active' : ''}`} onClick={() => setFilterCat(cat)}>{cat}</button>
              ))}
            </div>
          )}

          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: 44, marginBottom: 12, animation: 'float 1.5s ease-in-out infinite' }}>💜</div>
              <p style={{ color: 'var(--text2)' }}>Chargement des cadeaux...</p>
            </div>
          )}

          {!loading && filteredGifts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '80px 20px' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", color: 'var(--text)', fontSize: 24, marginBottom: 10 }}>
                {availableGifts.length === 0 ? 'Tous les cadeaux ont été réservés !' : 'Aucun cadeau dans cette catégorie'}
              </h3>
              <p style={{ color: 'var(--text2)' }}>{availableGifts.length === 0 ? 'Merci à tous les invités généreux 💜' : 'Essayez une autre catégorie'}</p>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {filteredGifts.map((gift, i) => (
              <div key={gift.id} className="gift-card" style={{ animationDelay: `${i * 0.06}s`, padding: 0, overflow: 'hidden' }} onClick={() => setReserveModal(gift.id)}>
                {gift.image
                  ? <img src={gift.image} alt={gift.name} style={{ width: '100%', height: 180, objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
                  : <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, background: 'var(--bg)' }}>{gift.emoji}</div>
                }
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 18, color: 'var(--text)', fontWeight: 600, lineHeight: 1.3 }}>{gift.name}</span>
                    <span className="tag">{gift.category}</span>
                  </div>
                  {gift.description && <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.5, marginBottom: 8 }}>{gift.description}</p>}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {gift.price > 0 && <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 18 }}>{gift.price} DH</span>}
                    <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 13, marginLeft: 'auto' }}>Offrir ce cadeau →</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {reserveModal && (() => {
        const gift = gifts.find(g => g.id === reserveModal)
        if (!gift) return null
        return (
          <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setReserveModal(null)}>
            <div className="modal">
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                {gift.image
                  ? <img src={gift.image} alt={gift.name} style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 16, marginBottom: 16 }} onError={e => e.target.style.display = 'none'} />
                  : <div style={{ fontSize: 58, marginBottom: 12 }}>{gift.emoji}</div>
                }
                <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, color: 'var(--text)', marginBottom: 6 }}>{gift.name}</h3>
                {gift.price > 0 && <p style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 22, marginBottom: 6 }}>{gift.price} DH</p>}
                {gift.description && <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 6 }}>{gift.description}</p>}
                {gift.url && <a href={gift.url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-light)', fontSize: 13, display: 'block', marginBottom: 4 }}>🔗 Voir le produit en ligne</a>}
              </div>
              <p style={{ color: 'var(--text2)', fontSize: 15, textAlign: 'center', lineHeight: 1.6, marginBottom: 20 }}>
                Entrez votre prénom pour que Meryem & Hamza sachent que c'est vous 💜
              </p>
              <input className="input" placeholder="Votre prénom ou nom" value={guestName} onChange={e => setGuestName(e.target.value)} onKeyDown={e => e.key === 'Enter' && reserveGift()} style={{ marginBottom: 16 }} autoFocus />
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn btn-outline" onClick={() => setReserveModal(null)} style={{ flex: 1 }}>Annuler</button>
                <button className="btn btn-primary" onClick={reserveGift} style={{ flex: 2 }} disabled={!guestName.trim()}>🎁 Je réserve !</button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
