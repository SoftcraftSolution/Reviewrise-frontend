export default function PrivacyPolicy() {
  const S = `
    @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,700;12..96,800&family=Fraunces:opsz,wght@9..144,700;9..144,900&display=swap');
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#07090E;color:#EDE9E2;font-family:'Bricolage Grotesque',sans-serif;line-height:1.8}
    .wrap{max-width:780px;margin:0 auto;padding:48px 24px 80px}
    .logo{display:flex;align-items:center;gap:10px;margin-bottom:48px}
    .logo-mark{width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#b87a20,#E9B84A);display:flex;align-items:center;justify-content:center;font-size:18px}
    .logo-text{font-size:18px;font-weight:800;letter-spacing:-.02em}
    h1{font-family:'Fraunces',serif;font-size:36px;font-weight:900;margin-bottom:8px;line-height:1.2}
    .meta{font-size:13px;color:rgba(237,233,226,.4);margin-bottom:48px;padding-bottom:24px;border-bottom:1px solid rgba(255,255,255,.06)}
    h2{font-size:18px;font-weight:800;margin:36px 0 12px;color:#E9B84A}
    p{font-size:14px;color:rgba(237,233,226,.75);margin-bottom:14px}
    ul{margin:0 0 14px 20px}
    li{font-size:14px;color:rgba(237,233,226,.75);margin-bottom:6px}
    .highlight{background:rgba(233,184,74,.06);border:1px solid rgba(233,184,74,.15);border-radius:10px;padding:16px 20px;margin:20px 0}
    .highlight p{margin:0;color:rgba(237,233,226,.85)}
    a{color:#E9B84A;text-decoration:none}
    a:hover{text-decoration:underline}
    .contact-box{background:#0C1018;border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:24px;margin-top:40px}
    .contact-box h2{margin-top:0}
    .footer{margin-top:60px;padding-top:24px;border-top:1px solid rgba(255,255,255,.06);font-size:12px;color:rgba(237,233,226,.25);text-align:center}
    .toc{background:#0C1018;border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:20px 24px;margin-bottom:36px}
    .toc-title{font-size:12px;font-weight:700;color:rgba(237,233,226,.4);text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px}
    .toc a{display:block;font-size:13px;color:rgba(237,233,226,.6);padding:3px 0;transition:color .15s}
    .toc a:hover{color:#E9B84A;text-decoration:none}
    .divider{height:1px;background:rgba(255,255,255,.06);margin:32px 0}
  `

  const updated = 'March 16, 2026'

  return (
    <>
      <style>{S}</style>
      <div className="wrap">

        {/* Logo */}
        <div className="logo">
          <div className="logo-mark">⭐</div>
          <div className="logo-text">ReviewRise</div>
        </div>

        {/* Title */}
        <h1>Privacy Policy</h1>
        <div className="meta">
          Last updated: {updated} &nbsp;·&nbsp; SoftCraft Solutions &nbsp;·&nbsp;
          <a href="mailto:Solutionssoftcraft@gmail.com">Solutionssoftcraft@gmail.com</a>
        </div>

        {/* Table of Contents */}
        <div className="toc">
          <div className="toc-title">Contents</div>
          <a href="#overview">1. Overview</a>
          <a href="#data-collected">2. Information we collect</a>
          <a href="#google-data">3. Google account & Business Profile data</a>
          <a href="#how-we-use">4. How we use your information</a>
          <a href="#data-sharing">5. Data sharing</a>
          <a href="#data-retention">6. Data retention</a>
          <a href="#user-rights">7. Your rights</a>
          <a href="#security">8. Security</a>
          <a href="#children">9. Children's privacy</a>
          <a href="#changes">10. Changes to this policy</a>
          <a href="#contact">11. Contact us</a>
        </div>

        {/* 1. Overview */}
        <h2 id="overview">1. Overview</h2>
        <p>
          ReviewRise is a platform operated by SoftCraft Solutions that helps restaurants and local
          businesses collect genuine Google reviews by rewarding customers with discount coupons.
          This Privacy Policy explains how we collect, use, and protect your personal information
          when you use our services at <a href="https://reviewrise-frontend.vercel.app">reviewrise-frontend.vercel.app</a>.
        </p>
        <div className="highlight">
          <p>
            <strong style={{color:'#E9B84A'}}>Summary:</strong> We collect only what is necessary
            to verify your Google review and issue your reward. We never sell your data.
            We never post on your behalf. We only read your reviews — we cannot create,
            edit, or delete them.
          </p>
        </div>

        <div className="divider"/>

        {/* 2. Data collected */}
        <h2 id="data-collected">2. Information we collect</h2>
        <p>We collect the following categories of information:</p>

        <p><strong style={{color:'rgba(237,233,226,.9)'}}>From customers (reviewers):</strong></p>
        <ul>
          <li>Google account name and email address (via Google Sign-In)</li>
          <li>Google profile avatar URL</li>
          <li>Star rating you select in our app (1–5 stars)</li>
          <li>Review text you optionally type in our app</li>
          <li>Coupon codes issued and their redemption status</li>
          <li>Points balance</li>
          <li>Optional profile details: phone number, date of birth, address (only if you add them)</li>
        </ul>

        <p><strong style={{color:'rgba(237,233,226,.9)'}}>From brand owners (business accounts):</strong></p>
        <ul>
          <li>Business name, location, and category</li>
          <li>Google Business Profile account ID and location ID (via OAuth authorization)</li>
          <li>OAuth access token and refresh token for Google Business Profile API</li>
          <li>Review data fetched from your Google Business Profile listing</li>
        </ul>

        <p><strong style={{color:'rgba(237,233,226,.9)'}}>Automatically collected:</strong></p>
        <ul>
          <li>QR code scan timestamps and brand associations</li>
          <li>Session data for review verification (created at, expires at, status)</li>
          <li>IP address and basic request logs (via Railway platform)</li>
        </ul>

        <div className="divider"/>

        {/* 3. Google data */}
        <h2 id="google-data">3. Google account & Business Profile data</h2>

        <p><strong style={{color:'rgba(237,233,226,.9)'}}>For customers:</strong></p>
        <p>
          When you sign in with Google, we receive your name, email address, and profile picture
          via Google OAuth. This is used solely to identify you within ReviewRise and to match
          your Google account to the review you post on Google Maps. We do not access your
          Gmail, Google Drive, Google Calendar, or any other Google service.
        </p>

        <p><strong style={{color:'rgba(237,233,226,.9)'}}>For brand owners — Google Business Profile API:</strong></p>
        <p>
          When a brand owner connects their Google Business Profile, we request access using
          the scope <code style={{background:'rgba(255,255,255,.06)',padding:'2px 6px',borderRadius:4,fontSize:12}}>https://www.googleapis.com/auth/business.manage</code>.
          This allows us to:
        </p>
        <ul>
          <li><strong>Read</strong> reviews posted on your Google Business listing</li>
          <li><strong>Register</strong> for push notifications when new reviews are posted</li>
          <li><strong>Read</strong> your business account ID and location ID</li>
        </ul>

        <div className="highlight">
          <p>
            <strong style={{color:'#E9B84A'}}>We do NOT:</strong> post reviews on your behalf,
            respond to reviews, edit your business information, manage your Google Ads,
            access your Google Analytics, or perform any write operations on your Google
            Business listing. Our access is strictly read-only for reviews.
          </p>
        </div>

        <p>
          OAuth tokens are stored securely in our database and used only to fetch review
          data for verification purposes. You can revoke access at any time by disconnecting
          from the Settings page in your brand dashboard, or by visiting
          <a href="https://myaccount.google.com/permissions"> Google Account Permissions</a>.
        </p>

        <div className="divider"/>

        {/* 4. How we use */}
        <h2 id="how-we-use">4. How we use your information</h2>
        <ul>
          <li><strong>Review verification:</strong> Matching your Google account name to the review posted on Google Maps to confirm it was genuinely posted</li>
          <li><strong>Reward issuance:</strong> Generating and delivering discount coupon codes upon successful review verification</li>
          <li><strong>Points system:</strong> Tracking earned points and processing redemptions</li>
          <li><strong>Brand analytics:</strong> Providing brand owners with aggregate review counts, ratings, and coupon redemption statistics</li>
          <li><strong>Fraud prevention:</strong> Ensuring each user can only earn one reward per brand</li>
          <li><strong>Service improvement:</strong> Debugging and improving the platform</li>
        </ul>

        <div className="divider"/>

        {/* 5. Data sharing */}
        <h2 id="data-sharing">5. Data sharing</h2>
        <p>We do not sell, rent, or trade your personal information. We share data only as follows:</p>
        <ul>
          <li>
            <strong>With brand owners:</strong> When you verify a review for a brand, that brand's
            dashboard shows your display name, email address, star rating, review text, and
            coupon status. This is necessary for the brand to understand which customers
            gave reviews through ReviewRise.
          </li>
          <li>
            <strong>With our infrastructure providers:</strong> We use Railway (backend hosting),
            Vercel (frontend hosting), and Neon/Supabase (PostgreSQL database). These providers
            process data solely to deliver our service and are bound by their own privacy policies.
          </li>
          <li>
            <strong>With Google:</strong> We communicate with Google's APIs (Places API, Business
            Profile API, OAuth) to verify reviews and authenticate users. Google's
            <a href="https://policies.google.com/privacy"> Privacy Policy</a> governs their handling of data.
          </li>
          <li>
            <strong>Legal requirements:</strong> We may disclose information if required by law
            or to protect the rights and safety of ReviewRise, our users, or the public.
          </li>
        </ul>

        <div className="divider"/>

        {/* 6. Retention */}
        <h2 id="data-retention">6. Data retention</h2>
        <ul>
          <li>Customer accounts and review history: retained while your account is active</li>
          <li>Verification sessions: retained for 90 days, then deleted</li>
          <li>Coupon records: retained for 2 years for accounting purposes</li>
          <li>Google OAuth tokens: retained while the brand owner's account is active; deleted immediately upon disconnection</li>
          <li>You may request deletion of your account and all associated data at any time by contacting us</li>
        </ul>

        <div className="divider"/>

        {/* 7. User rights */}
        <h2 id="user-rights">7. Your rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li><strong>Access:</strong> Request a copy of all personal data we hold about you</li>
          <li><strong>Correction:</strong> Update your name, phone, address, or other profile information in the app</li>
          <li><strong>Deletion:</strong> Request deletion of your account and all associated data</li>
          <li><strong>Revoke Google access:</strong> Disconnect your Google Business Profile at any time via brand Settings, or via <a href="https://myaccount.google.com/permissions">Google Account Permissions</a></li>
          <li><strong>Portability:</strong> Request an export of your data in a machine-readable format</li>
          <li><strong>Opt out:</strong> Stop using the service at any time — we do not send marketing emails unless you opt in</li>
        </ul>
        <p>To exercise any of these rights, email us at <a href="mailto:Solutionssoftcraft@gmail.com">Solutionssoftcraft@gmail.com</a>.</p>

        <div className="divider"/>

        {/* 8. Security */}
        <h2 id="security">8. Security</h2>
        <p>
          We implement industry-standard security measures including:
        </p>
        <ul>
          <li>All data transmitted over HTTPS/TLS encryption</li>
          <li>Passwords hashed using bcrypt</li>
          <li>JWT tokens with expiry for session management</li>
          <li>OAuth tokens stored encrypted in our database</li>
          <li>Database access restricted to our backend servers only</li>
        </ul>
        <p>
          While we take reasonable precautions, no system is 100% secure. In the event of a
          data breach, we will notify affected users within 72 hours as required by applicable law.
        </p>

        <div className="divider"/>

        {/* 9. Children */}
        <h2 id="children">9. Children's privacy</h2>
        <p>
          ReviewRise is not directed at children under 13 years of age. We do not knowingly
          collect personal information from children under 13. If you believe a child has
          provided us with personal information, please contact us and we will delete it promptly.
        </p>

        <div className="divider"/>

        {/* 10. Changes */}
        <h2 id="changes">10. Changes to this policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of material
          changes by updating the "Last updated" date at the top of this page. Continued use of
          ReviewRise after changes constitutes acceptance of the updated policy.
        </p>

        <div className="divider"/>

        {/* 11. Contact */}
        <div className="contact-box" id="contact">
          <h2 style={{marginTop:0}}>11. Contact us</h2>
          <p>If you have questions about this Privacy Policy or how we handle your data:</p>
          <p>
            <strong>SoftCraft Solutions</strong><br/>
            Email: <a href="mailto:Solutionssoftcraft@gmail.com">Solutionssoftcraft@gmail.com</a><br/>
            Website: <a href="https://reviewrise-frontend.vercel.app">reviewrise-frontend.vercel.app</a><br/>
            Platform: ReviewRise — Review to Reward
          </p>
          <p style={{marginBottom:0,color:'rgba(237,233,226,.5)',fontSize:13}}>
            We aim to respond to all privacy requests within 5 business days.
          </p>
        </div>

        <div className="footer">
          © 2026 SoftCraft Solutions · ReviewRise · All rights reserved ·{' '}
          <a href="/">Back to app</a>
        </div>

      </div>
    </>
  )
}
