import { useState, useEffect } from 'react'
import Sidebar from './Sidebar.jsx'
import * as api from '../api.js'

export default function BrandDashboard({ user, onLogout }) {
  const [tab,      setTab]      = useState('coupons')
  const [brand,    setBrand]    = useState(()=>{ try{return JSON.parse(localStorage.getItem('rr_brand'))}catch{return null} })
  const [coupons,  setCoupons]  = useState([])
  const [reviews,  setReviews]  = useState([])
  const [feedback, setFeedback] = useState([])
  const [stats,    setStats]    = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [err,      setErr]      = useState('')

  const load = async () => {
    setLoading(true); setErr('')
    try {
      // Find this user's brand
      let myBrand = brand
      if (!myBrand) {
        const all = await api.getAllBrands()
        myBrand = all.find(b => b.owner_email?.toLowerCase() === user?.email?.toLowerCase()) || all[0]
        if (myBrand) { setBrand(myBrand); localStorage.setItem('rr_brand', JSON.stringify(myBrand)) }
      }
      if (!myBrand) { setErr('No brand linked to your account. Contact super admin.'); setLoading(false); return }

      const [cp, rv, fb, st] = await Promise.all([
        api.getBrandCoupons(myBrand.id),
        api.getBrandReviews(myBrand.id),
        api.getBrandFeedback(myBrand.id),
        api.getBrandStats(myBrand.id),
      ])
      setCoupons(cp); setReviews(rv); setFeedback(fb); setStats(st)
    } catch(e) { setErr(e.message) }
    setLoading(false)
  }

  useEffect(()=>{ load() },[])

  const unread = feedback.filter(f=>!f.is_read).length

  const TABS = [
    {id:'overview', icon:'📊', label:'Overview'},
    {id:'reviews',  icon:'⭐', label:'Reviews'},
    {id:'feedback', icon:'💬', label:'Feedback', badge:unread},
    {id:'coupons',  icon:'🎟️', label:'Coupons'},
    {id:'settings', icon:'⚙️', label:'Settings'},
  ]

  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',color:'var(--muted)'}}>Loading...</div>
  if (err) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',flexDirection:'column',gap:12}}><div style={{fontSize:36}}>⚠️</div><div style={{color:'var(--red)',fontSize:14}}>{err}</div><button className="btn" onClick={load}>Retry</button></div>

  return (
    <div className="dash-layout fade">
      <Sidebar
        logo={{title:'ReviewRise',sub:'Brand Portal'}}
        profile={{avatar:brand?.emoji||'🏪', name:brand?.name||'Brand', role:'Business Owner'}}
        nav={TABS.map(t=>({...t,active:tab===t.id,onClick:()=>setTab(t.id)}))}
        footer={brand?.location||''}
        onLogout={onLogout}
      />
      <div className="main-area">
        <div className="topbar">
          <div className="topbar-l">
            <div className="t1">{{overview:'Overview',reviews:'Google Reviews',feedback:'Private Feedback',coupons:'Coupon Manager',settings:'Settings'}[tab]}</div>
            <div className="t2">{brand?.name} · {brand?.location}</div>
          </div>
          <div className="topbar-r">
            <span style={{fontSize:11,color:'var(--muted)'}}>Rating: </span>
            <span style={{fontSize:13,fontWeight:700,color:'var(--gold)',marginLeft:4}}>★ {brand?.google_rating}</span>
          </div>
        </div>
        <div className="content-area">
          {tab==='overview'  && <Overview brand={brand} stats={stats}/>}
          {tab==='reviews'   && <Reviews reviews={reviews} reload={load}/>}
          {tab==='feedback'  && <Feedback feedback={feedback} reload={load}/>}
          {tab==='coupons'   && <Coupons brand={brand} coupons={coupons} reload={load}/>}
          {tab==='settings'  && <Settings brand={brand} reload={load}/>}
        </div>
      </div>
    </div>
  )
}

