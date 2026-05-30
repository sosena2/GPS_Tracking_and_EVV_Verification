import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  MapPinned,
  ShieldCheck,
  Smartphone,
  Stethoscope,
  TimerReset,
  Users,
} from 'lucide-react'
import useAuth from '../hooks/useAuth'
import useTheme from '../hooks/useTheme'
import ThemeToggle from '../components/ui/ThemeToggle'

const features = [
  {
    icon: MapPinned,
    title: 'GPS-verified visits',
    description: 'Track check-in and check-out with location-aware verification designed to reduce fraud.',
  },
  {
    icon: CalendarCheck2,
    title: 'Live scheduling',
    description: 'Assign clients to caregivers and keep every visit visible from a single dashboard.',
  },
  {
    icon: ShieldCheck,
    title: 'Audit-ready records',
    description: 'Every action is logged so admins can review activity and resolve alerts quickly.',
  },
  {
    icon: Smartphone,
    title: 'Mobile-friendly workflow',
    description: 'Caregivers can check in and out from the field without a heavy training curve.',
  },
]

const steps = [
  {
    title: 'Create people and visits',
    description: 'Admins add clients, caregivers, and schedules from one clean workspace.',
  },
  {
    title: 'Check in from the field',
    description: 'Caregivers use GPS-enabled check-in to confirm they are at the right location.',
  },
  {
    title: 'Review outcomes instantly',
    description: 'Dashboards and alerts show what is active, completed, or suspicious in real time.',
  },
]

