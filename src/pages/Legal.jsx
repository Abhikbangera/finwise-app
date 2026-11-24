import { Link } from 'react-router-dom'

// Privacy Policy and Terms of Use. Plain-English drafts: have them reviewed by a lawyer
// before promoting FinWise. Update UPDATED and the text whenever what FinWise does changes.
const UPDATED = '24 November 2026'
const EMAIL = 'hello.finwiseapp@gmail.com'
const Mail = () => <a className="font-black text-rain underline" href={`mailto:${EMAIL}`}>{EMAIL}</a>

function Shell({ title, other, children }) {
  return (
    <div className="min-h-screen bg-cloud px-4 py-10">
      <article className="card mx-auto max-w-3xl space-y-5 p-6 leading-relaxed sm:p-10 [&_h2]:pt-3 [&_h2]:text-2xl [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">
        <Link to="/" className="text-3xl font-black tracking-tighter">FinWise</Link>
        <h1 className="text-4xl sm:text-5xl">{title}</h1>
        <p className="text-slate-500">Last updated: {UPDATED}</p>
        {children}
        <p className="border-t pt-5 text-slate-500">
          See also our <Link className="font-black text-rain underline" to={other.to}>{other.label}</Link>. Questions: <Mail />
        </p>
      </article>
    </div>
  )
}

export function Privacy() {
  return (
    <Shell title="Privacy Policy" other={{ to: '/terms', label: 'Terms of Use' }}>
      <p>FinWise is a personal budgeting app run from Chennai, India. This policy explains what we collect, why, who helps us run the service, and the choices you have. We follow India's Digital Personal Data Protection Act, 2023. In that law's words, we are the "Data Fiduciary" for your data.</p>

      <h2>What we collect</h2>
      <ul>
        <li><b>Account details:</b> your name, email address and password. Your password is stored only in scrambled (hashed) form, and we cannot read it.</li>
        <li><b>Budget settings:</b> your monthly income, your Needs / Wants / Savings split and your currency.</li>
        <li><b>Money records you add:</b> transactions (date, amount, category, and a description of up to 200 characters), bank accounts you register (a name, bank name, account type, balance and only the <b>last 4 digits</b> of the account number), budgets and limits, savings goals, alerts and exception requests.</li>
        <li><b>Usage records:</b> how many AI assistant questions you ask each day, so we can apply the daily limit, and the history of statement imports.</li>
        <li><b>Technical data:</b> our hosting providers keep standard server logs such as IP address, browser type and time of visit, for security and to fix faults.</li>
      </ul>

      <h2>What we never collect</h2>
      <ul>
        <li>Your net-banking username or password, card numbers, CVV, UPI PIN or OTPs.</li>
        <li>Your bank statement files and their passwords. When you import a CSV or PDF statement, it is read <b>inside your own browser</b>. Only the transactions you choose to import are saved, and the file and its password never leave your device.</li>
      </ul>

      <h2>Why we use it</h2>
      <ul>
        <li>To run FinWise for you: your dashboard, budgets, budget locks, goals, alerts and insights.</li>
        <li>To send account emails such as sign-up confirmation and password reset. We do not send marketing emails.</li>
        <li>To answer your questions in the AI assistant (see below).</li>
        <li>To keep the service secure and fix problems.</li>
      </ul>
      <p>We use your data only because you asked us to provide this service, which is your consent. We do <b>not</b> sell your data, show you ads, or share it for anyone else's marketing.</p>

      <h2>The AI assistant</h2>
      <p>When you ask the assistant a question, FinWise sends Google's Gemini AI service your question, your recent chat messages and a <b>summary</b> of the month: totals, category names and amounts, budget limits and savings goal names. It does <b>not</b> send your name, email, bank account details or transaction descriptions. We use Google's free tier, under which Google may keep and review this content to improve its services. So please don't type personal details such as account numbers into your questions. Chats are not saved by FinWise, and AI answers can be wrong.</p>

      <h2>Who helps us run FinWise</h2>
      <p>These companies process data for us, only to provide the service:</p>
      <ul>
        <li><b>Supabase:</b> our database, logins and server code. Your data is stored on its servers in the Asia-Pacific region, outside India, encrypted in transit and at rest.</li>
        <li><b>Vercel:</b> hosts the website.</li>
        <li><b>Brevo:</b> sends account emails, so it receives your email address.</li>
        <li><b>Google:</b> Gemini for the AI assistant (above), and Google Fonts, which supplies the website's font and so sees your IP address.</li>
      </ul>
      <p>We may also disclose data if Indian law or a lawful order requires it.</p>

      <h2>How your data is protected</h2>
      <p>Every connection is encrypted (HTTPS). Database rules ensure each account can only read and change its own data. Secret keys stay on our servers, never in the app in your browser. No system is perfectly secure, though. If a breach affects your data, we will tell you and the Data Protection Board of India as the law requires.</p>

      <h2>How long we keep it</h2>
      <p>We keep your data while your account is open. If you ask us to delete your account, we delete your account and all its financial records within 30 days, unless the law requires us to keep something longer. Server logs held by our providers expire on their own schedules.</p>

      <h2>Your rights</h2>
      <ul>
        <li><b>Access and correct:</b> you can see and edit most of your data in the app, and ask us for a summary of what we hold.</li>
        <li><b>Delete:</b> email us from your account's email address and we will delete your account and data.</li>
        <li><b>Withdraw consent:</b> you can stop using FinWise and ask for deletion at any time.</li>
        <li><b>Nominate:</b> you can name someone to exercise these rights if you die or cannot act yourself.</li>
        <li><b>Complain:</b> contact us first (below). If you are not satisfied, you may complain to the Data Protection Board of India.</li>
      </ul>

      <h2>Age</h2>
      <p>FinWise is for adults aged 18 or over. If you believe a child has created an account, contact us and we will delete it.</p>

      <h2>Contact and grievances</h2>
      <p>For privacy questions, requests or complaints, email <Mail />. We aim to reply within 7 days and to resolve complaints within 30 days.</p>

      <h2>Changes</h2>
      <p>If we change this policy, we will update the date above, and for important changes we will tell you by email or in the app.</p>
    </Shell>
  )
}

