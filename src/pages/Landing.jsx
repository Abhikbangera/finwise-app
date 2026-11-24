import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import css from '../landing/landing.css?inline'
import html from '../landing/landing.html?raw'
import { initLanding } from '../landing/landing'

// The original FinWise landing page, shown inside a shadow root so its styles and the app's
// styles cannot affect each other. Buttons marked data-route go to the real app pages.
export default function Landing() {
  const host = useRef(null)
  const navigate = useNavigate()
  useEffect(() => {
    const el = host.current
    const root = el.shadowRoot || el.attachShadow({ mode: 'open' })
    root.innerHTML = `<style>${css}</style>${html}`
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const click = (e) => {
      const a = e.target.closest?.('a')
      if (!a) return
      const href = a.getAttribute('href') || ''
      if (a.dataset.route) { e.preventDefault(); navigate(a.dataset.route) }
      else if (href.startsWith('#')) {
        e.preventDefault()
        const t = href.length > 1 ? root.querySelector(href) : null
        t ? t.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }) : window.scrollTo({ top: 0 })
      }
    }
    root.addEventListener('click', click)
    const stop = initLanding(root)
    return () => { root.removeEventListener('click', click); stop() }
  }, [navigate])
  return <div ref={host} />
}