function Overview({ brand, stats }) {
  return (
    <div className="fade">
      <div className="stat-row" style={{gridTemplateColumns:'repeat(4,1fr)'}}>
        {[
          {val:brand?.total_reviews||0, lbl:'Google Reviews', color:'var(--gold)'},
          {val:'★ '+(brand?.google_rating||0), lbl:'Current Rating', color:'var(--green)'},
          {val:stats?.coupons?.active||0, lbl:'Active Coupons', color:'var(--blue)'},
          {val:stats?.coupons?.redeemed||0, lbl:'Redeemed', color:'var(--purple)'},
        ].map(s=>(
          <div key={s.lbl} className="stat-item" style={{textAlign:'center'}}>
            <div className="stat-val" style={{color:s.color}}>{s.val}</div>
            <div className="stat-lbl">{s.lbl}</div>
          </div>
        ))}
      </div>
      <div className="card-box" style={{marginBottom:14}}>
        <div style={{fontWeight:800,marginBottom:10}}>Your Reward Offer</div>
        <div style={{fontSize:36,fontWeight:900,color:'var(--gold)',marginBottom:4}}>{brand?.reward_offer}</div>
        <div style={{fontSize:13,color:'var(--muted)'}}>Min. order ₹{brand?.reward_min_order} · Valid {brand?.coupon_validity_days} days</div>
      </div>
      <div className="card-box">
        <div style={{fontWeight:800,marginBottom:10}}>Customer QR Scan Link</div>
        <div style={{fontFamily:'monospace',fontSize:12,color:'var(--gold)',background:'var(--card2)',padding:'10px 14px',borderRadius:8,wordBreak:'break-all',marginBottom:10}}>
          https://reviewrise-frontend.vercel.app/review?brand={brand?.id}
        </div>
        <button className="btn" onClick={()=>navigator.clipboard?.writeText(`https://reviewrise-frontend.vercel.app/review?brand=${brand?.id}`)}>Copy Link</button>
      </div>
    </div>
  )
}

