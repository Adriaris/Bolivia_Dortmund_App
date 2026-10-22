'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ArrowLeft, CheckCircle2, ChevronRight, Smartphone } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import PinInput from '@/components/players/PinInput'
import { useAuth } from '@/components/auth/AuthProvider'
import { InvalidPinError, registerPlayer, signInPlayer } from '@/lib/auth'
import { isValidPin } from '@/lib/players'
import type { Player } from '@/lib/types'

type Step = 'pick' | 'create' | 'enter' | 'done'

interface PlayerAccessModalProps {
  players: Player[]
  registeredIds: Set<string>
  /** Ruta interna (ya validada) a la que ir tras identificarse */
  nextPath: string | null
  onClose: () => void
  /** Se llama cuando cambia quién está registrado (para recargar la lista) */
  onRegisteredChange: () => void
}

const titles: Record<Step, string> = {
  pick: '¿Quién eres?',
  create: 'Crea tu PIN',
  enter: 'Entrar con tu PIN',
  done: '¡Listo!',
}

export default function PlayerAccessModal({
  players,
  registeredIds,
  nextPath,
  onClose,
  onRegisteredChange,
}: PlayerAccessModalProps) {
  const router = useRouter()
  const { refresh } = useAuth()

  const [step, setStep] = useState<Step>('pick')
  const [selected, setSelected] = useState<Player | null>(null)
  const [pin, setPin] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [understood, setUnderstood] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  function resetForm() {
    setPin('')
    setPinConfirm('')
    setUnderstood(false)
    setError(null)
    setInfo(null)
  }

  function pickPlayer(player: Player) {
    resetForm()
    setSelected(player)
    setStep(registeredIds.has(player.id) ? 'enter' : 'create')
  }

  function backToList() {
    resetForm()
    setSelected(null)
    setStep('pick')
  }

  async function finishSignIn(player: Player, value: string) {
    await signInPlayer(player.id, value)
    await refresh()
    setPin('')
    setPinConfirm('')
    setStep('done')
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!selected || submitting) return
    if (!isValidPin(pin)) return setError('El PIN debe tener 6 cifras.')
    if (pin !== pinConfirm) return setError('Los dos PIN no coinciden.')
    if (!understood) return

    setSubmitting(true)
    setError(null)
    try {
      const res = await registerPlayer(selected.id, pin)
      if (!res.ok) {
        if (res.status === 409 && res.error === 'Este jugador ya está registrado') {
          onRegisteredChange()
          resetForm()
          setInfo('Este jugador ya está registrado. Si eres tú, entra con tu PIN.')
          setStep('enter')
          return
        }
        setError(res.error ?? 'No se pudo crear la cuenta. Inténtalo de nuevo.')
        return
      }
      onRegisteredChange()
      try {
        await finishSignIn(selected, pin)
      } catch {
        resetForm()
        setInfo('Tu cuenta se ha creado, pero no se pudo iniciar sesión. Entra con tu PIN.')
        setStep('enter')
      }
    } catch {
      setError('Sin conexión. Inténtalo de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEnter(e: React.FormEvent) {
    e.preventDefault()
    if (!selected || submitting) return
    if (!isValidPin(pin)) return setError('El PIN debe tener 6 cifras.')

    setSubmitting(true)
    setError(null)
    setInfo(null)
    try {
      await finishSignIn(selected, pin)
    } catch (err) {
      setPin('')
      setError(err instanceof InvalidPinError ? 'PIN incorrecto' : 'No se pudo entrar. Inténtalo de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleContinue() {
    onClose()
    if (nextPath) router.push(nextPath)
  }

  const pinsMatch = pin.length === 6 && pin === pinConfirm
  const mismatch = pinConfirm.length === 6 && pin !== pinConfirm

  return (
    <Modal title={titles[step]} onClose={onClose}>
      {/* ── Paso 1: elegir jugador ── */}
      {step === 'pick' && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-zinc-300 bg-bol-yellow/10 border border-bol-yellow/30 rounded-xl px-3 py-2.5 flex gap-2">
            <AlertTriangle size={16} className="text-bol-yellow shrink-0 mt-0.5" />
            <span>
              Elige <strong className="text-white">TU propio nombre</strong>. Tu cuenta queda vinculada a ese jugador.
            </span>
          </p>

          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl overflow-hidden">
            {players.map((p, i) => {
              const registered = registeredIds.has(p.id)
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => pickPlayer(p)}
                  className={[
                    'w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-[#222] active:bg-[#262626] transition-colors',
                    i < players.length - 1 ? 'border-b border-[#2a2a2a]' : '',
                  ].join(' ')}
                >
                  <span className="w-8 h-8 flex items-center justify-center rounded-full bg-[#2a2a2a] text-white font-black text-sm shrink-0">
                    {p.number}
                  </span>
                  <span className="flex-1 min-w-0 text-white text-sm font-medium truncate">{p.name}</span>
                  {registered && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-bol-green/15 border border-bol-green/40 px-2 py-0.5 rounded-full">
                      Registrado
                    </span>
                  )}
                  <ChevronRight size={16} className="text-zinc-600 shrink-0" />
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Cabecera común de los pasos con jugador elegido */}
      {(step === 'create' || step === 'enter') && selected && (
        <button
          type="button"
          onClick={backToList}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft size={14} /> Cambiar jugador
        </button>
      )}

      {/* ── Paso 2a: crear PIN ── */}
      {step === 'create' && selected && (
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 flex items-center justify-center rounded-full bg-bol-yellow text-black font-black shrink-0">
              {selected.number}
            </span>
            <div className="min-w-0">
              <p className="text-white font-bold truncate">{selected.name}</p>
              <p className="text-xs text-zinc-500">Si no eres tú, vuelve atrás y elige tu nombre.</p>
            </div>
          </div>

          <div className="rounded-xl border-2 border-bol-red/70 bg-bol-red/10 px-4 py-3 text-sm text-zinc-200 flex flex-col gap-2">
            <p className="flex items-center gap-2 font-black text-white uppercase tracking-wide text-xs">
              <AlertTriangle size={16} className="text-bol-red" /> El PIN es definitivo
            </p>
            <ul className="list-disc pl-5 flex flex-col gap-1 marker:text-bol-red">
              <li>Queda vinculado a <strong className="text-white">{selected.name}</strong> y a tu sesión.</li>
              <li><strong className="text-white">Apúntalo</strong>: lo necesitarás para entrar desde otro móvil.</li>
              <li>Si lo pierdes, solo un admin puede liberarlo.</li>
            </ul>
          </div>

          <PinInput
            id="pin-new"
            label="PIN (6 cifras)"
            value={pin}
            onChange={(v) => { setPin(v); setError(null) }}
            autoComplete="new-password"
            autoFocus
          />
          <PinInput
            id="pin-confirm"
            label="Repite el PIN"
            value={pinConfirm}
            onChange={(v) => { setPinConfirm(v); setError(null) }}
            autoComplete="new-password"
            invalid={mismatch}
          />
          {mismatch && <p className="text-xs text-red-400 -mt-2">Los dos PIN no coinciden.</p>}

          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={understood}
              onChange={(e) => setUnderstood(e.target.checked)}
              className="mt-0.5 w-5 h-5 shrink-0 accent-[#F9E300]"
            />
            <span className="text-sm text-white font-semibold">Entiendo que el PIN es definitivo</span>
          </label>

          {error && (
            <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/40 px-3 py-2 rounded-xl">{error}</p>
          )}

          <Button type="submit" size="lg" fullWidth disabled={!pinsMatch || !understood || submitting}>
            {submitting ? 'Creando...' : 'Crear PIN y entrar'}
          </Button>
        </form>
      )}

      {/* ── Paso 2b: entrar con PIN ── */}
      {step === 'enter' && selected && (
        <form onSubmit={handleEnter} className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 flex items-center justify-center rounded-full bg-bol-yellow text-black font-black shrink-0">
              {selected.number}
            </span>
            <p className="text-white font-bold truncate">{selected.name}</p>
          </div>

          {info && (
            <p className="text-sm text-zinc-300 bg-[#1f1f1f] border border-[#2a2a2a] px-3 py-2 rounded-xl">{info}</p>
          )}

          <PinInput
            id="pin-current"
            label="Tu PIN"
            value={pin}
            onChange={(v) => { setPin(v); setError(null) }}
            autoComplete="current-password"
            autoFocus
            invalid={error === 'PIN incorrecto'}
          />

          {error && (
            <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/40 px-3 py-2 rounded-xl">{error}</p>
          )}

          <Button type="submit" size="lg" fullWidth disabled={pin.length !== 6 || submitting}>
            {submitting ? 'Entrando...' : 'Entrar'}
          </Button>

          <p className="text-xs text-zinc-600 text-center">
            ¿Has perdido el PIN? Pide a un admin que libere tu jugador y vuelve a registrarte.
          </p>
        </form>
      )}

      {/* ── Paso 3: hecho ── */}
      {step === 'done' && selected && (
        <div className="flex flex-col items-center text-center gap-4 py-2">
          <CheckCircle2 size={44} className="text-bol-yellow" />
          <div>
            <p className="text-lg font-black text-white">Eres {selected.name}</p>
            <p className="text-sm text-zinc-500">#{selected.number} · sesión iniciada en este móvil</p>
          </div>
          <p className="text-xs text-zinc-400 bg-[#1f1f1f] border border-[#2a2a2a] rounded-xl px-3 py-2.5 flex gap-2 text-left">
            <Smartphone size={16} className="text-zinc-500 shrink-0 mt-0.5" />
            <span>
              Añade la app a la pantalla de inicio (Compartir → «Añadir a pantalla de inicio») para no perder la sesión:
              en iPhone, Safari borra los datos de las webs no instaladas a los 7 días.
            </span>
          </p>
          <Button size="lg" fullWidth onClick={handleContinue}>
            Continuar
          </Button>
        </div>
      )}
    </Modal>
  )
}
