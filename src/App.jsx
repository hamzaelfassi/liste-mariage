import { useState, useEffect } from 'react'
import {
  collection, onSnapshot, addDoc, deleteDoc,
  doc, updateDoc, query, orderBy
} from 'firebase/firestore'
import { db } from './firebase'

// ══════════════════════════════════════════════
//  CODE SECRET MARIÉS — changez-le si vous voulez
// ══════════════════════════════════════════════
const COUPLE_CODE = 'MeryemHamza2025'

const CATEGORIES = ['Cuisine', 'Déco', 'Voyage', 'Salle de bain', 'Chambre', 'Autre']
const EMOJIS = ['🎁','🍽️','🥣','🖼️','🏨','🍷','🛁','📚','🌸','💎','✈️','🏡','🎨','🎵','🌿','💐','🕯️','🪴','☕','🫶']

const DEFAULT_GIFTS = [
  { name: 'Service de vaisselle', description: '12 personnes, porcelaine blanche', price: 280, category: 'Cuisine', emoji: '🍽️' },
  { name: 'Robot culinaire', description: 'KitchenAid artisan 4.8L', price: 450, category: 'Cuisine', emoji: '🥣' },
  { name: 'Cadre photo personnalisé', description: 'Bois gravé avec nos prénoms', price: 60, category: 'Déco', emoji: '🖼️' },
  { name: 'Nuit d\'hôtel romantique', description: 'Suite pour 2 personnes', price: 200, category: 'Voyage', emoji: '🏨' },
  { name: 'Cave à vin', description: '36 bouteilles, température réglable', price: 350, category: 'Cuisine', emoji: '🍷' },
  { name: 'Linge de bain de luxe', description: 'Coffret 6 serviettes égyptiennes', price: 90, category: 'Salle de bain', emoji: '🛁' },
]

