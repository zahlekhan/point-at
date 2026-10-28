import * as React from 'react'
import { createPortal } from 'react-dom'

import { cn } from '@/lib/utils'

type PointAtProps = {
  /** The element to point at. Ignored when `target` is set. */
  children?: React.ReactNode
  /** Point at an existing element instead of `children`. */
  target?: Element | null
  /** Slide smoothly when the target moves or changes. */
  glide?: boolean
  /** Controlled visibility. */
  open?: boolean
  /** Uncontrolled initial visibility. */
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  /** Degrees the arm is rotated. 0 points straight up, positive leans right. */
  angle?: number
  /** Hand height in px. With `src`, the rendered image width instead. */
  size?: number
  /** Optional hand image used instead of the drawn one. */
  src?: string
  /** Fingertip position inside `src`, as fractions of its width and height. */
  tip?: { x: number; y: number }
  /** Direction the arm runs in `src`, in degrees from straight down toward the left. The hand slides in along it. */
  armAngle?: number
  /** Delay before the hand jumps in, in ms. */
  delay?: number
  /** Keep tapping the target while open. */
  tap?: boolean
  /** Close on outside click or Escape. */
  dismissible?: boolean
  className?: string
}

/** The photo hand in a suit sleeve, hosted with the docs. Spread it into PointAt or PointAtHover. */
const promoteHand = {
  src: 'https://zahlekhan.github.io/point-at/hand.webp',
  tip: { x: 0.982, y: 0.002 },
  armAngle: 41.8,
  angle: 0,
  size: 930,
} satisfies Partial<PointAtProps>

// Fingertip position inside the SVG viewBox (0 0 200 520).
const VIEW_W = 200
const VIEW_H = 520
const TIP_X = 100
const TIP_Y = 8

