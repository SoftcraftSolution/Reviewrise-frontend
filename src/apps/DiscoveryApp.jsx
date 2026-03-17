import { useState, useEffect, useRef } from 'react'

const BASE = import.meta.env.VITE_API_URL || 'https://reviewrise-production-2347.up.railway.app'

const apiCall = async (method, path, body, token) => {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type':'application/json', ...(token ? { Authorization:`Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const d = await r.json().catch(()=>({}))
  if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`)
  return d
}

// ─────────────────────────────────────────────────────────────────
//  Banner Carousel — auto-advances every 3 seconds
// ─────────────────────────────────────────────────────────────────
function BannerCarousel({ banners, brands, onBrandClick }) {
  const [idx, setIdx]   = useState(0)
  const [anim, setAnim] = useState(true)
  const timerRef        = useRef(null)

  const go = (next) => {
    setAnim(false)
    setTimeout(() => { setIdx(next); setAnim(true) }, 80)
  }

  useEffect(() => {
    if (banners.length <= 1) return
    timerRef.current = setInterval(() => go((idx + 1) % banners.length), 3000)
    return () => clearInterval(timerRef.current)
  }, [banners.length, idx])

  if (!banners.length) return null
  const b = banners[idx]

  const GRADS = [
    'linear-gradient(135deg,#1a0a00,#4a2800)',
    'linear-gradient(135deg,#001220,#003060)',
    'linear-gradient(135deg,#0d001a,#300060)',
    'linear-gradient(135deg,#001a0a,#004a20)',
    'linear-gradient(135deg,#1a000a,#500020)',
  ]

  const handleClick = () => {
    const br = brands.find(x => x.id === b.brand_id)
    if (br) onBrandClick(br)
  }

  return (
    <div style={{marginBottom:18,userSelect:'none'}}>
      <div onClick={handleClick} style={{
        background: b.image_url
          ? `linear-gradient(to top, rgba(0,0,0,.75) 0%, rgba(0,0,0,.2) 60%), url(${b.image_url}) center/cover`
          : GRADS[idx % GRADS.length],
        borderRadius:20,
        minHeight:140,
        padding:'20px 20px 18px',
        cursor:'pointer',
        border:'1px solid rgba(255,255,255,.07)',
        display:'flex',flexDirection:'column',justifyContent:'flex-end',
        position:'relative',overflow:'hidden',
        transition:'transform .15s',
        opacity: anim ? 1 : 0,
        transform: anim ? 'none' : 'translateY(6px)',
        transitionProperty:'opacity,transform',
      }}>
        {/* Shimmer line */}
        <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,transparent,rgba(233,184,74,.6),transparent)'}}/>

        <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'rgba(233,184,74,.18)',border:'1px solid rgba(233,184,74,.35)',borderRadius:100,padding:'3px 10px',width:'fit-content',marginBottom:8}}>
          <span style={{fontSize:10,fontWeight:700,color:'#E9B84A',textTransform:'uppercase',letterSpacing:'.08em'}}>✦ Featured Offer</span>
        </div>
        <div style={{fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:900,color:'white',marginBottom:4,lineHeight:1.2}}>{b.title}</div>
        <div style={{fontSize:12,color:'rgba(255,255,255,.5)',display:'flex',alignItems:'center',gap:5,flexWrap:'wrap'}}>
          <span>{b.brand_emoji}</span>
          <span>{b.brand_name}</span>
          {b.subtitle && <span style={{color:'rgba(255,255,255,.7)'}}>· {b.subtitle}</span>}
          <span style={{color:'#E9B84A',fontWeight:600}}>· Tap to earn reward →</span>
        </div>
      </div>

      {/* Dots */}
      {banners.length > 1 && (
        <div style={{display:'flex',justifyContent:'center',gap:5,marginTop:10}}>
          {banners.map((_,i) => (
            <div key={i}
              onClick={()=>{clearInterval(timerRef.current);go(i)}}
              style={{
                width: i===idx ? 20 : 6, height:6,
                borderRadius:100,
                background: i===idx ? '#E9B84A' : 'rgba(255,255,255,.15)',
                cursor:'pointer',
                transition:'all .3s',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
//  Profile Page
// ─────────────────────────────────────────────────────────────────
//  Profile Page (with Points Redemption)
// ─────────────────────────────────────────────────────────────────
function ProfilePage({ token, onLogout }) {
  const [profile,  setProfile]  = useState(null)
  const [coupons,  setCoupons]  = useState([])
  const [editing,  setEditing]  = useState(false)
  const [form,     setForm]     = useState({ phone:'', address:'', dob:'' })
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [redeeming,setRedeeming]= useState(null)
  const [redeemOk, setRedeemOk] = useState(null)

  const TIERS = [
    { points:200,  discount:'₹20 OFF',  label:'Bronze', color:'#CD7F32', min:200  },
    { points:500,  discount:'₹75 OFF',  label:'Silver', color:'#C0C0C0', min:500  },
    { points:1000, discount:'₹200 OFF', label:'Gold',   color:'#E9B84A', min:1000 },
  ]

  const loadProfile = () => {
    apiCall('GET', '/api/profile', null, token).then(p => {
      setProfile(p)
      setForm({ phone: p.phone||'', address: p.address||'', dob: p.dob ? p.dob.split('T')[0] : '' })
    }).catch(console.error)
    apiCall('GET', '/api/coupons/my', null, token).then(setCoupons).catch(()=>{})
  }

  useEffect(() => { if (token) loadProfile() }, [token])

  const save = async () => {
    setSaving(true)
    try {
      const updated = await apiCall('PATCH', '/api/profile', form, token)
      setProfile(p => ({ ...p, ...updated }))
      setSaved(true); setTimeout(()=>setSaved(false), 2500)
      setEditing(false)
    } catch(e) { alert(e.message) }
    setSaving(false)
  }

  const redeem = async (tier) => {
    setRedeeming(tier.points)
    try {
      const r = await apiCall('POST', '/api/points/redeem', { points_to_spend: tier.points }, token)
      setRedeemOk(r.coupon)
      setProfile(p => ({ ...p, points: r.remaining_points }))
      setTimeout(() => setRedeemOk(null), 8000)
      loadProfile()
    } catch(e) { alert(e.message) }
    setRedeeming(null)
  }

  if (!profile) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:60,color:'rgba(237,233,226,.3)',gap:10}}>
      <div style={{width:20,height:20,borderRadius:'50%',border:'2px solid rgba(233,184,74,.3)',borderTopColor:'#E9B84A',animation:'sp 1s linear infinite'}}/>
      Loading profile...
    </div>
  )

  const dobLocked = !!profile.dob
  const pts       = profile.points || 0
  const active    = coupons.filter(c=>c.status==='active').length
  const used      = coupons.filter(c=>c.status==='redeemed').length
  const nextTier  = TIERS.find(t => pts < t.points)

  return (
    <div>
      {/* ── Avatar card ── */}
      <div style={{background:'linear-gradient(135deg,rgba(233,184,74,.05),rgba(66,133,244,.03))',border:'1px solid rgba(255,255,255,.06)',borderRadius:20,padding:20,marginBottom:14,textAlign:'center'}}>
        <div style={{width:64,height:64,borderRadius:'50%',background:'linear-gradient(135deg,#4285F4,#34A853)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,fontWeight:800,color:'white',margin:'0 auto 10px'}}>
          {profile.name?.[0]}
        </div>
        <div style={{fontFamily:"'Fraunces',serif",fontSize:18,fontWeight:900,marginBottom:2}}>{profile.name}</div>
        <div style={{fontSize:12,color:'rgba(237,233,226,.4)',marginBottom:12}}>{profile.email}</div>
        <div style={{display:'flex',background:'#0C1018',borderRadius:12,padding:'10px 0',border:'1px solid rgba(255,255,255,.05)'}}>
          {[
            { val: pts,    lbl:'⭐ Points', color:'#E9B84A' },
            { val: active, lbl:'Active',   color:'#3DD68C' },
            { val: used,   lbl:'Used',     color:'rgba(237,233,226,.4)' },
          ].map((s,i) => (
            <div key={s.lbl} style={{flex:1,textAlign:'center',borderRight:i<2?'1px solid rgba(255,255,255,.05)':'none'}}>
              <div style={{fontWeight:800,fontSize:18,color:s.color}}>{s.val}</div>
              <div style={{fontSize:11,color:'rgba(237,233,226,.4)'}}>{s.lbl}</div>
            </div>
          ))}
        </div>
        {nextTier && pts > 0 && (
          <div style={{marginTop:10}}>
            <div style={{background:'rgba(255,255,255,.04)',borderRadius:100,height:5,overflow:'hidden'}}>
              <div style={{height:'100%',borderRadius:100,background:'linear-gradient(90deg,#b87a20,#E9B84A)',width:`${Math.min(100,(pts/nextTier.points)*100)}%`,transition:'width .6s'}}/>
            </div>
            <div style={{fontSize:10,color:'rgba(237,233,226,.35)',marginTop:4}}>{pts}/{nextTier.points} pts → {nextTier.discount}</div>
          </div>
        )}
      </div>

      {/* ── Points Redemption ── */}
      <div style={{background:'#0C1018',border:'1px solid rgba(255,255,255,.06)',borderRadius:16,padding:16,marginBottom:14}}>
        <div style={{fontWeight:800,fontSize:14,marginBottom:4}}>⭐ Redeem Points</div>
        <div style={{fontSize:12,color:'rgba(237,233,226,.4)',marginBottom:14}}>
          You have <strong style={{color:'#E9B84A'}}>{pts} points</strong>
          {' '}· Earn 50 pts per review · 25 bonus for 5★
        </div>

        {redeemOk && (
          <div style={{background:'rgba(61,214,140,.08)',border:'2px dashed rgba(61,214,140,.3)',borderRadius:12,padding:14,textAlign:'center',marginBottom:12,animation:'pop .5s both'}}>
            <div style={{fontSize:22,marginBottom:4}}>🎉</div>
            <div style={{fontWeight:700,marginBottom:4}}>Redeemed!</div>
            <div style={{fontFamily:'monospace',fontSize:16,color:'#E9B84A',letterSpacing:'.1em',marginBottom:2}}>{redeemOk.code}</div>
            <div style={{fontSize:12,color:'rgba(237,233,226,.5)'}}>{redeemOk.discount} · valid 30 days</div>
          </div>
        )}

        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {TIERS.map(tier => {
            const canRedeem = pts >= tier.points
            return (
              <div key={tier.points} style={{
                background: canRedeem ? 'rgba(233,184,74,.05)' : 'rgba(255,255,255,.02)',
                border:`1px solid ${canRedeem?'rgba(233,184,74,.2)':'rgba(255,255,255,.05)'}`,
                borderRadius:12,padding:'12px 14px',display:'flex',alignItems:'center',gap:12,
                opacity: canRedeem ? 1 : 0.5,
              }}>
                <div style={{width:36,height:36,borderRadius:'50%',background:`${tier.color}22`,border:`2px solid ${tier.color}44`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>
                  {tier.label==='Bronze'?'🥉':tier.label==='Silver'?'🥈':'🥇'}
                </div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:13,color:tier.color}}>{tier.label} · {tier.discount}</div>
                  <div style={{fontSize:11,color:'rgba(237,233,226,.4)'}}>Spend {tier.points} pts · Min ₹{tier.min}</div>
                </div>
                <button disabled={!canRedeem || redeeming===tier.points}
                  onClick={()=>redeem(tier)}
                  style={{
                    background: canRedeem ? `linear-gradient(135deg,${tier.color}88,${tier.color})` : 'rgba(255,255,255,.05)',
                    border:'none',borderRadius:8,padding:'7px 14px',
                    color: canRedeem ? '#000' : 'rgba(237,233,226,.3)',
                    fontSize:11,fontWeight:700,cursor:canRedeem?'pointer':'not-allowed',
                    fontFamily:'inherit',whiteSpace:'nowrap',
                  }}>
                  {redeeming===tier.points ? '...' : canRedeem ? 'Redeem' : `Need ${tier.points-pts} more`}
                </button>
              </div>
            )
          })}
        </div>

        <div style={{marginTop:12,fontSize:11,color:'rgba(237,233,226,.25)',lineHeight:1.8}}>
          How to earn: <span style={{color:'rgba(237,233,226,.5)'}}>+50 per review · +25 bonus 5★ · +20 watch 3 ads · +100 first review</span>
        </div>
      </div>

      {/* ── Profile details ── */}
      <div style={{background:'#0C1018',border:'1px solid rgba(255,255,255,.06)',borderRadius:16,padding:16,marginBottom:14}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
          <div style={{fontWeight:800,fontSize:14}}>👤 My Details</div>
          <button onClick={()=>setEditing(!editing)}
            style={{fontSize:11,background:editing?'rgba(233,184,74,.1)':'#161D28',border:'1px solid rgba(255,255,255,.08)',borderRadius:8,padding:'5px 12px',color:editing?'#E9B84A':'rgba(237,233,226,.6)',cursor:'pointer',fontFamily:'inherit',fontWeight:600}}>
            {editing ? '✕ Cancel' : '✏️ Edit'}
          </button>
        </div>

        {/* Email — always locked */}
        <div style={{marginBottom:10}}>
          <div style={{fontSize:11,color:'rgba(237,233,226,.4)',marginBottom:4}}>📧 Email</div>
          <div style={{fontSize:13,background:'#161D28',borderRadius:8,padding:'9px 12px',border:'1px solid rgba(255,255,255,.05)',color:'rgba(237,233,226,.6)'}}>{profile.email}</div>
        </div>

        {/* Phone */}
        <div style={{marginBottom:10}}>
          <div style={{fontSize:11,color:'rgba(237,233,226,.4)',marginBottom:4}}>📱 Phone</div>
          {editing ? (
            <input value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))}
              placeholder="+91 98765 43210"
              style={{width:'100%',background:'#161D28',border:'1px solid rgba(233,184,74,.3)',borderRadius:8,padding:'9px 12px',color:'#EDE9E2',fontFamily:'inherit',fontSize:13,outline:'none'}}/>
          ) : (
            <div style={{fontSize:13,background:'#161D28',borderRadius:8,padding:'9px 12px',border:'1px solid rgba(255,255,255,.05)',color:form.phone?'#EDE9E2':'rgba(237,233,226,.25)',fontStyle:form.phone?'normal':'italic'}}>
              {form.phone || 'Not set'}
            </div>
          )}
        </div>

        {/* Address */}
        <div style={{marginBottom:10}}>
          <div style={{fontSize:11,color:'rgba(237,233,226,.4)',marginBottom:4}}>📍 Address</div>
          {editing ? (
            <input value={form.address} onChange={e=>setForm(p=>({...p,address:e.target.value}))}
              placeholder="Your address"
              style={{width:'100%',background:'#161D28',border:'1px solid rgba(233,184,74,.3)',borderRadius:8,padding:'9px 12px',color:'#EDE9E2',fontFamily:'inherit',fontSize:13,outline:'none'}}/>
          ) : (
            <div style={{fontSize:13,background:'#161D28',borderRadius:8,padding:'9px 12px',border:'1px solid rgba(255,255,255,.05)',color:form.address?'#EDE9E2':'rgba(237,233,226,.25)',fontStyle:form.address?'normal':'italic'}}>
              {form.address || 'Not set'}
            </div>
          )}
        </div>

        {/* DOB — locked once set */}
        <div style={{marginBottom:editing?14:0}}>
          <div style={{fontSize:11,color:'rgba(237,233,226,.4)',marginBottom:4}}>🎂 Date of Birth</div>
          {dobLocked ? (
            <div style={{background:'#161D28',borderRadius:8,padding:'9px 12px',border:'1px solid rgba(255,255,255,.05)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontSize:13}}>{new Date(profile.dob).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</span>
              <span style={{fontSize:10,background:'rgba(233,184,74,.1)',border:'1px solid rgba(233,184,74,.2)',borderRadius:100,padding:'2px 8px',color:'#E9B84A'}}>🔒 Locked</span>
            </div>
          ) : editing ? (
            <div>
              <input type="date" value={form.dob} onChange={e=>setForm(p=>({...p,dob:e.target.value}))}
                style={{width:'100%',background:'#161D28',border:'1px solid rgba(233,184,74,.3)',borderRadius:8,padding:'9px 12px',color:'#EDE9E2',fontFamily:'inherit',fontSize:13,outline:'none'}}/>
              <div style={{fontSize:11,color:'#E9B84A',marginTop:5,display:'flex',alignItems:'center',gap:4}}>
                🎁 Add your birthday to get special birthday discounts!
                <span style={{color:'rgba(237,233,226,.35)'}}>· Cannot be changed once saved</span>
              </div>
            </div>
          ) : (
            <div style={{background:'#161D28',borderRadius:8,padding:'9px 12px',border:'1px solid rgba(255,255,255,.05)',display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontSize:13,color:'rgba(237,233,226,.25)',fontStyle:'italic'}}>Not set</span>
              <span style={{fontSize:11,color:'#E9B84A'}}>🎂 Add to get birthday discounts!</span>
            </div>
          )}
        </div>

        {editing && (
          <button disabled={saving} onClick={save}
            style={{width:'100%',padding:11,borderRadius:10,background:'linear-gradient(135deg,#b87a20,#E9B84A)',color:'#07090E',border:'none',fontFamily:'inherit',fontSize:13,fontWeight:700,cursor:saving?'not-allowed':'pointer',opacity:saving?.7:1}}>
            {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Changes'}
          </button>
        )}
        {saved && !editing && (
          <div style={{textAlign:'center',fontSize:12,color:'#3DD68C',marginTop:8}}>✓ Profile updated!</div>
        )}
      </div>

      {/* ── Coupons ── */}
      <div style={{fontWeight:800,fontSize:14,marginBottom:10,display:'flex',alignItems:'center',gap:8}}>
        🎟️ My Rewards
        <span style={{fontSize:12,fontWeight:400,color:'rgba(237,233,226,.4)'}}>({coupons.length})</span>
      </div>
      {coupons.length === 0 ? (
        <div style={{background:'#0C1018',border:'1px solid rgba(255,255,255,.05)',borderRadius:16,padding:'30px 20px',textAlign:'center'}}>
          <div style={{fontSize:36,marginBottom:10}}>🎟️</div>
          <div style={{fontSize:13,color:'rgba(237,233,226,.4)',lineHeight:1.7}}>
            Scan a QR code at any brand, write a Google review, and earn your first reward!
          </div>
        </div>
      ) : (
        coupons.map(c => (
          <div key={c.id} style={{background:'#0C1018',border:'1px solid rgba(255,255,255,.05)',borderRadius:14,padding:14,marginBottom:8}}>
            <div style={{display:'flex',gap:10,alignItems:'center',marginBottom:10}}>
              <span style={{fontSize:20}}>{c.emoji||'🏪'}</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:13}}>{c.brand_name}</div>
                <div style={{fontSize:11,color:'rgba(237,233,226,.4)'}}>via verified review</div>
              </div>
              <span style={{
                fontSize:10,fontWeight:700,padding:'2px 9px',borderRadius:100,
                background:c.status==='active'?'rgba(61,214,140,.09)':c.status==='redeemed'?'rgba(255,255,255,.06)':'rgba(240,119,119,.09)',
                color:c.status==='active'?'#3DD68C':c.status==='redeemed'?'rgba(237,233,226,.4)':'#F07777',
                border:`1px solid ${c.status==='active'?'rgba(61,214,140,.2)':c.status==='redeemed'?'rgba(255,255,255,.08)':'rgba(240,119,119,.2)'}`,
              }}>
                {c.status==='active'?'● Active':c.status==='redeemed'?'Used':'Expired'}
              </span>
            </div>
            <div style={{background:'rgba(233,184,74,.06)',border:'1px dashed rgba(233,184,74,.2)',borderRadius:10,padding:'10px 12px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div>
                <div style={{fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:900,color:'#E9B84A',lineHeight:1}}>{c.discount}</div>
                <div style={{fontSize:11,color:'rgba(237,233,226,.3)',marginTop:2}}>Min ₹{c.min_order}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontFamily:'monospace',fontSize:14,fontWeight:700,letterSpacing:'.08em',color:c.status==='active'?'#E9B84A':'rgba(237,233,226,.35)'}}>{c.code}</div>
                {c.status==='active' && (
                  <button onClick={()=>navigator.clipboard?.writeText(c.code)}
                    style={{marginTop:4,background:'none',border:'1px solid rgba(233,184,74,.2)',borderRadius:6,padding:'2px 10px',color:'#E9B84A',fontSize:10,cursor:'pointer',fontFamily:'inherit',fontWeight:700}}>
                    Copy
                  </button>
                )}
              </div>
            </div>
            <div style={{fontSize:11,color:'rgba(237,233,226,.25)',marginTop:6}}>
              Expires: {new Date(c.expires_at).toLocaleDateString('en-IN')}
            </div>
          </div>
        ))
      )}

      {/* ── My Feedback ── */}
      {profile.feedback?.length > 0 && (
        <>
          <div style={{fontWeight:800,fontSize:14,marginBottom:10,marginTop:18}}>💬 My Feedback</div>
          {profile.feedback.map(f => (
            <div key={f.id} style={{background:'#0C1018',border:'1px solid rgba(255,255,255,.05)',borderRadius:12,padding:12,marginBottom:8}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                <span style={{color:'#FBBC04'}}>{'★'.repeat(f.stars)}{'☆'.repeat(5-f.stars)}</span>
                <span style={{fontSize:11,color:'rgba(237,233,226,.3)'}}>{new Date(f.created_at).toLocaleDateString('en-IN')}</span>
              </div>
              {f.chips?.length > 0 && (
                <div style={{fontSize:11,color:'rgba(237,233,226,.5)',marginBottom:4}}>{f.chips.join(' · ')}</div>
              )}
              {f.message && <div style={{fontSize:12,color:'rgba(237,233,226,.6)',lineHeight:1.6}}>{f.message}</div>}
            </div>
          ))}
        </>
      )}

      <button onClick={onLogout}
        style={{width:'100%',marginTop:16,padding:'10px',background:'none',border:'1px solid rgba(240,119,119,.2)',borderRadius:10,color:'#F07777',fontSize:12,cursor:'pointer',fontFamily:'inherit',fontWeight:600}}>
        ↩ Logout
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
//  Main App
// ─────────────────────────────────────────────────────────────────
export default function DiscoveryApp() {
  const [brands,    setBrands]   = useState([])
  const [banners,   setBanners]  = useState([])
  const [ads,       setAds]      = useState([])
  const [loading,   setLoading]  = useState(true)
  const [search,    setSearch]   = useState('')
  const [page,      setPage]     = useState('home')
  const [selected,  setSelected] = useState(null)
  const [user,      setUser]     = useState(null)
  const [token,     setToken]    = useState(null)

  // Ad-watch state — brand grouped
  const [watchedSet, setWatchedSet] = useState(new Set())  // set of watched ad IDs
  const [watching,   setWatching]   = useState(null)
  const [watchPct,   setWatchPct]   = useState(0)
  const [adRewards,  setAdRewards]  = useState([])          // array of earned coupons
  const watchRef = useRef(null)

  // ── Init ─────────────────────────────────────────────────────
  useEffect(() => {
    const t = localStorage.getItem('rr_token')
    const u = localStorage.getItem('rr_user')
    if (t) setToken(t)
    if (u) try { setUser(JSON.parse(u)) } catch {}

    Promise.all([
      apiCall('GET', '/api/brands'),
      apiCall('GET', '/api/banners').catch(()=>[]),
      apiCall('GET', '/api/ads').catch(()=>[]),
    ]).then(([b, bn, a]) => {
      setBrands(b)
      setBanners((bn || []).filter(x => x.active))
      setAds((a || []).filter(x => x.active).slice(0, 3))
    }).catch(console.error).finally(() => setLoading(false))
  }, [])

  const goToBrand = (br) => { setSelected(br); setPage('brand') }

  // ── Watch ad flow ─────────────────────────────────────────────
  const isVideo = (ad) => !!ad?.video_url
  const ytId = (url) => url?.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&?\s]{11})/)?.[1]

  const watchAd = (ad) => {
    if (watching || watchedSet.has(ad.id)) return
    setWatching(ad); setWatchPct(0)

    // For image ads: 3.5 second progress bar
    // For video ads: show player, complete on user interaction after 5s
    if (!isVideo(ad)) {
      watchRef.current = setInterval(() => {
        setWatchPct(p => { if (p >= 100) { clearInterval(watchRef.current); return 100 } return p + 2.8 })
      }, 100)
    }

    const complete = async () => {
      clearInterval(watchRef.current); setWatchPct(100)
      await new Promise(r => setTimeout(r, 400))
      const newSet = new Set([...watchedSet, ad.id])
      setWatchedSet(newSet); setWatching(null); setWatchPct(0)

      try {
        const res = await apiCall('POST', `/api/ads/${ad.id}/view`, {}, token)
        if (res.reward) {
          setAdRewards(prev => [...prev, res.reward])
        }
      } catch(e) { console.error('ad view:', e.message) }
    }

    if (!isVideo(ad)) {
      setTimeout(complete, 3600)
    } else {
      // Video: auto-complete after 8 seconds (user watches YouTube)
      setTimeout(complete, 8000)
    }
  }

  const dismissReward = (code) => setAdRewards(prev => prev.filter(r => r.code !== code))

  // Group ads by brand
  const adsByBrand = ads.reduce((acc, a) => {
    const key = a.brand_id
    if (!acc[key]) acc[key] = { brand_id: key, brand_name: a.brand_name, brand_emoji: a.brand_emoji, ads: [] }
    acc[key].ads.push(a)
    return acc
  }, {})

  const logout = () => { localStorage.clear(); setUser(null); setToken(null) }

  const filtered = brands.filter(b =>
    !search ||
    b.name?.toLowerCase().includes(search.toLowerCase()) ||
    b.category?.toLowerCase().includes(search.toLowerCase())
  )

  const S = `
    @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,700;12..96,800&family=Fraunces:opsz,wght@9..144,700;9..144,900&display=swap');
    *{margin:0;padding:0;box-sizing:border-box}
    :root{--gold:#E9B84A;--green:#3DD68C;--red:#F07777;--text:#EDE9E2;--muted:rgba(237,233,226,.38);--muted2:rgba(237,233,226,.62);}
    body{background:#07090E;color:var(--text);font-family:'Bricolage Grotesque',sans-serif;}
    @keyframes fi{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
    @keyframes sp{to{transform:rotate(360deg)}}
    @keyframes pop{0%{transform:scale(.5);opacity:0}70%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}
    @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(233,184,74,.3)}50%{box-shadow:0 0 0 8px rgba(233,184,74,0)}}
    .fade{animation:fi .3s ease both}
    .page{min-height:100vh;background:#07090E;padding-bottom:80px}
    .top{padding:10px 16px;background:rgba(12,16,24,.96);backdrop-filter:blur(16px);border-bottom:1px solid rgba(255,255,255,.05);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:20;gap:10px}
    .srch{flex:1;display:flex;align-items:center;gap:8px;background:#161D28;border:1px solid rgba(255,255,255,.06);border-radius:100px;padding:8px 14px}
    .srch input{background:none;border:none;outline:none;color:var(--text);font-family:'Bricolage Grotesque',sans-serif;font-size:13px;width:100%}
    .srch input::placeholder{color:var(--muted)}
    .cont{padding:14px 14px 0}
    .sec-hd{font-size:13px;font-weight:800;margin-bottom:10px;margin-top:18px;display:flex;align-items:center;gap:6px;letter-spacing:.01em}
    .grid2{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}
    .bcard{background:#0C1018;border:1px solid rgba(255,255,255,.06);border-radius:16px;padding:14px;cursor:pointer;transition:all .2s;position:relative;overflow:hidden}
    .bcard:hover{border-color:rgba(233,184,74,.3);transform:translateY(-2px);box-shadow:0 8px 28px rgba(0,0,0,.5)}
    .bnav{position:fixed;bottom:0;left:0;right:0;background:rgba(12,16,24,.97);backdrop-filter:blur(20px);border-top:1px solid rgba(255,255,255,.06);display:flex;z-index:30;padding-bottom:env(safe-area-inset-bottom)}
    .nbtn{flex:1;padding:11px 8px 8px;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;border:none;background:none;font-family:'Bricolage Grotesque',sans-serif;position:relative;transition:background .15s}
    .nbtn.on::after{content:'';position:absolute;top:0;left:25%;right:25%;height:2px;background:var(--gold);border-radius:0 0 4px 4px}
    .nic{font-size:20px;line-height:1.1}
    .nlbl{font-size:9px;font-weight:700;color:var(--muted2);text-transform:uppercase;letter-spacing:.04em;transition:color .15s}
    .nbtn.on .nlbl{color:var(--gold)}
    .goldbtn{width:100%;padding:13px;border-radius:12px;background:linear-gradient(135deg,#b87a20,#E9B84A);color:#07090E;border:none;font-family:'Bricolage Grotesque',sans-serif;font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:all .2s}
    .goldbtn:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(233,184,74,.3)}
    .pbg{background:rgba(255,255,255,.06);border-radius:100px;height:5px;overflow:hidden}
    .pbar{height:100%;background:linear-gradient(90deg,#b87a20,#E9B84A);border-radius:100px;transition:width .1s linear}
    .ad-card{background:#0C1018;border:1px solid rgba(255,255,255,.06);border-radius:14px;overflow:hidden;cursor:pointer;transition:all .2s}
    .ad-card:hover{border-color:rgba(233,184,74,.25);transform:translateY(-1px)}
    .ad-card.done{opacity:.55;cursor:default;pointer-events:none}
  `

  if (loading) return (
    <><style>{S}</style>
    <div className="page" style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',flexDirection:'column',gap:12,color:'rgba(237,233,226,.4)'}}>
      <div style={{fontSize:40,animation:'pulse 2s infinite'}}>⭐</div>
      <div style={{fontSize:13}}>Loading ReviewRise...</div>
    </div></>
  )

  return (<><style>{S}</style>
    <div className="page">

      {/* ── TOP BAR ── */}
      <div className="top">
        <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
          <div style={{width:30,height:30,borderRadius:9,background:'linear-gradient(135deg,#b87a20,#E9B84A)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>⭐</div>
          <span style={{fontSize:14,fontWeight:800}}>ReviewRise</span>
        </div>
        <div className="srch">
          <span style={{color:'var(--muted)',fontSize:13}}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search restaurants..."/>
          {search && <span onClick={()=>setSearch('')} style={{color:'var(--muted)',cursor:'pointer',fontSize:14}}>✕</span>}
        </div>
        {user ? (
          <div onClick={()=>setPage('profile')} style={{width:34,height:34,borderRadius:'50%',background:'linear-gradient(135deg,#4285F4,#34A853)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:800,color:'white',flexShrink:0,cursor:'pointer',border:'2px solid rgba(233,184,74,.4)',boxShadow:'0 0 0 3px rgba(233,184,74,.1)'}}>
            {user.name?.[0]}
          </div>
        ) : (
          <button onClick={()=>window.location.href='/review'}
            style={{background:'rgba(233,184,74,.1)',border:'1px solid rgba(233,184,74,.25)',borderRadius:100,padding:'5px 12px',color:'var(--gold)',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',flexShrink:0,whiteSpace:'nowrap'}}>
            Scan QR
          </button>
        )}
      </div>

      {/* ══ HOME ════════════════════════════════════════════════ */}
      {page==='home' && (
        <div className="cont fade">

          {/* HERO if no banners */}
          {banners.length === 0 && (
            <div style={{background:'linear-gradient(135deg,rgba(233,184,74,.07),rgba(233,184,74,.02))',border:'1px solid rgba(233,184,74,.1)',borderRadius:20,padding:20,marginBottom:18,textAlign:'center'}}>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:22,fontWeight:900,lineHeight:1.2,marginBottom:6}}>
                Scan · Review · <span style={{color:'var(--gold)'}}>Earn Rewards</span>
              </div>
              <div style={{fontSize:13,color:'var(--muted)',lineHeight:1.7,marginBottom:14}}>
                Give genuine Google reviews at local restaurants and earn instant discount rewards.
              </div>
              <button className="goldbtn" style={{maxWidth:200,margin:'0 auto'}} onClick={()=>setPage('brands')}>
                Explore Brands →
              </button>
            </div>
          )}

          {/* BANNER CAROUSEL */}
          {banners.length > 0 && (
            <>
              <div className="sec-hd">🔥 Featured Offers</div>
              <BannerCarousel banners={banners} brands={brands} onBrandClick={goToBrand}/>
            </>
          )}

          {/* BRANDS GRID */}
          <div className="sec-hd">
            🏪 {search ? `"${search}"` : 'All Restaurants'}
            <span style={{fontSize:12,fontWeight:400,color:'var(--muted)'}}>({filtered.length})</span>
          </div>
          <div className="grid2">
            {filtered.map(b => (
              <div key={b.id} className="bcard" onClick={()=>goToBrand(b)}>
                <div style={{fontSize:30,marginBottom:8}}>{b.emoji}</div>
                <div style={{fontWeight:700,fontSize:13,marginBottom:2,lineHeight:1.3}}>{b.name}</div>
                <div style={{fontSize:11,color:'var(--muted)',marginBottom:6}}>{b.category}</div>
                {b.google_rating > 0 && (
                  <div style={{fontSize:12,color:'var(--gold)',fontWeight:600,marginBottom:6}}>★ {b.google_rating} · {b.total_reviews} reviews</div>
                )}
                <div style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:11,background:'rgba(233,184,74,.1)',border:'1px solid rgba(233,184,74,.2)',borderRadius:100,padding:'3px 10px',color:'var(--gold)',fontWeight:600}}>
                  🎁 {b.reward_offer}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{gridColumn:'span 2',padding:40,textAlign:'center',color:'var(--muted)'}}>
                {search ? `No restaurants found for "${search}"` : 'No brands yet. Check back soon!'}
              </div>
            )}
          </div>

          {/* ADS — Brand-grouped Watch & Earn */}
          {Object.keys(adsByBrand).length > 0 && (
            <div style={{marginTop:22,marginBottom:12}}>
              <div className="sec-hd">📺 Watch Ads &amp; Earn Rewards</div>
              <div style={{fontSize:12,color:'var(--muted)',marginBottom:12,lineHeight:1.7}}>
                Watch all ads for a brand to earn that brand's reward coupon — saved to your rewards!
              </div>

              {/* Earned reward popups */}
              {adRewards.map(r => (
                <div key={r.code} style={{background:'rgba(61,214,140,.07)',border:'2px dashed rgba(61,214,140,.3)',borderRadius:14,padding:14,textAlign:'center',marginBottom:10,animation:'pop .5s both'}}>
                  <div style={{fontSize:22,marginBottom:4}}>🎉</div>
                  <div style={{fontWeight:800,fontSize:14,marginBottom:2}}>Reward Earned from {r.brand_emoji} {r.brand_name}!</div>
                  <div style={{fontFamily:'monospace',fontSize:18,fontWeight:700,color:'var(--gold)',letterSpacing:'.1em',marginBottom:2}}>{r.code}</div>
                  <div style={{fontSize:12,color:'var(--muted)',marginBottom:8}}>{r.discount} · saved to your rewards</div>
                  <button onClick={()=>{navigator.clipboard?.writeText(r.code);dismissReward(r.code)}}
                    style={{background:'rgba(61,214,140,.15)',border:'1px solid rgba(61,214,140,.3)',borderRadius:8,padding:'5px 14px',color:'#3DD68C',fontSize:11,cursor:'pointer',fontFamily:'inherit',fontWeight:700}}>
                    Copy &amp; Dismiss
                  </button>
                </div>
              ))}

              {/* One card per brand */}
              {Object.values(adsByBrand).map(group => {
                const groupWatched = group.ads.filter(a => watchedSet.has(a.id)).length
                const allDone = groupWatched >= group.ads.length
                return (
                  <div key={group.brand_id} style={{background:'#0C1018',border:`1px solid ${allDone?'rgba(61,214,140,.2)':'rgba(255,255,255,.06)'}`,borderRadius:18,padding:14,marginBottom:10}}>
                    {/* Brand header */}
                    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                      <span style={{fontSize:24}}>{group.brand_emoji}</span>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:800,fontSize:13}}>{group.brand_name}</div>
                        <div style={{fontSize:11,color:'var(--muted)'}}>Watch all {group.ads.length} ad{group.ads.length>1?'s':''} → earn reward coupon</div>
                      </div>
                      {allDone
                        ? <span style={{fontSize:11,fontWeight:700,color:'#3DD68C',background:'rgba(61,214,140,.1)',border:'1px solid rgba(61,214,140,.2)',borderRadius:100,padding:'3px 10px'}}>✓ Done!</span>
                        : <span style={{fontSize:11,color:'var(--muted)'}}>{groupWatched}/{group.ads.length}</span>
                      }
                    </div>

                    {/* Progress dots */}
                    <div style={{display:'flex',gap:4,marginBottom:12}}>
                      {group.ads.map((_,i) => (
                        <div key={i} style={{flex:1,height:3,borderRadius:100,background:i<groupWatched?'var(--gold)':'rgba(255,255,255,.07)',transition:'background .4s'}}/>
                      ))}
                    </div>

                    {/* Active watcher (for this brand) */}
                    {watching && watching.brand_id === group.brand_id ? (
                      <div style={{background:'#161D28',borderRadius:12,overflow:'hidden',marginBottom:8}}>
                        {watching.video_url && ytId(watching.video_url) ? (
                          <div style={{aspectRatio:'16/9'}}>
                            <iframe width="100%" height="100%" style={{border:'none',display:'block'}}
                              src={`https://www.youtube.com/embed/${ytId(watching.video_url)}?autoplay=1&rel=0&modestbranding=1`}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen title={watching.title}/>
                          </div>
                        ) : watching.image_url ? (
                          <img src={watching.image_url} alt="" style={{width:'100%',height:100,objectFit:'cover',display:'block'}}/>
                        ) : (
                          <div style={{height:60,display:'flex',alignItems:'center',justifyContent:'center',fontSize:36}}>{watching.brand_emoji}</div>
                        )}
                        <div style={{padding:'10px 12px',textAlign:'center'}}>
                          <div style={{fontWeight:700,fontSize:13,marginBottom:4}}>{watching.title}</div>
                          {!watching.video_url && (
                            <>
                              <div className="pbg" style={{marginBottom:4}}><div className="pbar" style={{width:`${watchPct}%`}}/></div>
                              <div style={{fontSize:11,color:'var(--muted)'}}>{watchPct < 100 ? `Watching... ${Math.round(watchPct)}%` : '✓ Done!'}</div>
                            </>
                          )}
                          {watching.video_url && <div style={{fontSize:11,color:'var(--gold)'}}>Watch the full video above ↑</div>}
                        </div>
                      </div>
                    ) : (
                      /* Ad cards for this brand */
                      <div style={{display:'grid',gridTemplateColumns:`repeat(${Math.min(group.ads.length,3)},1fr)`,gap:6}}>
                        {group.ads.map(a => {
                          const done = watchedSet.has(a.id)
                          const vid = !!a.video_url
                          const thumb = ytId(a.video_url) ? `https://img.youtube.com/vi/${ytId(a.video_url)}/mqdefault.jpg` : null
                          return (
                            <div key={a.id} className={`ad-card ${done?'done':''}`}
                              style={{opacity: watching && watching.brand_id===group.brand_id && !done ? .5 : 1}}
                              onClick={()=>!done && !watching && watchAd(a)}>
                              {(thumb || a.image_url)
                                ? <div style={{height:64,background:`url(${thumb||a.image_url}) center/cover`,position:'relative',backgroundSize:'cover'}}>
                                    {!done && <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.25)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                                      <div style={{width:24,height:24,borderRadius:'50%',background:'rgba(0,0,0,.7)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,color:'white'}}>▶</div>
                                    </div>}
                                    {vid && !done && <div style={{position:'absolute',top:3,right:3,background:'#FF0000',borderRadius:3,padding:'1px 4px',fontSize:8,fontWeight:700,color:'white'}}>YT</div>}
                                  </div>
                                : <div style={{height:50,background:'linear-gradient(135deg,#161D28,#1e2836)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>{a.brand_emoji}</div>
                              }
                              <div style={{padding:'6px 8px'}}>
                                <div style={{fontWeight:700,fontSize:10,marginBottom:2,lineHeight:1.3}}>{a.title}</div>
                                {done
                                  ? <div style={{fontSize:9,color:'var(--green)',fontWeight:700}}>✓ Watched</div>
                                  : <div style={{fontSize:9,color:'var(--gold)',fontWeight:700}}>{vid?'▶ Video':'▶ Watch'}</div>
                                }
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Reward hint */}
                    {!allDone && (
                      <div style={{marginTop:10,background:'rgba(233,184,74,.05)',border:'1px solid rgba(233,184,74,.1)',borderRadius:8,padding:'7px 10px',fontSize:11,color:'rgba(237,233,226,.5)',textAlign:'center'}}>
                        🎁 Watch all {group.ads.length} ads → earn <strong style={{color:'var(--gold)'}}>reward coupon for {group.brand_name}</strong>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ BRANDS ══════════════════════════════════════════════ */}
      {page==='brands' && (
        <div className="cont fade">
          <div className="sec-hd">🏪 All Restaurants <span style={{fontWeight:400,color:'var(--muted)',fontSize:12}}>({brands.length})</span></div>
          <div className="grid2">
            {brands.map(b => (
              <div key={b.id} className="bcard" onClick={()=>goToBrand(b)}>
                <div style={{fontSize:30,marginBottom:8}}>{b.emoji}</div>
                <div style={{fontWeight:700,fontSize:13,marginBottom:2}}>{b.name}</div>
                <div style={{fontSize:11,color:'var(--muted)',marginBottom:6}}>{b.category}</div>
                {b.google_rating > 0 && <div style={{fontSize:12,color:'var(--gold)',fontWeight:600,marginBottom:6}}>★ {b.google_rating}</div>}
                <div style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:11,background:'rgba(233,184,74,.1)',border:'1px solid rgba(233,184,74,.2)',borderRadius:100,padding:'3px 10px',color:'var(--gold)',fontWeight:600}}>
                  🎁 {b.reward_offer}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ BRAND DETAIL ════════════════════════════════════════ */}
      {page==='brand' && selected && (
        <div className="cont fade">
          <button onClick={()=>{setPage('home');setSelected(null)}}
            style={{background:'none',border:'1px solid rgba(255,255,255,.08)',borderRadius:8,padding:'6px 14px',color:'var(--muted2)',fontSize:12,cursor:'pointer',fontFamily:'inherit',marginBottom:16,marginTop:4}}>
            ← Back
          </button>
          <div style={{textAlign:'center',marginBottom:20}}>
            <div style={{fontSize:56,marginBottom:10}}>{selected.emoji}</div>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:22,fontWeight:900,marginBottom:5}}>{selected.name}</div>
            <div style={{fontSize:13,color:'var(--muted)',marginBottom:10}}>
              {selected.category}{selected.location ? ` · ${selected.location}` : ''}
            </div>
            <div style={{display:'inline-flex',gap:8,flexWrap:'wrap',justifyContent:'center'}}>
              {selected.google_rating > 0 && (
                <span style={{fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:100,background:'rgba(233,184,74,.1)',border:'1px solid rgba(233,184,74,.2)',color:'var(--gold)'}}>★ {selected.google_rating}</span>
              )}
              {selected.total_reviews > 0 && (
                <span style={{fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:100,background:'rgba(61,214,140,.09)',border:'1px solid rgba(61,214,140,.2)',color:'var(--green)'}}>✓ {selected.total_reviews} verified</span>
              )}
            </div>
          </div>
          <div style={{background:'#0C1018',border:'1px solid rgba(233,184,74,.15)',borderRadius:18,padding:20,textAlign:'center',marginBottom:14}}>
            <div style={{fontSize:32,marginBottom:8}}>🎁</div>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:32,fontWeight:900,color:'var(--gold)',marginBottom:4}}>{selected.reward_offer}</div>
            <div style={{fontSize:13,color:'var(--muted)',marginBottom:16}}>Min ₹{selected.reward_min_order} · Valid {selected.coupon_validity_days} days</div>
            <div style={{fontSize:13,color:'rgba(237,233,226,.5)',lineHeight:1.7,marginBottom:16}}>
              Visit the restaurant, scan the QR code, write a genuine Google review, and earn your reward instantly.
            </div>
            {selected.location && (
              <div style={{background:'rgba(255,255,255,.04)',borderRadius:10,padding:'8px 14px',fontSize:12,color:'var(--muted)',marginBottom:14}}>
                📍 {selected.location}
              </div>
            )}
            <button className="goldbtn" onClick={()=>window.location.href=`/review?brand=${selected.id}`}>
              🗺 Scan QR / Leave a Review &amp; Earn →
            </button>
          </div>
        </div>
      )}

      {/* ══ PROFILE ═════════════════════════════════════════════ */}
      {page==='profile' && (
        <div className="cont fade">
          {token ? (
            <ProfilePage token={token} onLogout={()=>{ logout(); setPage('home') }}/>
          ) : (
            <div style={{textAlign:'center',padding:'60px 20px'}}>
              <div style={{fontSize:48,marginBottom:14}}>👤</div>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:900,marginBottom:8}}>Your Profile</div>
              <div style={{color:'var(--muted)',fontSize:13,marginBottom:24,lineHeight:1.7}}>
                Sign in by scanning a QR code at any brand to see your rewards and profile.
              </div>
              <button className="goldbtn" style={{maxWidth:220,margin:'0 auto'}} onClick={()=>window.location.href='/review'}>
                Scan QR to Sign In →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── BOTTOM NAV ── */}
      <div className="bnav">
        {[
          { id:'home',    icon:'🏠', lbl:'Home' },
          { id:'brands',  icon:'🏪', lbl:'Brands' },
          { id:'profile', icon:'👤', lbl:'Profile' },
        ].map(n => (
          <button key={n.id} className={`nbtn ${page===n.id?'on':''}`} onClick={()=>setPage(n.id)}>
            <span className="nic">{n.icon}</span>
            <span className="nlbl">{n.lbl}</span>
          </button>
        ))}
      </div>
      {/* Privacy policy link — required by Google OAuth verification */}
      <div style={{textAlign:'center',padding:'6px 0 80px',fontSize:10,color:'rgba(237,233,226,.18)'}}>
        <a href="/privacy" style={{color:'rgba(237,233,226,.25)',textDecoration:'none'}}>Privacy Policy</a>
        {' · '}SoftCraft Solutions
      </div>
    </div></>
  )
}