export default function App() {
  const [view, setView] = useState('home') // home | couple | guests
  const [codeInput, setCodeInput] = useState('')
  const [codeError, setCodeError] = useState(false)
  const [showCodeModal, setShowCodeModal] = useState(false)
  const [gifts, setGifts] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [newGift, setNewGift] = useState({ name: '', description: '', price: '', category: 'Cuisine', emoji: '🎁' })
  const [reserveModal, setReserveModal] = useState(null)
  const [guestName, setGuestName] = useState('')
  const [filterCat, setFilterCat] = useState('Tout')
  const [notif, setNotif] = useState(null)
  const [fbError, setFbError] = useState(false)

  // Load gifts from Firestore
  useEffect(() => {
    if (view === 'couple' || view === 'guests') {
      setLoading(true)
      try {
        const q = query(collection(db, 'gifts'), orderBy('createdAt', 'asc'))
        const unsub = onSnapshot(q,
          (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
            setGifts(data)
            setLoading(false)
            setFbError(false)
          },
          (err) => {
            console.error(err)
            setFbError(true)
            setLoading(false)
          }
        )
        return () => unsub()
      } catch (e) {
        setFbError(true)
        setLoading(false)
      }
    }
  }, [view])

  const showNotif = (msg) => {
    setNotif(msg)
    setTimeout(() => setNotif(null), 3200)
  }

  const handleCoupleAccess = () => {
    if (codeInput === COUPLE_CODE) {
      setShowCodeModal(false)
      setCodeError(false)
      setCodeInput('')
      setView('couple')
    } else {
      setCodeError(true)
      setTimeout(() => setCodeError(false), 1500)
    }
  }

  const addGift = async () => {
    if (!newGift.name.trim()) return
    try {
      await addDoc(collection(db, 'gifts'), {
        ...newGift,
        price: parseFloat(newGift.price) || 0,
        reserved: false,
        reservedBy: '',
        createdAt: Date.now()
      })
      setNewGift({ name: '', description: '', price: '', category: 'Cuisine', emoji: '🎁' })
      setShowForm(false)
      showNotif('🎁 Cadeau ajouté !')
    } catch (e) { console.error(e) }
  }

  const removeGift = async (id) => {
    try {
      await deleteDoc(doc(db, 'gifts', id))
      showNotif('Cadeau supprimé')
    } catch (e) { console.error(e) }
  }

  const reserveGift = async () => {
    if (!guestName.trim() || !reserveModal) return
    try {
      await updateDoc(doc(db, 'gifts', reserveModal), {
        reserved: true,
        reservedBy: guestName.trim()
      })
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
          --bg: #f0f0fa;
          --bg2: #e8e6f8;
          --primary: #6c5ce7;
          --primary-light: #a29bfe;
          --primary-dark: #4834d4;
          --accent: #b8b0f8;
          --text: #2d2b4e;
          --text2: #6b6896;
          --white: #ffffff;
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
        @keyframes starFloat {
          0% { transform: translateY(0) rotate(0deg); opacity:0.7; }
          100% { transform: translateY(-100vh) rotate(360deg); opacity:0; }
        }
        .fadeUp { animation: fadeUp 0.6s ease forwards; }
        .shake { animation: shake 0.4s ease; }
        .float { animation: float 3s ease-in-out infinite; }

        .btn {
          border: none; cursor: pointer; font-family: Nunito, sans-serif;
          font-weight: 700; transition: all 0.2s; letter-spacing: 0.3px;
        }
        .btn-primary {
          background: linear-gradient(135deg, var(--primary), var(--primary-dark));
          color: white; padding: 14px 36px; border-radius: 50px; font-size: 16px;
          box-shadow: 0 6px 20px rgba(108,92,231,0.35);
        }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(108,92,231,0.45); }
        .btn-outline {
          background: transparent; color: var(--primary);
          border: 2px solid var(--primary-light); padding: 12px 32px;
          border-radius: 50px; font-size: 15px;
        }
        .btn-outline:hover { background: var(--bg2); }
        .btn-ghost {
          background: none; color: var(--text2); padding: 8px 16px;
          border-radius: 20px; font-size: 14px; border: none;
        }
        .btn-ghost:hover { color: var(--primary); background: var(--bg2); }

        .input {
          width: 100%; padding: 13px 18px; border: 2px solid #dddaf5;
          border-radius: 14px; font-family: Nunito, sans-serif; font-size: 15px;
          color: var(--text); background: white; outline: none; transition: border-color 0.2s;
        }
        .input:focus { border-color: var(--primary-light); }
        .input.error { border-color: #e17055; animation: shake 0.4s ease; }

        .card {
          background: var(--card); border-radius: 20px;
          box-shadow: var(--shadow); backdrop-filter: blur(8px);
          border: 1px solid rgba(162,155,254,0.2);
        }
        .gift-card {
          background: white; border-radius: 18px; padding: 18px 20px;
          box-shadow: 0 2px 16px rgba(108,92,231,0.08);
          border: 1.5px solid rgba(162,155,254,0.15);
          transition: all 0.25s; cursor: pointer;
          animation: fadeUp 0.4s ease forwards;
        }
        .gift-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); border-color: var(--primary-light); }
        .tag {
          display: inline-block; padding: 3px 11px; border-radius: 20px;
          font-size: 11px; font-weight: 700; background: var(--bg2);
          color: var(--primary); letter-spacing: 0.4px;
        }
        .filter-btn {
          padding: 7px 16px; border-radius: 20px; cursor: pointer;
          font-family: Nunito, sans-serif; font-size: 13px; font-weight: 700;
          border: 1.5px solid #dddaf5; background: white; color: var(--text2);
          transition: all 0.2s;
        }
        .filter-btn.active { border-color: var(--primary); background: var(--bg2); color: var(--primary); }
        .emoji-btn {
          width: 38px; height: 38px; border-radius: 10px;
          border: 2px solid transparent; cursor: pointer; font-size: 18px;
          background: var(--bg); transition: all 0.15s;
        }
        .emoji-btn:hover, .emoji-btn.sel { border-color: var(--primary); background: var(--bg2); }
        .modal-overlay {
          position: fixed; inset: 0; background: rgba(45,43,78,0.45);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000; backdrop-filter: blur(6px);
        }
        .modal { background: white; border-radius: 28px; padding: 36px; max-width: 420px; width: 92%; animation: fadeUp 0.3s ease; }
        .notif {
          position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%);
          background: var(--text); color: white; padding: 14px 28px;
          border-radius: 50px; font-size: 14px; font-weight: 600;
          z-index: 2000; animation: slideDown 0.3s ease;
          box-shadow: 0 8px 30px rgba(45,43,78,0.25); white-space: nowrap;
        }
        .stat-card {
          background: white; border-radius: 16px; padding: 16px 12px;
          text-align: center; box-shadow: 0 2px 14px rgba(108,92,231,0.08);
          border: 1px solid rgba(162,155,254,0.2);
        }
        /* Floating orbs background */
        .orb {
          position: absolute; border-radius: 50%;
          filter: blur(60px); pointer-events: none; opacity: 0.35;
        }
      `}</style>

      {/* NOTIFICATION */}
      {notif && <div className="notif">{notif}</div>}

      {/* ════════════ HOME ════════════ */}
      {view === 'home' && (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', overflow: 'hidden' }}>
          {/* Background orbs */}
          <div className="orb" style={{ width: 400, height: 400, background: '#a29bfe', top: '-100px', right: '-100px' }} />
          <div className="orb" style={{ width: 300, height: 300, background: '#6c5ce7', bottom: '-80px', left: '-80px' }} />
          <div className="orb" style={{ width: 200, height: 200, background: '#b8b0f8', top: '40%', left: '10%' }} />

          <div style={{ textAlign: 'center', maxWidth: 520, position: 'relative', zIndex: 1 }}>
            <div className="float" style={{ fontSize: 64, marginBottom: 20 }}>💍</div>

            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 15, letterSpacing: 4, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: 12, fontWeight: 300 }}>
              Mariage de
            </p>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(44px, 8vw, 68px)', color: 'var(--text)', lineHeight: 1.1, marginBottom: 6 }}>
              Meryem
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 6 }}>
              <div style={{ height: 1, width: 60, background: 'var(--primary-light)' }} />
              <span style={{ color: 'var(--primary-light)', fontSize: 22 }}>✦</span>
              <div style={{ height: 1, width: 60, background: 'var(--primary-light)' }} />
            </div>
            <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(44px, 8vw, 68px)', color: 'var(--primary)', fontStyle: 'italic', lineHeight: 1.1, marginBottom: 32 }}>
              Hamza
            </h1>

            <p style={{ color: 'var(--text2)', fontSize: 16, lineHeight: 1.7, marginBottom: 44, fontWeight: 300 }}>
              Aidez-nous à démarrer notre vie ensemble en choisissant un cadeau dans notre liste. Chaque cadeau réservé disparaît automatiquement 🎀
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
              <button className="btn btn-primary" style={{ fontSize: 17, padding: '16px 52px', width: '100%', maxWidth: 320 }}
                onClick={() => setView('guests')}>
                🎁 Voir la liste des cadeaux
              </button>
              <button className="btn btn-outline" style={{ width: '100%', maxWidth: 320 }}
                onClick={() => setShowCodeModal(true)}>
                💑 Espace mariés
              </button>
            </div>

            <div style={{ marginTop: 52, display: 'flex', gap: 40, justifyContent: 'center', flexWrap: 'wrap' }}>
              {[['💜', 'Gratuit', 'Sans inscription'], ['🔐', 'Sécurisé', 'Code privé'], ['✨', 'Malin', 'Zéro doublon']].map(([icon, t, s]) => (
                <div key={t} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 26, marginBottom: 6 }}>{icon}</div>
                  <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13 }}>{t}</div>
                  <div style={{ color: 'var(--text2)', fontSize: 12 }}>{s}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ════════════ CODE MODAL ════════════ */}
      {showCodeModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowCodeModal(false)}>
          <div className="modal">
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ fontSize: 52, marginBottom: 12 }}>🔐</div>
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, color: 'var(--text)', marginBottom: 8 }}>Espace Mariés</h3>
              <p style={{ color: 'var(--text2)', fontSize: 15 }}>Entrez votre code secret pour accéder à la gestion de la liste</p>
            </div>
            <input
              className={`input ${codeError ? 'error' : ''}`}
              type="password"
              placeholder="Code secret..."
              value={codeInput}
              onChange={e => setCodeInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCoupleAccess()}
              style={{ marginBottom: 16, textAlign: 'center', fontSize: 18, letterSpacing: 4 }}
              autoFocus
            />
            {codeError && <p style={{ color: '#e17055', fontSize: 13, textAlign: 'center', marginBottom: 12, fontWeight: 600 }}>Code incorrect, réessayez 🔒</p>}
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-outline" onClick={() => { setShowCodeModal(false); setCodeInput(''); setCodeError(false) }} style={{ flex: 1 }}>Annuler</button>
              <button className="btn btn-primary" onClick={handleCoupleAccess} style={{ flex: 2 }}>Entrer ✦</button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════ COUPLE VIEW ════════════ */}
      {view === 'couple' && (
        <div style={{ maxWidth: 780, margin: '0 auto', padding: '28px 16px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <button className="btn btn-ghost" onClick={() => setView('home')} style={{ padding: '6px 0', marginBottom: 6 }}>← Accueil</button>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, color: 'var(--text)' }}>Gestion de la liste</h2>
              <p style={{ color: 'var(--text2)', fontSize: 14 }}>Meryem & Hamza · Espace privé 🔐</p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
              {showForm ? '✕ Annuler' : '+ Ajouter un cadeau'}
            </button>
          </div>

          {/* Firebase error */}
          {fbError && (
            <div style={{ background: '#fff3f0', border: '1.5px solid #fab1a0', borderRadius: 14, padding: '14px 20px', marginBottom: 20, color: '#c0392b', fontSize: 14 }}>
              ⚠️ <strong>Firebase non configuré.</strong> Ouvrez <code>src/firebase.js</code> et remplacez les valeurs par celles de votre projet Firebase. Consultez le <strong>README.md</strong> pour les instructions.
            </div>
          )}

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
            {[[gifts.length, 'cadeaux total', '🎁'], [reservedCount, 'réservés', '✅'], [`${totalValue}€`, 'valeur totale', '💶']].map(([v, l, icon]) => (
              <div key={l} className="stat-card">
                <div style={{ fontSize: 22 }}>{icon}</div>
                <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, color: 'var(--primary)', fontWeight: 600 }}>{v}</div>
                <div style={{ color: 'var(--text2)', fontSize: 12 }}>{l}</div>
              </div>
            ))}
          </div>

          {/* Add form */}
          {showForm && (
            <div className="card" style={{ padding: 24, marginBottom: 24, animation: 'slideDown 0.3s ease' }}>
              <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: 'var(--text)', marginBottom: 18 }}>Nouveau cadeau</h3>
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <input className="input" placeholder="Nom du cadeau *" value={newGift.name} onChange={e => setNewGift({ ...newGift, name: e.target.value })} />
                  <input className="input" placeholder="Prix (€)" type="number" value={newGift.price} onChange={e => setNewGift({ ...newGift, price: e.target.value })} />
                </div>
                <input className="input" placeholder="Description (optionnel)" value={newGift.description} onChange={e => setNewGift({ ...newGift, description: e.target.value })} />
                <select className="input" value={newGift.category} onChange={e => setNewGift({ ...newGift, category: e.target.value })}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '10px 12px', background: 'var(--bg)', borderRadius: 12 }}>
                  {EMOJIS.map(e => (
                    <button key={e} className={`emoji-btn ${newGift.emoji === e ? 'sel' : ''}`} onClick={() => setNewGift({ ...newGift, emoji: e })}>{e}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="btn btn-primary" onClick={addGift}>Ajouter</button>
                  {gifts.length === 0 && <button className="btn btn-outline" onClick={seedDefaults}>Ajouter des exemples</button>}
                </div>
              </div>
            </div>
          )}

          {/* Seed button if empty */}
          {gifts.length === 0 && !showForm && !fbError && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