export default function Landing() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { theme } = useTheme()
  const isLight = theme === 'light'

  const ctaPath = useMemo(() => {
    if (!user) return '/login'
    return user.role === 'admin' ? '/admin/dashboard' : '/caregiver/dashboard'
  }, [user])

  const stats = [
    { value: '100%', label: 'Visit visibility' },
    { value: 'GPS', label: 'Geofence check-in' },
    { value: '24/7', label: 'Activity tracking' },
  ]

  const pageBg = isLight
    ? 'bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.18),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.14),_transparent_24%),linear-gradient(180deg,_#f8fafc,_#eef2ff_56%,_#ffffff)] text-slate-900'
    : 'bg-slate-950 text-white'

  const outerGlow = isLight
    ? 'absolute inset-0 opacity-70 [background-image:radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.10),transparent_28%),radial-gradient(circle_at_80%_15%,rgba(16,185,129,0.08),transparent_24%),linear-gradient(rgba(15,23,42,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.02)_1px,transparent_1px)] [background-size:100%_100%,100%_100%,42px_42px,42px_42px]'
    : 'absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.30),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.22),_transparent_26%),linear-gradient(180deg,_rgba(15,23,42,1),_rgba(2,6,23,1))]'

  const glassPanel = isLight
    ? 'border-slate-200/80 bg-white/85 text-slate-900 shadow-xl shadow-slate-900/5 backdrop-blur-xl'
    : 'border-white/12 bg-white/10 text-white shadow-2xl shadow-slate-950/40 backdrop-blur-xl'

  const innerCard = isLight
    ? 'border-slate-200 bg-white/90 text-slate-900'
    : 'border-white/10 bg-slate-950/70 text-white'

  const textSoft = isLight ? 'text-slate-600' : 'text-white/65'
  const textMuted = isLight ? 'text-slate-500' : 'text-white/55'
  const chipClass = isLight
    ? 'border-slate-200 bg-white/80 text-slate-700 shadow-sm shadow-slate-900/5'
    : 'border-white/10 bg-white/5 text-white/80'

  return (
    <div className={`relative min-h-screen overflow-hidden transition-colors duration-300 ${pageBg}`}>
      <div className={outerGlow} />

      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-600 shadow-lg shadow-primary-600/25 text-white">
            <MapPinned size={22} />
          </div>
          <div>
            <p className={`text-sm font-semibold tracking-[0.2em] uppercase ${isLight ? 'text-slate-900/80' : 'text-white/80'}`}>EVV System</p>
            <p className={`text-xs ${textMuted}`}>Electronic Visit Verification</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle className={isLight ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50' : 'border-white/10 bg-white/10 text-white hover:bg-white/15'} />
          <button
            onClick={() => navigate('/login')}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium backdrop-blur transition ${isLight ? 'border border-slate-200 bg-white text-slate-700 shadow-sm shadow-slate-900/5 hover:bg-slate-50' : 'border border-white/10 bg-white/10 text-white/90 hover:bg-white/15'}`}
          >
            Sign in
          </button>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid w-full max-w-7xl gap-16 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:pb-24 lg:pt-16">
        <section className="space-y-8">
          <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm backdrop-blur ${chipClass}`}>
            <CheckCircle2 size={16} className="text-emerald-300" />
            Built for caregivers, admins, and audit-ready visit tracking
          </div>

          <div className="space-y-5 max-w-3xl">
            <h1 className={`text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl ${isLight ? 'text-slate-950' : 'text-white'}`}>
              Smarter home care with GPS-backed visit verification.
            </h1>
            <p className={`max-w-2xl text-lg leading-8 sm:text-xl ${textSoft}`}>
              Monitor schedules, verify visits at the right place and time, and keep every caregiver action visible in one calm, modern workspace.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className={`rounded-2xl p-5 backdrop-blur ${glassPanel}`}>
                <p className={`text-2xl font-bold ${isLight ? 'text-slate-950' : 'text-white'}`}>{stat.value}</p>
                <p className={`mt-1 text-sm ${textSoft}`}>{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="relative">
          <div className="absolute -left-10 top-10 h-36 w-36 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="absolute right-6 top-24 h-40 w-40 rounded-full bg-primary-500/20 blur-3xl" />

          <div className="relative rounded-3xl overflow-hidden">
            <img
              src="https://media.istockphoto.com/id/1490660270/photo/caregiver-help-and-care-asian-senior-or-elderly-old-lady-woman-patient-sitting-on-wheelchair.jpg?b=1&s=612x612&w=0&k=20&c=MAbJUPXkMWmynJtSkPvwMyxG-Wh44mRtAn72-aFijxA="
              alt="Elderly person receiving care from a caregiver"
              className="h-135 w-full object-cover"
            />
          </div>
        </section>
      </main>

      <section className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, description }) => (
            <article key={title} className={`rounded-3xl p-6 backdrop-blur transition hover:-translate-y-0.5 ${glassPanel} ${isLight ? 'hover:bg-white' : 'hover:bg-white/12'}`}>
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${isLight ? 'bg-primary-50 text-primary-600' : 'bg-primary-600/15 text-primary-200'}`}>
                <Icon size={22} />
              </div>
              <h3 className={`text-lg font-semibold ${isLight ? 'text-slate-950' : 'text-white'}`}>{title}</h3>
              <p className={`mt-2 text-sm leading-6 ${textSoft}`}>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className={`rounded-4xl p-8 backdrop-blur ${glassPanel}`}>
            <p className={`text-sm font-semibold uppercase tracking-[0.24em] ${textMuted}`}>How it works</p>
            <h2 className={`mt-3 text-3xl font-bold ${isLight ? 'text-slate-950' : 'text-white'}`}>From setup to verified visits in three steps.</h2>
            <p className={`mt-4 text-sm leading-7 ${textSoft}`}>
              The flow is simple enough for field teams, but structured enough for admin oversight and compliance.
            </p>
            <button
              onClick={() => navigate(ctaPath)}
              className={`mt-6 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition ${isLight ? 'bg-slate-950 text-white! hover:bg-slate-800' : 'bg-white text-slate-950 hover:bg-slate-100'}`}
            >
              {user ? 'Go to my dashboard' : 'Start now'}
              <ArrowRight size={16} />
            </button>
          </div>

          <div className="grid gap-4">
            {steps.map((step, index) => (
              <div key={step.title} className={`flex gap-4 rounded-2xl p-5 backdrop-blur ${glassPanel}`}>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-600 text-sm font-bold text-white">
                  0{index + 1}
                </div>
                <div>
                  <h3 className={`text-lg font-semibold ${isLight ? 'text-slate-950' : 'text-white'}`}>{step.title}</h3>
                  <p className={`mt-2 text-sm leading-6 ${textSoft}`}>{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}