import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  BarChart3,
  CalendarClock,
  Check,
  ChevronDown,
  Copy,
  Earth,
  Image,
  MapPin,
  Smile,
} from 'lucide-react'

import { PointAt, PointAtHover, promoteHand } from '@/components/ui/point-at'
import { cn } from '@/lib/utils'

const hand = { ...promoteHand, src: `${import.meta.env.BASE_URL}hand.webp` }

const REGISTRY = 'https://zahlekhan.github.io/point-at/r/point-at.json'
const STORY = 'https://techcrunch.com/2026/10/26/x-is-nudging-users-to-promote-their-posts-with-a-pointing-hand-and-people-are-confused/'

// What the composer types on its own. The hand arrives mid-sentence.
const DRAFT = 'is it just me or is there a giant arm in the composer'
const SCARE_AT = 22

const install = `npx shadcn@latest add ${REGISTRY}`

const usage = `import { PointAt, PointAtHover, promoteHand } from "@/components/ui/point-at"

<PointAt {...promoteHand} open={open} onOpenChange={setOpen}>
  <Button>Promote</Button>
</PointAt>

// or point at whatever button is hovered
<PointAtHover {...promoteHand}>
  <App />
</PointAtHover>`

export default function App() {
  const [heroOpen, setHeroOpen] = useState(false)
  const [finaleOpen, setFinaleOpen] = useState(false)

  return (
    <PointAtHover {...hand} disabled={heroOpen || finaleOpen}>
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5 text-[15px]">
        <span className="font-bold">point-at</span>
        <a href="https://github.com/zahlekhan/point-at" className="text-[#71767b] hover:text-[#e7e9ea]">
          GitHub
        </a>
      </header>

      <section className="flex min-h-[calc(100svh-68px)] flex-col items-center justify-center px-4 pb-16">
        <Composer open={heroOpen} onOpenChange={setHeroOpen} />
        <p className="mt-8 max-w-[600px] text-center text-[15px] leading-relaxed text-[#71767b] text-balance">
          In October 2026, X started pointing a giant hand at the Promote button.{' '}
          <a href={STORY} className="text-[#e7e9ea] underline decoration-[#536471] underline-offset-4">
            People hated it
          </a>
          . It's now a shadcn component. Hover any button.
        </p>
      </section>

      <section className="mx-auto max-w-[600px] px-4 py-24">
        <Code code={install} />
        <Code code={usage} className="mt-3" />
      </section>

      <Finale open={finaleOpen} onOpenChange={setFinaleOpen} />

      <footer className="px-6 py-10 text-center text-[13px] text-[#71767b]">
        A parody. Not affiliated with X. The hand is AI-generated.
      </footer>
    </PointAtHover>
  )
}

