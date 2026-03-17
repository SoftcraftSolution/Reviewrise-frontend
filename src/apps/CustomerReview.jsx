import { useState, useEffect, useRef } from 'react'

const BASE = import.meta.env.VITE_API_URL || 'https://reviewrise-production-2347.up.railway.app'
const GCID = import.meta.env.VITE_GOOGLE_CLIENT_ID
           || '894420486164-9lnvnbmsvqm2kptp2grq1hbh838ed6ar.apps.googleusercontent.com'

const apiCall = async (method, path, body, token) => {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type':'application/json', ...(token ? { Authorization:`Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const d = await r.json().catch(()=>({}))
  if (!r.ok) { const err = new Error(d.error || `HTTP ${r.status}`); err.code = d.error; err.payload = d; throw err }
  return d
}

const CHIPS = ['Slow service','Food quality','Cleanliness','High pricing','Ambience','Staff behaviour']

export default function CustomerReview() {
  const p          = new URLSearchParams(window.location.search)
  const brandId    = p.get('brand')
  const tableLabel = p.get('t') || ''

  const [brand,       setBrand]      = useState(null)
  const [brandErr,    setBrandErr]   = useState('')
  const [screen,      setScreen]     = useState('welcome')
  const [user,        setUser]       = useState(null)
  const [token,       setToken]      = useState(null)
  const [rating,      setRating]     = useState(0)
  const [hovered,     setHovered]    = useState(0)
  const [review,      setReview]     = useState('')
  const [chips,       setChips]      = useState([])
  const [fbMsg,       setFbMsg]      = useState('')
  const [coupon,      setCoupon]     = useState(null)
  const [reviewUrl,   setReviewUrl]  = useState('')
  const [sessionId,   setSessionId]  = useState(null)
  const [submitting,  setSubmit]     = useState(false)
  const [clipOk,      setClipOk]     = useState(false)
  const [alreadyDone, setAlreadyDone]= useState(null)
  const [errMsg,      setErrMsg]     = useState('')
  const [gState,      setGState]     = useState('idle')
  const [gError,      setGError]     = useState('')
  const [pollDots,    setPollDots]   = useState(0) // animated dots counter
  const pollRef  = useRef(null)
  const dotsRef  = useRef(null)
  const btnDiv   = useRef(null)
  const gInited  = useRef(false)

  useEffect(() => {
    if (!brandId) { setBrandErr('No brand ID. Scan the QR again.'); return }
    apiCall('GET', `/api/brands/${brandId}`).then(setBrand).catch(e => setBrandErr(e.message))
    const t = localStorage.getItem('rr_token')
    const u = localStorage.getItem('rr_user')
    if (t && u) try { setToken(t); setUser(JSON.parse(u)) } catch {}
  }, [brandId])

  // Google Sign-In
  const onCredential = async ({ credential }) => {
    setGState('loading'); setGError('')
    try {
      const data = await apiCall('POST', '/api/auth/google-id-token', { id_token: credential })
      localStorage.setItem('rr_token', data.token)
      localStorage.setItem('rr_user', JSON.stringify(data.user))
      setToken(data.token); setUser(data.user)
      setScreen('rating'); setGState('idle')
    } catch(e) { setGError(e.message); setGState('error') }
  }

  const initGoogle = () => {
    if (gInited.current || !window.google?.accounts?.id) return
    gInited.current = true
    const prev = (() => { try { return JSON.parse(localStorage.getItem('rr_user')) } catch { return null } })()
    window.google.accounts.id.initialize({
      client_id: GCID, callback: onCredential,
      auto_select: true, cancel_on_tap_outside: false,
      itp_support: true, login_hint: prev?.email || '',
    })
    if (btnDiv.current) {
      window.google.accounts.id.renderButton(btnDiv.current, {
        type:'standard', theme:'filled_blue', size:'large',
        text:'continue_with', shape:'rectangular', width: 340,
      })
    }
    window.google.accounts.id.prompt()
  }

  useEffect(() => {
    if (user || screen !== 'welcome') return
    if (!document.querySelector('script[src*="gsi/client"]')) {
      const s = document.createElement('script')
      s.src = 'https://accounts.google.com/gsi/client'
      s.async = true; s.defer = true
      document.head.appendChild(s)
    }
    const t = setInterval(() => {
      if (window.google?.accounts?.id && btnDiv.current) { clearInterval(t); initGoogle() }
    }, 150)
    return () => clearInterval(t)
  }, [screen, user])

  useEffect(() => () => {
    clearInterval(pollRef.current)
    clearInterval(dotsRef.current)
  }, [])

  const switchAccount = () => {
    localStorage.removeItem('rr_token'); localStorage.removeItem('rr_user')
    setUser(null); setToken(null); setGState('idle'); setGError('')
    gInited.current = false
    window.google?.accounts?.id?.disableAutoSelect()
    window.google?.accounts?.id?.cancel()
    if (btnDiv.current) btnDiv.current.innerHTML = ''
    setTimeout(() => initGoogle(), 100)
  }

  const handleRate = n => {
    setRating(n)
    setTimeout(() => setScreen(n >= 4 ? 'google' : 'feedback'), 200)
  }

  // Start background polling — checks every 8 seconds
  // Engine on Railway checks Places API every 30 sec and verifies session
  const startPolling = (sid) => {
    clearInterval(pollRef.current)
    // Animated dots
    dotsRef.current = setInterval(() => setPollDots(d => (d + 1) % 4), 600)

    pollRef.current = setInterval(async () => {
      try {
        const r = await apiCall('GET', `/api/verify/poll/${sid}`, null, token)
        if (r.status === 'verified') {
          clearInterval(pollRef.current); clearInterval(dotsRef.current)
          if (r.rewarded === false) {
            setScreen('feedback_done')
          } else {
            setCoupon(r.coupon); setScreen('reward')
          }
        } else if (r.status === 'expired') {
          clearInterval(pollRef.current); clearInterval(dotsRef.current)
          setErrMsg(r.message || 'Review not detected. Please try again.')
          setScreen('expired')
        }
        // if pending — keep polling silently
      } catch(e) { /* network error — keep polling */ }
    }, 8000)
  }

  // Open Google Maps + create session + start polling
  const handleOpenMaps = async () => {
    if (submitting) return
    setSubmit(true)
    const email = user?.email || ''
    const reviewTarget = brand?.google_place_id
      ? `https://search.google.com/local/writereview?placeid=${brand.google_place_id}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(brand?.name || '')}`
    const gmUrl = email
      ? `https://accounts.google.com/AccountChooser?Email=${encodeURIComponent(email)}&continue=${encodeURIComponent(reviewTarget)}`
      : reviewTarget

    setReviewUrl(gmUrl)
    if (review.trim()) { try { await navigator.clipboard.writeText(review) } catch {} }
    window.open(gmUrl, '_blank')
    setScreen('verifying')

    try {
      const sess = await apiCall('POST', '/api/verify/session', { brand_id: brandId, review_text: review }, token)
      setSessionId(sess.session_id)
      startPolling(sess.session_id)
    } catch(e) {
      if (e.code === 'already_reviewed') {
        setAlreadyDone(e.payload); setScreen('already_done')
      } else {
        setErrMsg(e.message); setScreen('expired')
      }
    }
    setSubmit(false)
  }

  const handleFeedback = async () => {
    try { await apiCall('POST', '/api/verify/feedback', { brand_id: brandId, stars: rating, chips, message: fbMsg }, token) } catch {}
    setScreen('feedback_done')
  }

  const active = hovered || rating

  const S = `
    @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,700;12..96,800&family=Fraunces:opsz,wght@9..144,700;9..144,900&display=swap');
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#07090E;color:#EDE9E2;font-family:'Bricolage Grotesque',sans-serif;min-height:100vh;display:flex;align-items:center;justify-content:center}
    .w{width:100%;max-width:400px;margin:0 auto;padding:16px}
    .card{background:linear-gradient(145deg,#0C1018,#111820);border:1px solid rgba(255,255,255,.07);border-radius:24px;overflow:hidden;position:relative}
    .gl{position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,rgba(233,184,74,.8),transparent)}
    .body{padding:20px}
    .scr{animation:fi .25s both}
    @keyframes fi{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
    @keyframes pop{0%{transform:scale(.4);opacity:0}75%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}
    @keyframes sp{to{transform:rotate(360deg)}}
    .btn{width:100%;padding:14px;border-radius:14px;background:linear-gradient(135deg,#b87a20,#E9B84A);color:#07090E;border:none;font-family:inherit;font-size:14px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:8px;transition:all .18s}
    .btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 22px rgba(233,184,74,.3)}
    .btn:disabled{opacity:.45;cursor:not-allowed}
    .btn.sec{background:transparent;border:1px solid rgba(255,255,255,.12);color:rgba(237,233,226,.6);font-size:12px;padding:10px}
    .btn.grn{background:linear-gradient(135deg,#1a7a3a,#3DD68C);color:#000;box-shadow:0 4px 20px rgba(61,214,140,.25)}
    .btn.grn:hover:not(:disabled){box-shadow:0 8px 30px rgba(61,214,140,.4)}
    .star{width:50px;height:50px;border-radius:14px;background:#161D28;border:2px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;font-size:22px;cursor:pointer;transition:all .15s;user-select:none}
    .star:hover,.star.on{border-color:#E9B84A;background:rgba(233,184,74,.1);transform:scale(1.08) translateY(-2px)}
    .ta{width:100%;background:#161D28;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:12px 14px;color:#EDE9E2;font-family:inherit;font-size:13px;resize:none;height:88px;outline:none;margin-bottom:12px}
    .ta:focus{border-color:rgba(233,184,74,.35)}
    .cpn{background:linear-gradient(135deg,rgba(233,184,74,.08),rgba(233,184,74,.02));border:2px dashed rgba(233,184,74,.3);border-radius:18px;padding:18px;text-align:center;margin-bottom:12px}
    .chip{padding:5px 12px;border-radius:100px;border:1px solid rgba(255,255,255,.07);background:#161D28;font-size:12px;color:rgba(237,233,226,.6);cursor:pointer;transition:all .15s;display:inline-block;margin:3px}
    .chip.on{border-color:rgba(233,184,74,.3);background:rgba(233,184,74,.08);color:#E9B84A}
    .acct{background:#161D28;border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:12px 14px;margin-bottom:10px;display:flex;align-items:center;gap:12px}
    .av{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#4285F4,#34A853);display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;color:white;flex-shrink:0}
    .ring{position:absolute;inset:-6px;border-radius:50%;border:2px solid transparent;border-top-color:#E9B84A;animation:sp 1.2s linear infinite}
    .ft{padding:8px 22px 14px;text-align:center;font-size:10px;color:rgba(237,233,226,.1)}
    #gbtn>div{width:100%!important} #gbtn iframe{width:100%!important;border-radius:10px!important}
  `

  if (brandErr) return (
    <><style>{S}</style><div className="w"><div className="card"><div className="gl"/>
      <div style={{padding:40,textAlign:'center'}}>
        <div style={{fontSize:40,marginBottom:12}}>❌</div>
        <div style={{fontSize:15,fontWeight:700,marginBottom:8}}>Invalid QR Code</div>
        <div style={{fontSize:13,color:'rgba(237,233,226,.4)'}}>{brandErr}</div>
      </div>
    </div></div></>
  )

  if (!brand) return (
    <><style>{S}</style><div className="w"><div className="card"><div className="gl"/>
      <div style={{padding:60,textAlign:'center',color:'rgba(237,233,226,.3)'}}>
        <div style={{width:28,height:28,borderRadius:'50%',border:'2px solid rgba(233,184,74,.3)',borderTopColor:'#E9B84A',animation:'sp 1s linear infinite',margin:'0 auto 12px'}}/>
        Loading...
      </div>
    </div></div></>
  )

  return (
    <><style>{S}</style>
    <div className="w"><div className="card"><div className="gl"/>

      {/* Brand header */}
      {!['reward','feedback_done','already_done'].includes(screen) && (
        <div style={{padding:'16px 20px 0',textAlign:'center'}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:6,background:'rgba(233,184,74,.1)',border:'1px solid rgba(233,184,74,.2)',borderRadius:100,padding:'3px 12px',marginBottom:10}}>
            <span style={{width:6,height:6,borderRadius:'50%',background:'#E9B84A',display:'inline-block'}}/>
            <span style={{fontSize:10,fontWeight:700,color:'#E9B84A',letterSpacing:'.1em'}}>REVIEWRISE</span>
          </div>
          <div style={{width:52,height:52,borderRadius:16,background:'linear-gradient(135deg,#1a2030,#222d40)',border:'1px solid rgba(255,255,255,.08)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,margin:'0 auto 8px'}}>{brand.emoji}</div>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:18,fontWeight:900,marginBottom:2}}>{brand.name}</div>
          <div style={{fontSize:12,color:'rgba(237,233,226,.35)',marginBottom:14}}>
            {brand.location}{tableLabel ? ` · ${tableLabel}` : ''}
          </div>
        </div>
      )}

      <div className="body">

        {/* ══ WELCOME ════════════════════════════════════════ */}
        {screen==='welcome' && (
          <div className="scr">
            <div style={{fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:900,textAlign:'center',marginBottom:12,lineHeight:1.2}}>
              Scan · Review · <span style={{color:'#E9B84A'}}>Earn {brand.reward_offer}</span>
            </div>
            <div style={{background:'rgba(233,184,74,.06)',border:'1px solid rgba(233,184,74,.15)',borderRadius:14,padding:14,marginBottom:14,display:'flex',gap:12,alignItems:'center'}}>
              <div style={{fontSize:28}}>🎁</div>
              <div>
                <div style={{fontWeight:700,fontSize:15,color:'#E9B84A'}}>{brand.reward_offer}</div>
                <div style={{fontSize:11,color:'rgba(237,233,226,.4)'}}>Min ₹{brand.reward_min_order} · Valid {brand.coupon_validity_days} days</div>
              </div>
            </div>
            <div style={{fontSize:12,color:'rgba(237,233,226,.4)',lineHeight:2,background:'#161D28',borderRadius:12,padding:'11px 14px',marginBottom:16}}>
              <span style={{color:'#E9B84A',fontWeight:700}}>①</span> Sign in with Google<br/>
              <span style={{color:'#E9B84A',fontWeight:700}}>②</span> Choose your rating<br/>
              <span style={{color:'#E9B84A',fontWeight:700}}>③</span> Post on Google Maps<br/>
              <span style={{color:'#E9B84A',fontWeight:700}}>④</span> Tap "I've Posted" → instant reward ✓
            </div>

            {user ? (
              <>
                <div className="acct">
                  <div className="av">{user.name?.[0]}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:13}}>{user.name}</div>
                    <div style={{fontSize:11,color:'#E9B84A',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user.email}</div>
                  </div>
                  <div style={{fontSize:10,color:'rgba(61,214,140,.8)',fontWeight:700}}>✓</div>
                </div>
                <button className="btn" onClick={()=>setScreen('rating')}>Continue as {user.name.split(' ')[0]} →</button>
                <button className="btn sec" onClick={switchAccount}>Switch Google account</button>
              </>
            ) : gState==='loading' ? (
              <div style={{height:46,borderRadius:12,background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',gap:10,marginBottom:8}}>
                <div style={{width:18,height:18,borderRadius:'50%',border:'2px solid #ddd',borderTopColor:'#4285F4',animation:'sp .8s linear infinite'}}/>
                <span style={{fontSize:13,fontWeight:700,color:'#111'}}>Signing in...</span>
              </div>
            ) : (
              <>
                <div id="gbtn" ref={btnDiv} style={{width:'100%',minHeight:46,marginBottom:8}}/>
                {gState==='error' && (
                  <div style={{background:'rgba(240,119,119,.1)',border:'1px solid rgba(240,119,119,.25)',borderRadius:10,padding:'10px 14px',fontSize:12,color:'#F07777',lineHeight:1.6}}>⚠ {gError}</div>
                )}
              </>
            )}
          </div>
        )}

        {/* ══ RATING ═════════════════════════════════════════ */}
        {screen==='rating' && (
          <div className="scr">
            <div style={{fontFamily:"'Fraunces',serif",fontSize:18,fontWeight:700,marginBottom:5}}>How was your experience?</div>
            <p style={{fontSize:13,color:'rgba(237,233,226,.5)',marginBottom:18}}>4★ or 5★ earns a reward coupon</p>
            <div style={{display:'flex',justifyContent:'center',gap:10,marginBottom:12}}>
              {[1,2,3,4,5].map(n=>(
                <div key={n} className={`star ${active>=n?'on':''}`}
                  onMouseEnter={()=>setHovered(n)} onMouseLeave={()=>setHovered(0)}
                  onClick={()=>handleRate(n)}>
                  {active>=n?'⭐':'☆'}
                </div>
              ))}
            </div>
            <div style={{textAlign:'center',fontSize:13,fontWeight:600,minHeight:20,color:'#E9B84A'}}>
              {active ? ['','Poor 😞','Below Average 😕','Average 😐','Good 😊','Excellent! 🤩'][active] : 'Tap to rate'}
            </div>
            {active >= 4 && (
              <div style={{marginTop:12,padding:10,background:'rgba(233,184,74,.07)',border:'1px solid rgba(233,184,74,.15)',borderRadius:10,fontSize:12,color:'rgba(237,233,226,.6)',textAlign:'center'}}>
                ✨ Post on Google Maps → earn <strong style={{color:'#E9B84A'}}>{brand.reward_offer}</strong>
              </div>
            )}
            {active > 0 && active < 4 && (
              <div style={{marginTop:12,padding:10,background:'rgba(240,119,119,.07)',border:'1px solid rgba(240,119,119,.15)',borderRadius:10,fontSize:12,color:'rgba(237,233,226,.6)',textAlign:'center'}}>
                We're sorry! Your feedback goes privately to management.
              </div>
            )}
          </div>
        )}

        {/* ══ WRITE REVIEW (google screen) ═══════════════════ */}
        {screen==='google' && (
          <div className="scr">
            <div style={{background:'rgba(233,184,74,.06)',border:'1px solid rgba(233,184,74,.18)',borderRadius:12,padding:'10px 14px',marginBottom:12}}>
              <div style={{fontWeight:700,color:'#E9B84A',marginBottom:5,fontSize:13}}>⚠ Important — use this Google account:</div>
              <div style={{display:'flex',alignItems:'center',gap:8,background:'rgba(0,0,0,.2)',borderRadius:8,padding:'7px 10px'}}>
                <div className="av" style={{width:26,height:26,fontSize:11}}>{user?.name?.[0]}</div>
                <span style={{fontWeight:700,fontSize:12,color:'#EDE9E2',wordBreak:'break-all'}}>{user?.email}</span>
              </div>
              <div style={{fontSize:11,color:'rgba(237,233,226,.4)',marginTop:5}}>
                If Google Maps shows a different account → switch to this email first.
              </div>
            </div>

            <div style={{background:'#161D28',borderRadius:12,padding:'10px 12px',display:'flex',alignItems:'center',gap:10,marginBottom:12,border:'1px solid rgba(255,255,255,.05)'}}>
              <span style={{fontSize:20}}>{brand.emoji}</span>
              <div>
                <div style={{fontWeight:700,fontSize:13}}>{brand.name}</div>
                <div style={{color:'#FBBC04',fontSize:13}}>{'★'.repeat(rating)}{'☆'.repeat(5-rating)}</div>
              </div>
            </div>

            <textarea className="ta"
              placeholder={`What did you like? (Optional — you can post stars only)`}
              value={review} onChange={e=>setReview(e.target.value)}/>

            {review.trim() && (
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,color:'rgba(237,233,226,.4)',marginBottom:4}}>👆 Tap to copy your review text:</div>
                <textarea readOnly value={review}
                  onFocus={e=>e.target.select()}
                  onClick={e=>{e.target.select();navigator.clipboard?.writeText(review).then(()=>{setClipOk(true);setTimeout(()=>setClipOk(false),5000)});try{document.execCommand('copy')}catch{}}}
                  style={{width:'100%',background:clipOk?'rgba(61,214,140,.08)':'rgba(233,184,74,.05)',border:`2px solid ${clipOk?'rgba(61,214,140,.5)':'rgba(233,184,74,.4)'}`,borderRadius:10,padding:'10px 12px',color:clipOk?'#3DD68C':'#EDE9E2',fontSize:13,fontFamily:'inherit',resize:'none',height:60,cursor:'copy',outline:'none'}}
                />
                {clipOk && <div style={{fontSize:11,color:'#3DD68C',fontWeight:700,marginTop:3}}>✓ Copied to clipboard!</div>}
              </div>
            )}

            <button className="btn" disabled={submitting} onClick={handleOpenMaps}>
              {submitting ? '🔄 Opening...' : '🗺️ Open Google Maps & Post Review ↗'}
            </button>
            <p style={{fontSize:11,color:'rgba(237,233,226,.22)',textAlign:'center',marginBottom:0}}>Opens Google Maps as {user?.email}</p>
          </div>
        )}

        {/* ══ VERIFYING ══ */}
        {screen==='verifying' && (
          <div className="scr" style={{textAlign:'center'}}>
            <div style={{width:72,height:72,borderRadius:'50%',background:'rgba(233,184,74,.08)',border:'2px solid rgba(233,184,74,.2)',margin:'0 auto 16px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,position:'relative'}}>
              🔍<div style={{position:'absolute',inset:-4,borderRadius:'50%',border:'2px solid transparent',borderTopColor:'#E9B84A',animation:'sp 1.2s linear infinite'}}/>
            </div>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:900,marginBottom:6}}>
              Verifying{['.','..','...',''][pollDots]}
            </div>
            <p style={{fontSize:13,color:'rgba(237,233,226,.5)',marginBottom:18,lineHeight:1.8}}>
              Post 4★ or 5★ on Google Maps, then come back.<br/>
              <strong style={{color:'rgba(237,233,226,.75)'}}>We detect it automatically.</strong>
            </p>

            {/* Status steps */}
            <div style={{background:'#0C1018',border:'1px solid rgba(255,255,255,.06)',borderRadius:14,padding:14,marginBottom:14,textAlign:'left'}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                <div style={{width:24,height:24,borderRadius:'50%',background:'rgba(61,214,140,.15)',border:'1px solid rgba(61,214,140,.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,flexShrink:0}}>✓</div>
                <div>
                  <div style={{fontSize:13,fontWeight:700}}>Review session started</div>
                  <div style={{fontSize:11,color:'rgba(237,233,226,.4)'}}>Logged in as {user?.email}</div>
                </div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                <div style={{width:24,height:24,borderRadius:'50%',background:'rgba(233,184,74,.15)',border:'1px solid rgba(233,184,74,.3)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <div style={{width:10,height:10,borderRadius:'50%',border:'2px solid rgba(233,184,74,.6)',borderTopColor:'#E9B84A',animation:'sp 1s linear infinite'}}/>
                </div>
                <div>
                  <div style={{fontSize:13,fontWeight:700}}>Scanning Google Maps</div>
                  <div style={{fontSize:11,color:'rgba(237,233,226,.4)'}}>Checking every 30 seconds for your review</div>
                </div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{width:24,height:24,borderRadius:'50%',background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'rgba(237,233,226,.25)',flexShrink:0}}>3</div>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:'rgba(237,233,226,.4)'}}>Reward issued automatically</div>
                  <div style={{fontSize:11,color:'rgba(237,233,226,.25)'}}>Appears here + saved in your profile</div>
                </div>
              </div>
            </div>

            {/* Open Maps button */}
            {reviewUrl && (
              <a href={reviewUrl} target="_blank" rel="noreferrer"
                style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,background:'#4285F4',borderRadius:12,padding:'12px',fontSize:13,color:'white',textDecoration:'none',marginBottom:10,fontWeight:700}}>
                🗺️ Open Google Maps ↗
              </a>
            )}

            {/* Copy review text if they typed one */}
            {review.trim() && (
              <div style={{background:'#161D28',border:'1px solid rgba(255,255,255,.06)',borderRadius:10,padding:'10px 12px',marginBottom:10,textAlign:'left'}}>
                <div style={{fontSize:10,color:'rgba(237,233,226,.3)',marginBottom:4,textTransform:'uppercase',letterSpacing:'.05em'}}>Paste this on Google Maps:</div>
                <div style={{fontSize:12,color:'rgba(237,233,226,.7)',lineHeight:1.6,marginBottom:6}}>{review}</div>
                <button onClick={()=>{navigator.clipboard?.writeText(review);setClipOk(true);setTimeout(()=>setClipOk(false),3000)}}
                  style={{fontSize:11,background:clipOk?'rgba(61,214,140,.1)':'rgba(255,255,255,.06)',border:`1px solid ${clipOk?'rgba(61,214,140,.3)':'rgba(255,255,255,.08)'}`,borderRadius:6,padding:'4px 12px',color:clipOk?'#3DD68C':'rgba(237,233,226,.6)',cursor:'pointer',fontFamily:'inherit',fontWeight:600}}>
                  {clipOk?'✓ Copied!':'Copy'}
                </button>
              </div>
            )}

            {/* Important note */}
            <div style={{background:'rgba(61,214,140,.05)',border:'1px solid rgba(61,214,140,.1)',borderRadius:10,padding:'10px 14px',marginBottom:12,fontSize:12,color:'rgba(237,233,226,.6)',lineHeight:1.7}}>
              💡 <strong style={{color:'#3DD68C'}}>You can close this page.</strong> Once your review appears on Google (usually 5–10 min), your reward will be ready in your profile automatically.
            </div>

            <button className="btn sec" onClick={()=>window.location.href='/'}>
              Go to Profile & Check Later →
            </button>
            <button className="btn sec" style={{marginTop:6}} onClick={()=>setScreen('google')}>← Go back</button>
          </div>
        )}

        {/* ══ REWARD ═════════════════════════════════════════ */}
        {screen==='reward' && (
          <div className="scr">
            <div style={{textAlign:'center',marginBottom:14}}>
              <div style={{fontSize:52,animation:'pop .6s both'}}>🏆</div>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:22,fontWeight:900,marginBottom:8}}>
                Reward <span style={{color:'#E9B84A'}}>Unlocked!</span>
              </div>
              <div style={{display:'inline-flex',alignItems:'center',gap:5,background:'rgba(61,214,140,.09)',border:'1px solid rgba(61,214,140,.2)',borderRadius:100,padding:'3px 14px',fontSize:11,fontWeight:700,color:'#3DD68C'}}>
                ✓ Review Verified
              </div>
            </div>
            {coupon ? (
              <div className="cpn">
                <div style={{fontSize:12,color:'rgba(237,233,226,.4)',marginBottom:6}}>Your reward coupon:</div>
                <div style={{fontFamily:'monospace',fontSize:28,fontWeight:900,color:'#E9B84A',letterSpacing:'.12em',marginBottom:6}}>{coupon.code}</div>
                <div style={{fontSize:16,fontWeight:700,marginBottom:4}}>{coupon.discount}</div>
                <div style={{fontSize:12,color:'rgba(237,233,226,.4)',marginBottom:12}}>
                  Min order ₹{coupon.min_order} · Valid {brand.coupon_validity_days} days
                </div>
                <button onClick={()=>{navigator.clipboard?.writeText(coupon.code);setClipOk(true);setTimeout(()=>setClipOk(false),3000)}}
                  style={{background:'rgba(233,184,74,.1)',border:'1px solid rgba(233,184,74,.3)',borderRadius:10,padding:'8px 20px',color:'#E9B84A',fontSize:12,cursor:'pointer',fontFamily:'inherit',fontWeight:700}}>
                  {clipOk?'✓ Copied!':'📋 Copy Code'}
                </button>
              </div>
            ) : (
              <div style={{textAlign:'center',padding:20,color:'rgba(237,233,226,.5)'}}>Reward issued! Show this screen to the cashier.</div>
            )}
            <div style={{background:'#0C1018',border:'1px solid rgba(255,255,255,.05)',borderRadius:12,padding:'10px 14px',marginBottom:10,fontSize:12,color:'rgba(237,233,226,.4)',textAlign:'center',lineHeight:1.7}}>
              Show the code above to the cashier to redeem your discount.
            </div>
            <button className="btn sec" onClick={()=>window.location.href='/'}>Explore More Restaurants →</button>
          </div>
        )}

        {/* ══ ALREADY REVIEWED ═══════════════════════════════ */}
        {screen==='already_done' && alreadyDone && (
          <div className="scr" style={{textAlign:'center'}}>
            <div style={{fontSize:46,marginBottom:8}}>⭐</div>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:18,fontWeight:900,marginBottom:8}}>Review Already Given!</div>
            <p style={{fontSize:13,color:'rgba(237,233,226,.5)',lineHeight:1.7,marginBottom:14}}>
              You already reviewed <strong style={{color:'#E9B84A'}}>{brand.name}</strong> and earned your reward.
            </p>
            {alreadyDone.coupon_code && (
              <div className="cpn">
                <div style={{fontSize:12,color:'rgba(237,233,226,.4)',marginBottom:4}}>Your existing reward:</div>
                <div style={{fontFamily:'monospace',fontSize:24,fontWeight:900,color:'#E9B84A',letterSpacing:'.1em',marginBottom:4}}>{alreadyDone.coupon_code}</div>
                <div style={{fontSize:14,fontWeight:700,marginBottom:4}}>{alreadyDone.coupon_discount}</div>
                <div style={{fontSize:11,color:alreadyDone.coupon_status==='active'?'#3DD68C':'rgba(237,233,226,.4)'}}>
                  {alreadyDone.coupon_status==='active'?'● Active — show to cashier':'● '+alreadyDone.coupon_status}
                </div>
              </div>
            )}
            <button className="btn" onClick={()=>window.location.href='/'}>Explore More Restaurants &amp; Win Rewards →</button>
          </div>
        )}

        {/* ══ FEEDBACK (1-3★) ════════════════════════════════ */}
        {screen==='feedback' && (
          <div className="scr">
            <div style={{textAlign:'center',fontSize:38,marginBottom:10}}>🤝</div>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:17,fontWeight:700,textAlign:'center',marginBottom:5}}>Help us improve</div>
            <p style={{fontSize:13,color:'rgba(237,233,226,.5)',textAlign:'center',lineHeight:1.7,marginBottom:14}}>
              Sent privately to management — never public.
            </p>
            <div style={{marginBottom:14}}>
              {CHIPS.map(c=>(
                <span key={c} className={`chip ${chips.includes(c)?'on':''}`}
                  onClick={()=>setChips(p=>p.includes(c)?p.filter(x=>x!==c):[...p,c])}>
                  {c}
                </span>
              ))}
            </div>
            <textarea className="ta" placeholder="Tell us more (optional)..." value={fbMsg} onChange={e=>setFbMsg(e.target.value)}/>
            <button className="btn" onClick={handleFeedback}>Send Feedback →</button>
            <button className="btn sec" onClick={()=>setScreen('rating')}>← Change rating</button>
          </div>
        )}

        {/* ══ FEEDBACK DONE ══════════════════════════════════ */}
        {screen==='feedback_done' && (
          <div className="scr" style={{textAlign:'center'}}>
            <div style={{fontSize:46,marginBottom:10}}>💌</div>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:17,fontWeight:700,marginBottom:6}}>Thank you!</div>
            <p style={{fontSize:13,color:'rgba(237,233,226,.5)',lineHeight:1.7,marginBottom:16}}>
              Your feedback has been sent privately to management.
            </p>
            <button className="btn" onClick={()=>window.location.href='/'}>Explore More Restaurants →</button>
          </div>
        )}

        {/* ══ EXPIRED / ERROR ════════════════════════════════ */}
        {screen==='expired' && (
          <div className="scr" style={{textAlign:'center'}}>
            <div style={{fontSize:48,marginBottom:12}}>⏱️</div>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:18,fontWeight:900,color:'#F07777',marginBottom:8}}>Session Expired</div>
            <p style={{fontSize:13,color:'rgba(237,233,226,.4)',lineHeight:1.7,marginBottom:16}}>
              {errMsg || 'Your session has expired.'}<br/>
              Make sure you posted from <strong style={{color:'#E9B84A'}}>{user?.email}</strong> on Google Maps with 4★ or 5★.
            </p>
            <button className="btn" onClick={()=>{ setScreen('google'); setErrMsg('') }}>Try Again</button>
            <button className="btn sec" onClick={()=>window.location.href='/'}>Explore Other Restaurants →</button>
          </div>
        )}

      </div>
      <div className="ft">Powered by ReviewRise · SoftCraft Solutions</div>
    </div></div></>
  )
}