function Reviews({ reviews, reload }) {
  const total   = reviews.length
  const avg     = total ? (reviews.reduce((s,r)=>s+(r.stars||0),0)/total).toFixed(1) : '—'
  const highStar = reviews.filter(r=>r.stars>=4).length

  return (
    <div className="fade">
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
        {[
          {v:total,    l:'Total Reviews', c:'var(--gold)'},
          {v:avg,      l:'Avg Rating',    c:'#FBBC04'},
          {v:highStar, l:'4★+ Reviews',  c:'var(--green)'},
        ].map(s=>(
          <div key={s.l} className="card-box" style={{textAlign:'center',padding:12}}>
            <div style={{fontWeight:800,fontSize:22,color:s.c}}>{s.v}</div>
            <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>{s.l}</div>
          </div>
        ))}
      </div>
      <div style={{fontWeight:800,fontSize:14,marginBottom:4}}>Google Reviews via ReviewRise</div>
      <div style={{fontSize:12,color:'var(--muted)',marginBottom:14,lineHeight:1.6}}>Every review was collected through your QR code. Email, stars &amp; coupon status shown below.</div>
      {reviews.length===0 && <div style={{padding:40,textAlign:'center',color:'var(--muted)'}}>No reviews yet. Share your QR code to get started!</div>}
      {reviews.map((r,i)=>(
        <div key={r.id||i} className="card-box" style={{marginBottom:10}}>
          <div style={{display:'flex',gap:10,marginBottom:6,alignItems:'flex-start'}}>
            <div style={{width:38,height:38,borderRadius:'50%',background:'var(--card3)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:15,flexShrink:0}}>
              {(r.reviewer_name||r.user_email||'?')[0].toUpperCase()}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:700,fontSize:13}}>{r.reviewer_name||'Anonymous'}</div>
              {r.user_email && <div style={{fontSize:11,color:'var(--gold)',marginTop:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>📧 {r.user_email}</div>}
              <div style={{display:'flex',gap:6,alignItems:'center',marginTop:3,flexWrap:'wrap'}}>
                <span style={{color:'#FBBC04',fontSize:13}}>{'★'.repeat(r.stars||0)}{'☆'.repeat(5-(r.stars||0))}</span>
                <span style={{fontSize:11,color:'var(--muted)'}}>{new Date(r.created_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</span>
                <span className="badge green">✓ Verified</span>
                {r.replied && <span className="badge blue">Replied</span>}
              </div>
            </div>
            {r.coupon_code && (
              <div style={{flexShrink:0,textAlign:'right'}}>
                <div style={{fontFamily:'monospace',fontSize:11,fontWeight:700,color:'var(--gold)',background:'rgba(233,184,74,.08)',border:'1px solid rgba(233,184,74,.2)',borderRadius:6,padding:'3px 8px'}}>{r.coupon_code}</div>
                <div style={{fontSize:10,color:'var(--muted)',marginTop:2}}>{r.coupon_discount}</div>
                <div style={{fontSize:10,marginTop:1,color:r.coupon_status==='redeemed'?'var(--red)':r.coupon_status==='active'?'var(--green)':'var(--muted)'}}>
                  {r.coupon_status==='redeemed'?'🔴 Used':r.coupon_status==='active'?'🟢 Active':'⚪ —'}
                </div>
              </div>
            )}
          </div>
          {r.review_text && <p style={{fontSize:13,color:'var(--muted2)',lineHeight:1.7,marginBottom:6,paddingLeft:48}}>"{r.review_text}"</p>}
          {!r.replied && <button className="btn sm" style={{marginLeft:48}} onClick={async()=>{await api.markReplied(r.id);reload()}}>Mark Replied ✓</button>}
        </div>
      ))}
    </div>
  )
}

function Feedback({ feedback, reload }) {
  return (
    <div className="fade">
      <div style={{fontWeight:800,fontSize:14,marginBottom:4}}>Private Feedback</div>
      <div style={{fontSize:12,color:'var(--muted)',marginBottom:16}}>1–3 star feedback sent privately. Never shown publicly.</div>
      {feedback.length===0 && <div style={{padding:40,textAlign:'center',color:'var(--muted)'}}>No feedback yet. 🎉</div>}
      {feedback.map((f,i)=>(
        <div key={f.id||i} className="card-box" style={{marginBottom:10,borderLeft:!f.is_read?'3px solid var(--red)':'1px solid var(--b1)',cursor:'pointer'}}
          onClick={async()=>{if(!f.is_read){await api.markFeedbackRead(f.id);reload()}}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
            {!f.is_read && <div style={{width:7,height:7,borderRadius:'50%',background:'var(--red)',flexShrink:0}}/>}
            <span style={{color:'var(--red)',fontSize:13}}>{'★'.repeat(f.stars||0)+'☆'.repeat(5-(f.stars||0))}</span>
            <span style={{fontSize:11,color:'var(--muted)',marginLeft:'auto'}}>{new Date(f.created_at).toLocaleDateString('en-IN')}</span>
          </div>
          {f.chips?.length>0 && (
            <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:8}}>
              {f.chips.map(c=><span key={c} style={{padding:'2px 10px',borderRadius:100,background:'var(--redbg)',border:'1px solid rgba(240,119,119,.2)',fontSize:11,color:'var(--red)'}}>{c}</span>)}
            </div>
          )}
          {f.message && <div style={{fontSize:13,color:'var(--muted2)'}}>{f.message}</div>}
        </div>
      ))}
    </div>
  )
}

function Coupons({ brand, coupons, reload }) {
  const [code,     setCode]     = useState('')
  const [result,   setResult]   = useState(null)
  const [checking, setChecking] = useState(false)
  const [redeeming,setRedeeming]= useState(false)
  const [discount, setDiscount] = useState(brand?.reward_offer||'20% OFF')
  const [minOrder, setMinOrder] = useState(brand?.reward_min_order||500)
  const [validity, setValidity] = useState(brand?.coupon_validity_days||30)
  const [forUser,  setForUser]  = useState('')
  const [generated,setGenerated]= useState(null)
  const [genLoading,setGenLoading]=useState(false)

  const verify = async () => {
    if (!code.trim()) return
    setChecking(true); setResult(null)
    try {
      const r = await api.verifyCoupon(code.trim())
      setResult(r)
    } catch(e) { setResult({valid:false,reason:e.message}) }
    setChecking(false)
  }

  const redeem = async () => {
    setRedeeming(true)
    try {
      await api.redeemCoupon(result.coupon.id)
      setResult(p=>({...p,coupon:{...p.coupon,status:'redeemed'}}))
      setCode(''); reload()
    } catch(e) { alert('Redeem failed: '+e.message) }
    setRedeeming(false)
  }

  const generate = async () => {
    setGenLoading(true)
    try {
      const r = await api.generateCoupon({ brand_id:brand.id, discount, min_order:minOrder, validity_days:validity, for_user_name:forUser })
      setGenerated(r); reload()
    } catch(e) { alert('Failed: '+e.message) }
    setGenLoading(false)
  }

  return (
    <div className="fade">
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18,marginBottom:24}}>

        {/* VERIFY PANEL */}
        <div className="card-box">
          <div style={{fontWeight:800,fontSize:14,marginBottom:4}}>🔍 Verify Coupon</div>
          <div style={{fontSize:12,color:'var(--muted)',marginBottom:14}}>Cashier types customer's code to validate</div>
          <div style={{display:'flex',gap:8,marginBottom:12}}>
            <input className="input" value={code} onChange={e=>{setCode(e.target.value.toUpperCase());setResult(null)}}
              onKeyDown={e=>e.key==='Enter'&&verify()}
              placeholder="SPICE4K9M" style={{flex:1,fontFamily:'monospace',letterSpacing:'.08em'}}/>
            <button className="btn primary" onClick={verify} disabled={checking}>{checking?'...':'Verify'}</button>
          </div>

          {/* VALID */}
          {result?.valid && result.coupon?.status!=='redeemed' && (
            <div style={{background:'var(--greenbg)',border:'1px solid rgba(61,214,140,.25)',borderRadius:12,padding:16}}>
              <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:12}}>
                <span style={{fontSize:24}}>✅</span>
                <div>
                  <div style={{fontWeight:800,color:'var(--green)',fontSize:14}}>Valid Coupon!</div>
                  <div style={{fontSize:11,color:'var(--muted)'}}>{result.coupon.source} coupon</div>
                </div>
              </div>
              <div style={{background:'var(--card)',borderRadius:10,padding:12,marginBottom:12,display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                {[['Customer',result.coupon.user_name||'—'],['Discount',result.coupon.discount],['Min. Order','₹'+result.coupon.min_order],['Expires',new Date(result.coupon.expires_at).toLocaleDateString('en-IN')]].map(([l,v])=>(
                  <div key={l}><div style={{fontSize:10,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:2}}>{l}</div><div style={{fontSize:13,fontWeight:700}}>{v}</div></div>
                ))}
              </div>
              <div style={{background:'rgba(233,184,74,.06)',border:'1px solid var(--goldb)',borderRadius:10,padding:10,marginBottom:12,textAlign:'center'}}>
                <div style={{fontSize:10,color:'var(--muted)',marginBottom:2}}>APPLY THIS DISCOUNT</div>
                <div style={{fontSize:20,fontWeight:900,color:'var(--gold)'}}>{result.coupon.discount}</div>
                <div style={{fontSize:11,color:'var(--muted)'}}>on minimum order of ₹{result.coupon.min_order}</div>
              </div>
              <button className="btn primary" style={{width:'100%',justifyContent:'center'}} onClick={redeem} disabled={redeeming}>
                {redeeming?'Processing...':'✓ Apply Discount & Mark Redeemed'}
              </button>
            </div>
          )}

          {/* ALREADY REDEEMED */}
          {result?.coupon?.status==='redeemed' && (
            <div style={{background:'var(--bluebg)',border:'1px solid rgba(106,163,248,.25)',borderRadius:12,padding:14,display:'flex',gap:10,alignItems:'center'}}>
              <span style={{fontSize:22}}>ℹ️</span>
              <div><div style={{fontWeight:800,color:'var(--blue)'}}>Already Redeemed</div><div style={{fontSize:12,color:'var(--muted2)'}}>This coupon was already used.</div></div>
            </div>
          )}

          {/* INVALID */}
          {result && !result.valid && (
            <div style={{background:'var(--redbg)',border:'1px solid rgba(240,119,119,.25)',borderRadius:12,padding:14,display:'flex',gap:10,alignItems:'center'}}>
              <span style={{fontSize:22}}>❌</span>
              <div><div style={{fontWeight:800,color:'var(--red)'}}>Invalid</div><div style={{fontSize:12,color:'var(--muted2)'}}>{result.reason}</div></div>
            </div>
          )}
        </div>

        {/* GENERATE PANEL */}
        <div className="card-box">
          <div style={{fontWeight:800,fontSize:14,marginBottom:4}}>🎟️ Generate Coupon</div>
          <div style={{fontSize:12,color:'var(--muted)',marginBottom:14}}>Create a manual discount code for any customer</div>
          <div className="form-row"><label className="label">Discount Offer</label>
            <input className="input" value={discount} onChange={e=>setDiscount(e.target.value)} placeholder="20% OFF or ₹200 OFF"/></div>
          <div className="form-row"><label className="label">Minimum Order (₹)</label>
            <input className="input" type="number" value={minOrder} onChange={e=>setMinOrder(e.target.value)}/></div>
          <div className="form-row"><label className="label">Valid for (days)</label>
            <input className="input" type="number" value={validity} onChange={e=>setValidity(e.target.value)}/></div>
          <div className="form-row"><label className="label">For Customer (optional)</label>
            <input className="input" value={forUser} onChange={e=>setForUser(e.target.value)} placeholder="Customer name"/></div>
          <button className="btn primary" style={{width:'100%',justifyContent:'center'}} onClick={generate} disabled={genLoading}>
            {genLoading?'Generating...':'Generate Code'}
          </button>
          {generated && (
            <div style={{marginTop:14,background:'var(--gold2)',border:'2px dashed var(--goldb)',borderRadius:12,padding:14,textAlign:'center'}}>
              <div style={{fontSize:11,color:'var(--muted)',marginBottom:4,textTransform:'uppercase',letterSpacing:'.08em'}}>Your Code</div>
              <div style={{fontFamily:'monospace',fontSize:22,fontWeight:800,color:'var(--gold)',letterSpacing:'.1em'}}>{generated.code}</div>
              <div style={{fontSize:12,color:'var(--muted2)',marginTop:4}}>{generated.discount} · Min ₹{generated.min_order}</div>
              <div style={{fontSize:11,color:'var(--green)',marginTop:6}}>✓ Active now</div>
              <button className="btn sm" style={{marginTop:8}} onClick={()=>navigator.clipboard?.writeText(generated.code)}>Copy Code</button>
            </div>
          )}
        </div>
      </div>

      {/* COUPON TABLE */}
      <div style={{fontWeight:800,fontSize:14,marginBottom:10}}>All Coupons <span style={{fontWeight:400,color:'var(--muted)',fontSize:12}}>({coupons.length})</span></div>
      <div className="table-wrap">
        <div className="table-head" style={{gridTemplateColumns:'1.2fr 1.5fr 1fr 1fr 0.8fr 0.8fr'}}>
          <span>Code</span><span>Customer</span><span>Discount</span><span>Issued</span><span>Source</span><span>Status</span>
        </div>
        {coupons.length===0 && <div style={{padding:20,textAlign:'center',color:'var(--muted)'}}>No coupons yet.</div>}
        {coupons.map(c=>(
          <div key={c.id} className="table-row" style={{gridTemplateColumns:'1.2fr 1.5fr 1fr 1fr 0.8fr 0.8fr'}}>
            <span style={{fontFamily:'monospace',fontSize:12,color:'var(--gold)',fontWeight:600}}>{c.code}</span>
            <span style={{fontSize:12}}>{c.user_name||'—'}</span>
            <span style={{fontWeight:700}}>{c.discount}</span>
            <span style={{fontSize:12,color:'var(--muted2)'}}>{new Date(c.issued_at).toLocaleDateString('en-IN')}</span>
            <span><span className={`badge ${c.source==='review'?'gold':c.source==='ads'?'blue':'purple'}`}>{c.source}</span></span>
            <span><span className={`badge ${c.status==='active'?'green':c.status==='redeemed'?'blue':'muted'}`}>{c.status}</span></span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Settings({ brand, reload }) {
  const [f,setF]           = useState({reward_offer:brand?.reward_offer||'',reward_min_order:brand?.reward_min_order||500,coupon_validity_days:brand?.coupon_validity_days||30})
  const [saved,setSaved]   = useState(false)
  const [gmbStatus,setGMB] = useState(null)
  const [gmbLoading,setGL] = useState(false)
  const [gmbMsg,setGMBMsg] = useState('')

  useEffect(()=>{
    if (!brand?.id) return
    api.getGMBStatus(brand.id).then(setGMB).catch(()=>{})
    // Check if returning from OAuth
    const p = new URLSearchParams(window.location.search)
    if (p.get('gmb')==='success') { setGMBMsg('✅ Google Business connected successfully!'); api.getGMBStatus(brand.id).then(setGMB); window.history.replaceState({},'',window.location.pathname) }
    if (p.get('gmb')==='error')   { setGMBMsg('❌ Connection failed: ' + (p.get('reason')||'unknown error')); window.history.replaceState({},'',window.location.pathname) }
  },[brand?.id])

  const save = async () => { await api.updateBrand(brand.id,f); setSaved(true); setTimeout(()=>setSaved(false),2000); reload() }

  const connectGMB = async () => {
    setGL(true)
    try {
      const r = await api.getGMBConnectURL(brand.id)
      window.location.href = r.oauth_url
    } catch(e) { setGMBMsg('Error: ' + e.message); setGL(false) }
  }

  const disconnectGMB = async () => {
    if (!confirm('Disconnect Google Business account?')) return
    await api.disconnectGMB(brand.id)
    setGMB(s=>({...s, connected:false}))
    setGMBMsg('Disconnected.')
  }

  return (
    <div className="fade">

      {/* ── Google Business Connect ── */}
      <div className="card-box" style={{marginBottom:16}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
          <div style={{width:36,height:36,borderRadius:8,background:'rgba(66,133,244,.1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0}}>G</div>
          <div>
            <div style={{fontWeight:800,fontSize:14}}>Google Business Profile</div>
            <div style={{fontSize:12,color:'var(--muted)'}}>Connect to enable instant review verification (no polling)</div>
          </div>
          {gmbStatus?.connected && (
            <div style={{marginLeft:'auto',background:'rgba(61,214,140,.1)',border:'1px solid rgba(61,214,140,.25)',borderRadius:100,padding:'3px 12px',fontSize:11,fontWeight:700,color:'var(--green)',whiteSpace:'nowrap'}}>
              ✓ Connected
            </div>
          )}
        </div>

        {gmbMsg && (
          <div style={{background: gmbMsg.startsWith('✅')?'rgba(61,214,140,.08)':'rgba(240,119,119,.08)', border:`1px solid ${gmbMsg.startsWith('✅')?'rgba(61,214,140,.2)':'rgba(240,119,119,.2)'}`, borderRadius:8, padding:'8px 12px', fontSize:12, marginBottom:10, color: gmbMsg.startsWith('✅')?'var(--green)':'var(--red)'}}>
            {gmbMsg}
          </div>
        )}

        {gmbStatus?.connected ? (
          <div>
            <div style={{background:'var(--card2)',borderRadius:8,padding:'10px 12px',fontSize:12,marginBottom:10}}>
              <div style={{color:'var(--muted)',marginBottom:4}}>Connected since</div>
              <div style={{fontWeight:700}}>{gmbStatus.connected_at ? new Date(gmbStatus.connected_at).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '—'}</div>
            </div>
            <div style={{background:'rgba(61,214,140,.05)',border:'1px solid rgba(61,214,140,.15)',borderRadius:8,padding:'10px 12px',fontSize:12,marginBottom:10,lineHeight:1.8}}>
              <div style={{fontWeight:700,color:'var(--green)',marginBottom:4}}>⚡ Instant verification active</div>
              When a customer posts a review on Google Maps, we detect it within 60 seconds and issue the reward automatically — no polling, no delays, 100% accurate.
            </div>
            <button className="btn" style={{fontSize:12,padding:'8px 14px'}} onClick={disconnectGMB}>
              Disconnect Google Business
            </button>
          </div>
        ) : (
          <div>
            <div style={{background:'var(--card2)',borderRadius:8,padding:'10px 12px',fontSize:12,marginBottom:12,lineHeight:1.8}}>
              <div style={{marginBottom:4}}>Without connection:</div>
              <div style={{color:'var(--muted)'}}>→ Review detected after 5–30 min (Google cache)</div>
              <div style={{color:'var(--muted)'}}>→ May miss reviews posted after session expires</div>
              <div style={{marginTop:6}}>After connecting:</div>
              <div style={{color:'var(--green)'}}>→ Review detected in ~60 seconds</div>
              <div style={{color:'var(--green)'}}>→ 100% accurate — matched by Google account name</div>
              <div style={{color:'var(--green)'}}>→ No trust required, fully automated</div>
            </div>
            <button className="btn primary" disabled={gmbLoading} onClick={connectGMB}
              style={{display:'flex',alignItems:'center',gap:8,justifyContent:'center'}}>
              {gmbLoading ? 'Redirecting...' : '🔗 Connect Google Business Account'}
            </button>
            <div style={{fontSize:11,color:'var(--muted)',marginTop:8,textAlign:'center'}}>
              The brand owner signs in with their Google Business account — takes 30 seconds, done once.
            </div>
          </div>
        )}
      </div>

      {/* ── Reward Settings ── */}
      <div className="card-box" style={{maxWidth:500}}>
        <div style={{fontWeight:800,fontSize:14,marginBottom:4}}>Reward Settings</div>
        <div style={{fontSize:12,color:'var(--muted)',marginBottom:20}}>These appear on the customer QR scan page</div>
        <div className="form-row"><label className="label">Reward Offer</label><input className="input" value={f.reward_offer} onChange={e=>setF(p=>({...p,reward_offer:e.target.value}))}/></div>
        <div className="form-row"><label className="label">Min. Order (₹)</label><input className="input" type="number" value={f.reward_min_order} onChange={e=>setF(p=>({...p,reward_min_order:parseInt(e.target.value)||0}))}/></div>
        <div className="form-row"><label className="label">Coupon Valid (days)</label><input className="input" type="number" value={f.coupon_validity_days} onChange={e=>setF(p=>({...p,coupon_validity_days:parseInt(e.target.value)||7}))}/></div>
        <button className="btn primary" onClick={save}>{saved?'✓ Saved!':'Save Changes'}</button>
      </div>
    </div>
  )
}