/** A faithful-ish X composer that types by itself until the hand shows up. */
function Composer({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [draft, setDraft] = useState('')
  const [autotype, setAutotype] = useState(true)

  useEffect(() => {
    if (!autotype || draft.length >= DRAFT.length) return
    const wait = draft.length === 0 ? 900 : 45 + Math.random() * 70
    const t = window.setTimeout(() => {
      const next = DRAFT.slice(0, draft.length + 1)
      if (next.length === SCARE_AT) onOpenChange(true)
      setDraft(next)
    }, wait)
    return () => window.clearTimeout(t)
  }, [draft, autotype, onOpenChange])

  const stopAutotype = () => setAutotype(false)

  return (
    <div className="w-full max-w-[600px] rounded-2xl border border-[#2f3336]">
      <div className="flex items-center justify-between px-4 pt-3">
        <button
          className="rounded-full px-1 text-[15px] hover:underline"
          onClick={() => {
            stopAutotype()
            setDraft('')
          }}
        >
          Cancel
        </button>
        <div className="flex items-center gap-4">
          <PointAt {...hand} open={open} onOpenChange={onOpenChange}>
            <button className="text-[15px] font-bold text-[#71767b] hover:text-[#e7e9ea]">Promote</button>
          </PointAt>
          <button
            disabled={!draft}
            className="rounded-full bg-[#1d9bf0] px-4 py-1.5 text-[15px] font-bold text-white disabled:opacity-50"
            onClick={() => {
              stopAutotype()
              setDraft('')
            }}
          >
            Post
          </button>
        </div>
      </div>

      <div className="flex gap-3 px-4 pt-4">
        <div className="size-10 shrink-0 rounded-full bg-gradient-to-br from-[#536471] to-[#2f3336]" />
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1 rounded-full border border-[#536471] px-3 py-0.5 text-sm font-bold text-[#1d9bf0]">
            Everyone <ChevronDown className="size-4" />
          </span>
          <textarea
            autoFocus
            value={draft}
            onPointerDown={stopAutotype}
            onKeyDown={stopAutotype}
            onChange={(e) => {
              const next = e.target.value
              if (!draft && next) onOpenChange(true)
              setDraft(next)
            }}
            placeholder="What's happening?"
            className="mt-3 h-32 w-full resize-none bg-transparent text-xl outline-none placeholder:text-[#71767b]"
          />
        </div>
      </div>

      <div className="mx-4 flex items-center gap-1 border-b border-[#2f3336] pb-3 pl-[52px] text-sm font-bold text-[#1d9bf0]">
        <Earth className="size-4" /> Everyone can reply
      </div>

      <div className="flex items-center gap-0.5 px-3 py-2 pl-[60px] text-[#1d9bf0]">
        {[Image, BarChart3, Smile, CalendarClock, MapPin].map((Icon, i) => (
          <button key={i} aria-label="Attach" className="grid size-[34px] place-items-center rounded-full hover:bg-[#1d9bf0]/10">
            <Icon className="size-[18px]" />
          </button>
        ))}
      </div>
    </div>
  )
}

/** Hands from every direction, all pointing at one button. */
function Finale({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const sectionRef = useRef<HTMLElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const [anchors, setAnchors] = useState<Element[]>([])

  useLayoutEffect(() => {
    setAnchors(Array.from(ringRef.current?.querySelectorAll('[data-anchor]') ?? []))
  }, [])

  // Arrive when the finale scrolls into view, leave when it scrolls out.
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => onOpenChange(entry.isIntersecting), {
      threshold: 0.6,
    })
    io.observe(el)
    return () => io.disconnect()
  }, [onOpenChange])

  return (
    <section ref={sectionRef} className="flex min-h-svh flex-col items-center justify-center px-4">
      {/* Text sits above the hands so it stays readable. */}
      <h2 className="relative z-[60] text-center text-3xl font-bold tracking-tight [text-shadow:0_2px_16px_#000]">
        Have you considered following?
      </h2>
      <div ref={ringRef} className="relative mt-16">
        <a
          href="https://x.com/zahlekhan"
          target="_blank"
          rel="noreferrer"
          className="block rounded-full bg-[#eff3f4] px-8 py-3 text-lg font-bold text-black hover:bg-[#d7dbdc]"
        >
          Follow @zahlekhan
        </a>
        {finaleHands.map((h) => (
          <span
            key={h.deg}
            data-anchor
            aria-hidden
            className="pointer-events-none absolute size-px"
            style={{
              left: `${50 + 50 * Math.cos((h.deg * Math.PI) / 180)}%`,
              top: `${50 + 50 * Math.sin((h.deg * Math.PI) / 180)}%`,
            }}
          />
        ))}
      </div>
      {finaleHands.map((h, i) => (
        <PointAt
          key={h.deg}
          {...hand}
          target={anchors[i] ?? null}
          angle={h.angle}
          delay={h.delay}
          open={open}
          onOpenChange={onOpenChange}
        />
      ))}
      <button
        onClick={() => onOpenChange(true)}
        className={cn(
          'relative z-[60] mt-16 text-sm text-[#71767b] transition-opacity hover:text-[#e7e9ea]',
          open && 'pointer-events-none opacity-0',
        )}
      >
        Again
      </button>
    </section>
  )
}

// One hand per compass point around the button, each arm pointing outward.
const ARM_DIRECTION = 90 + hand.armAngle
const finaleHands = [0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => ({
  deg,
  angle: deg - ARM_DIRECTION,
  delay: [0, 520, 160, 680, 300, 80, 440, 240][i],
}))

function Code({ code, className }: { code: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className={cn('relative rounded-2xl border border-[#2f3336] p-4', className)}>
      <button
        aria-label="Copy"
        className="absolute top-3 right-3 grid size-8 place-items-center rounded-full text-[#71767b] hover:bg-white/5 hover:text-[#e7e9ea]"
        onClick={() => {
          navigator.clipboard.writeText(code)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }}
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      </button>
      <pre className="overflow-x-auto pr-10 font-mono text-[13px] leading-relaxed text-[#e7e9ea]">
        <code>{code}</code>
      </pre>
    </div>
  )
}