function PointAt({
  children,
  target,
  glide = false,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  angle = 32,
  size = 420,
  src,
  tip = { x: 0.5, y: 0 },
  armAngle = 0,
  delay = 0,
  tap = true,
  dismissible = true,
  className,
}: PointAtProps) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultOpen)
  const open = openProp ?? uncontrolled
  const setOpen = React.useCallback(
    (next: boolean) => {
      if (openProp === undefined) setUncontrolled(next)
      onOpenChange?.(next)
    },
    [openProp, onOpenChange],
  )

  // Offset along the arm, away from the target.
  const rad = (armAngle * Math.PI) / 180
  const along = (d: number) => `translate(${-Math.sin(rad) * d}px, ${Math.cos(rad) * d}px)`
  const away = src ? size * 1.4 : size * 1.2

  const targetRef = React.useRef<HTMLSpanElement>(null)
  const armRef = React.useRef<HTMLDivElement>(null)
  const [point, setPoint] = React.useState<{ x: number; y: number } | null>(null)
  const [visible, setVisible] = React.useState(false)

  // Mount after `delay`, unmount after the exit animation.
  React.useEffect(() => {
    if (open) {
      let cancelled = false
      const t = window.setTimeout(async () => {
        // Decode the image first so it doesn't pop in halfway through the entrance.
        if (src) {
          const img = new Image()
          img.src = src
          await img.decode().catch(() => {})
        }
        if (!cancelled) setVisible(true)
      }, delay)
      return () => {
        cancelled = true
        window.clearTimeout(t)
      }
    }
    const arm = armRef.current
    if (!arm) return setVisible(false)
    const exit = arm.animate(
      [{ transform: along(0) }, { transform: along(away) }],
      { duration: 260, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' },
    )
    exit.onfinish = () => setVisible(false)
    return () => exit.cancel()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, delay, away, armAngle, src])

  // Track the target's center.
  React.useLayoutEffect(() => {
    if (!visible) return
    const el = target ?? targetRef.current
    if (!el) return
    const update = () => {
      const r = el.getBoundingClientRect()
      setPoint({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [visible, target])

  // Jump in, then tap.
  React.useEffect(() => {
    const arm = armRef.current
    if (!visible || !open || !point || !arm) return
    const enter = arm.animate(
      [
        { transform: along(away) },
        { transform: along(-size * 0.03), offset: 0.7 },
        { transform: along(0) },
      ],
      { duration: 380, easing: 'cubic-bezier(.2,.9,.3,1.2)', fill: 'forwards' },
    )
    let tapping: Animation | undefined
    enter.onfinish = () => {
      if (!tap) return
      tapping = arm.animate(
        [
          { transform: along(0) },
          { transform: along(size * 0.025), offset: 0.35 },
          { transform: along(0), offset: 0.6 },
          { transform: along(0) },
        ],
        { duration: 1100, iterations: Infinity, easing: 'ease-in-out' },
      )
    }
    return () => {
      enter.cancel()
      tapping?.cancel()
    }
    // Only re-run when the hand (re)appears, not on every reposition.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, open, point === null, tap, away, armAngle])

  React.useEffect(() => {
    if (!open || !dismissible) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    const onDown = () => setOpen(false)
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointerdown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointerdown', onDown)
    }
  }, [open, dismissible, setOpen])

  const width = src ? size : (size * VIEW_W) / VIEW_H

  return (
    <>
      {children !== undefined && (
        <span ref={targetRef} data-slot="point-at-target" className="inline-flex">
          {children}
        </span>
      )}
      {visible &&
        point &&
        createPortal(
          <div
            data-slot="point-at"
            aria-hidden
            className={cn('pointer-events-none fixed z-50', className)}
            style={{
              left: point.x,
              top: point.y,
              transform: `rotate(${angle}deg)`,
              transformOrigin: '0 0',
              transition: glide ? 'left 280ms cubic-bezier(.3,.9,.3,1), top 280ms cubic-bezier(.3,.9,.3,1)' : undefined,
            }}
          >
            <div ref={armRef} style={{ transform: along(away) }}>
              {src ? (
                <img
                  src={src}
                  alt=""
                  draggable={false}
                  className="absolute top-0 left-0 max-w-none select-none drop-shadow-[8px_14px_18px_rgba(0,0,0,0.45)]"
                  style={{
                    width,
                    transform: `translate(${-tip.x * 100}%, ${-tip.y * 100}%)`,
                  }}
                />
              ) : (
                <PointingHand
                  width={width}
                  height={size}
                  style={{
                    position: 'absolute',
                    left: -(TIP_X / VIEW_W) * width,
                    top: -(TIP_Y / VIEW_H) * size,
                  }}
                />
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}

type PointAtHoverProps = Omit<
  PointAtProps,
  'children' | 'target' | 'open' | 'defaultOpen' | 'onOpenChange' | 'dismissible'
> & {
  children: React.ReactNode
  /** Which hovered elements get pointed at. */
  selector?: string
  /** Grace period before the hand leaves, so moving between targets doesn't flicker. */
  closeDelay?: number
  /** Pause hover pointing, for example while another hand is already out. */
  disabled?: boolean
  className?: string
  handClassName?: string
}

/** Points at whichever matching element inside it is hovered. */
function PointAtHover({
  children,
  selector = 'button, a[href], [role="button"]',
  closeDelay = 150,
  disabled = false,
  className,
  handClassName,
  ...hand
}: PointAtHoverProps) {
  const [target, setTarget] = React.useState<Element | null>(null)
  const [open, setOpen] = React.useState(false)
  const closeTimer = React.useRef<number | undefined>(undefined)

  const show = (el: Element) => {
    // Hovers while paused don't count, or the hand would appear the moment it's re-enabled.
    if (disabled) return
    window.clearTimeout(closeTimer.current)
    setTarget(el)
    setOpen(true)
  }
  if (disabled && open) setOpen(false)
  const hide = () => {
    window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setOpen(false), closeDelay)
  }
  React.useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  return (
    <div
      data-slot="point-at-hover"
      className={className}
      onPointerOver={(e) => {
        const el = (e.target as Element).closest(selector)
        if (el && e.currentTarget.contains(el)) show(el)
        else hide()
      }}
      onPointerLeave={hide}
    >
      {children}
      <PointAt
        glide
        {...hand}
        target={target}
        open={open && !disabled}
        onOpenChange={setOpen}
        dismissible={false}
        className={handClassName}
      />
    </div>
  )
}

/** A hand in a suit sleeve, index finger up, fingertip at (100, 8). */
function PointingHand(props: React.SVGProps<SVGSVGElement>) {
  const id = React.useId().replace(/:/g, '')
  const skin = `skin-${id}`
  const skinSide = `skin-side-${id}`
  const sleeve = `sleeve-${id}`
  const shadow = `shadow-${id}`
  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} fill="none" overflow="visible" {...props}>
      <defs>
        <linearGradient id={skin} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#e9b896" />
          <stop offset=".45" stopColor="#f8d6bd" />
          <stop offset="1" stopColor="#d49a76" />
        </linearGradient>
        <linearGradient id={skinSide} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#f3c9ab" />
          <stop offset="1" stopColor="#c98a66" />
        </linearGradient>
        <linearGradient id={sleeve} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#0f1115" />
          <stop offset=".4" stopColor="#2a2e36" />
          <stop offset=".7" stopColor="#1a1d23" />
          <stop offset="1" stopColor="#08090b" />
        </linearGradient>
        <filter id={shadow} x="-80%" y="-10%" width="260%" height="320%">
          <feDropShadow dx="6" dy="10" stdDeviation="8" floodColor="#000" floodOpacity=".45" />
        </filter>
      </defs>

      <g filter={`url(#${shadow})`}>
        {/* Sleeve, long enough to run off-screen */}
        <path d="M52 322 L156 322 L260 1400 L-90 1400 Z" fill={`url(#${sleeve})`} />
        <path d="M70 340 Q92 430 66 520" stroke="#3a3f49" strokeWidth="2" opacity=".6" />
        <path d="M150 340 Q160 420 176 520" stroke="#000" strokeWidth="3" opacity=".5" />

        {/* Shirt cuff */}
        <path d="M58 296 L150 296 L156 326 L52 326 Z" fill="#f4f4f2" />
        <path d="M58 296 L150 296 L151 302 L57 302 Z" fill="#d9d9d4" />
        <circle cx="138" cy="312" r="3" fill="#bdbdb6" />

        {/* Wrist */}
        <path d="M64 250 Q60 280 62 298 L146 298 Q152 272 150 246 Z" fill={`url(#${skin})`} />

        {/* Curled fingers / back of hand */}
        <path
          d="M74 150 Q60 152 58 176 Q54 214 64 252 Q100 268 150 250 Q166 222 162 188 Q160 160 140 152 Z"
          fill={`url(#${skin})`}
        />
        {/* Knuckles of the curled fingers */}
        <path
          d="M122 160 Q142 154 154 166 Q164 182 156 196 Q166 206 158 222 Q154 236 140 238"
          stroke="#b97d5c"
          strokeWidth="2"
          strokeLinecap="round"
          opacity=".7"
        />
        <path d="M128 196 Q142 192 156 196" stroke="#b97d5c" strokeWidth="1.6" opacity=".55" />
        <path d="M130 222 Q144 218 158 222" stroke="#b97d5c" strokeWidth="1.6" opacity=".55" />

        {/* Thumb tucked across */}
        <path
          d="M60 186 Q74 176 100 186 Q122 194 128 210 Q122 222 104 218 Q80 214 62 214 Z"
          fill={`url(#${skinSide})`}
        />
        <path d="M100 187 Q120 196 127 210" stroke="#b97d5c" strokeWidth="1.5" opacity=".6" />
        <ellipse cx="118" cy="206" rx="7" ry="5" fill="#f6d2c4" opacity=".8" />

        {/* Index finger */}
        <path
          d="M80 168 L80 34 Q80 6 100 6 Q120 6 120 34 L122 166 Q100 178 80 168 Z"
          fill={`url(#${skin})`}
        />
        {/* Nail */}
        <path
          d="M89 30 Q89 14 100 14 Q111 14 111 30 L110 46 Q100 50 90 46 Z"
          fill="#f7d9cf"
          stroke="#d7a690"
          strokeWidth="1"
        />
        <path d="M91 22 Q100 16 109 22" stroke="#fff" strokeWidth="1.5" opacity=".6" />
        {/* Joint creases */}
        <path d="M86 70 Q100 74 114 70" stroke="#b97d5c" strokeWidth="1.4" opacity=".6" />
        <path d="M88 76 Q100 79 112 76" stroke="#b97d5c" strokeWidth="1" opacity=".4" />
        <path d="M84 116 Q100 121 116 116" stroke="#b97d5c" strokeWidth="1.4" opacity=".6" />
        {/* Highlight */}
        <path d="M96 30 L95 150" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity=".18" />
      </g>
    </svg>
  )
}

export { PointAt, PointAtHover, PointingHand, promoteHand }
export type { PointAtHoverProps, PointAtProps }