export function Terms() {
  return (
    <Shell title="Terms of Use" other={{ to: '/privacy', label: 'Privacy Policy' }}>
      <p>These terms are an agreement between you and FinWise, run from Chennai, India. By creating an account or using FinWise, you agree to them and to our <Link className="font-black text-rain underline" to="/privacy">Privacy Policy</Link>.</p>

      <h2>What FinWise is</h2>
      <p>FinWise is a budgeting tool. It splits your income into budgets, records spending you add or import, warns you about limits, and offers AI-generated suggestions. It is free to use.</p>

      <h2>What FinWise is not</h2>
      <ul>
        <li><b>Not financial advice.</b> FinWise and its AI assistant give general budgeting information only. We are not a bank, a registered investment adviser, or a tax or legal adviser. Speak to a qualified professional before major financial decisions.</li>
        <li><b>Not connected to your bank.</b> FinWise does not move money or connect to your bank account. Budget Locking only stops new entries in FinWise. It cannot block a real payment from your bank, card or UPI app.</li>
        <li><b>Not always right.</b> Figures depend on what you enter or import, and statement import or AI answers can make mistakes. Check important numbers against your bank statements.</li>
      </ul>

      <h2>Your account</h2>
      <ul>
        <li>You must be 18 or over and give a real email address.</li>
        <li>Keep your password private. You are responsible for activity on your account.</li>
        <li>Only upload statements and data that belong to you or that you have permission to use.</li>
      </ul>

      <h2>Fair use</h2>
      <p>Do not misuse FinWise. That means no attempts to access other people's data, no attacks on or overloading of the service, no automated scraping, and no use for anything illegal. The AI assistant has a daily question limit.</p>

      <h2>Our service</h2>
      <p>FinWise is provided "as is". We work to keep it running and accurate, but we do not guarantee it will be uninterrupted or error-free. We may change, pause or stop features, and we will try to give notice of major changes. We may suspend accounts that break these terms.</p>

      <h2>Limit of responsibility</h2>
      <p>As far as Indian law allows, FinWise is not responsible for financial losses or decisions you make based on the app or its AI suggestions, or for losses caused by events outside our reasonable control. Nothing in these terms removes rights you have under Indian consumer law.</p>

      <h2>Ending your use</h2>
      <p>You can stop using FinWise at any time and ask us to delete your account at <Mail />.</p>

      <h2>Law and disputes</h2>
      <p>These terms are governed by the laws of India. Please contact us first so we can try to resolve any problem. Otherwise, disputes go to the courts in Chennai, Tamil Nadu.</p>

      <h2>Changes</h2>
      <p>If we update these terms, we will change the date above and tell you about important changes. Continuing to use FinWise after that means you accept them.</p>
    </Shell>
  )
}
