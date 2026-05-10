import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, Play, Volume2, XCircle } from 'lucide-react'

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'es', label: 'Spanish' },
]

const VOICE_MODE_OPTIONS = [
  { value: 'calm_coach', label: 'Calm Coach' },
  { value: 'scammer_simulation', label: 'Scammer Simulation' },
  { value: 'safety_explainer', label: 'Safety Explainer' },
]

function difficultyTone(difficulty) {
  if (difficulty === 'hard') return 'bg-red-50 text-red-700'
  if (difficulty === 'medium') return 'bg-amber-50 text-amber-700'
  return 'bg-sage-50 text-sage-700'
}

function labelTone(label) {
  return label === 'scam' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
}

function getScenarioSource(scenario) {
  if (!scenario) return 'seeded'
  if (scenario.source === 'huggingface' || scenario.source_dataset) return 'huggingface'
  if ((scenario.scenario_id || '').startsWith('hf_')) return 'huggingface'
  return 'seeded'
}

function isEnglishOnlyScenario(scenario) {
  const supported = scenario?.supported_languages || []
  return supported.length === 1 && supported[0] === 'en'
}

function normalize(value) {
  return value.toLowerCase().trim()
}

function splitChunksByPhrases(line, phrases) {
  if (!phrases.length) return [{ text: line, flagged: false }]

  const lowered = line.toLowerCase()
  let matches = []
  for (const phrase of phrases) {
    const token = normalize(phrase)
    if (!token) continue
    let idx = lowered.indexOf(token)
    while (idx !== -1) {
      matches.push({ start: idx, end: idx + token.length })
      idx = lowered.indexOf(token, idx + token.length)
    }
  }
  if (!matches.length) return [{ text: line, flagged: false }]

  matches = matches.sort((a, b) => a.start - b.start)
  const merged = []
  for (const m of matches) {
    const prev = merged[merged.length - 1]
    if (prev && m.start <= prev.end) {
      prev.end = Math.max(prev.end, m.end)
    } else {
      merged.push({ ...m })
    }
  }

  const chunks = []
  let cursor = 0
  for (const m of merged) {
    if (m.start > cursor) chunks.push({ text: line.slice(cursor, m.start), flagged: false })
    chunks.push({ text: line.slice(m.start, m.end), flagged: true })
    cursor = m.end
  }
  if (cursor < line.length) chunks.push({ text: line.slice(cursor), flagged: false })
  return chunks
}

function buildDecoys(transcript, redFlags) {
  const redFlagTokens = new Set(redFlags.map((f) => normalize(f.phrase)))
  const candidates = []
  for (const line of transcript || []) {
    const stripped = line.replace(/^[^:]+:\s*/, '')
    const parts = stripped.split(/[,.!?]/).map((p) => p.trim()).filter(Boolean)
    for (const part of parts) {
      const normalized = normalize(part)
      if (normalized.length < 12) continue
      if (redFlagTokens.has(normalized)) continue
      if (Array.from(redFlagTokens).some((token) => token && normalized.includes(token))) continue
      candidates.push(part)
    }
  }
  return [...new Set(candidates)].slice(0, 3)
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-soft">
      <p className="text-2xl font-extrabold text-stone-900">{value}</p>
      <p className="text-xs text-stone-400 font-medium mt-0.5">{label}</p>
    </div>
  )
}

export default function Academy() {
  const [scenarios, setScenarios] = useState([])
  const [stats, setStats] = useState(null)
  const [selectedScenarioId, setSelectedScenarioId] = useState('')
  const [scenarioDetail, setScenarioDetail] = useState(null)
  const [language, setLanguage] = useState('en')
  const [voiceMode, setVoiceMode] = useState('calm_coach')
  const [answerLabel, setAnswerLabel] = useState('')
  const [selectedFlags, setSelectedFlags] = useState([])
  const [attemptResult, setAttemptResult] = useState(null)

  const [loadingScenarios, setLoadingScenarios] = useState(true)
  const [loadingScenarioDetail, setLoadingScenarioDetail] = useState(false)
  const [loadingStats, setLoadingStats] = useState(false)
  const [submittingAttempt, setSubmittingAttempt] = useState(false)
  const [generatingScenarioAudio, setGeneratingScenarioAudio] = useState(false)
  const [generatingFeedbackAudio, setGeneratingFeedbackAudio] = useState(false)
  const [error, setError] = useState('')
  const [voiceMessage, setVoiceMessage] = useState('')

  const redFlags = useMemo(() => scenarioDetail?.red_flags || [], [scenarioDetail])
  const englishOnly = useMemo(() => isEnglishOnlyScenario(scenarioDetail), [scenarioDetail])
  const decoys = useMemo(
    () => buildDecoys(scenarioDetail?.transcript || [], redFlags),
    [scenarioDetail, redFlags]
  )
  const checklistOptions = useMemo(() => {
    const realFlags = redFlags.map((flag) => ({ value: flag.phrase, isDecoy: false }))
    const extraFlags = decoys.map((phrase) => ({ value: phrase, isDecoy: true }))
    return [...realFlags, ...extraFlags]
  }, [redFlags, decoys])

  const resetAttemptState = useCallback(() => {
    setAnswerLabel('')
    setSelectedFlags([])
    setAttemptResult(null)
    setVoiceMessage('')
    setGeneratingScenarioAudio(false)
    setGeneratingFeedbackAudio(false)
    setSubmittingAttempt(false)
  }, [])

  const fetchStats = useCallback(async () => {
    setLoadingStats(true)
    try {
      const response = await fetch(`${BACKEND}/academy/stats?user_id=anonymous`)
      if (!response.ok) throw new Error('Unable to load Academy stats.')
      setStats(await response.json())
    } catch (err) {
      setError(err.message || 'Unable to load Academy stats.')
    } finally {
      setLoadingStats(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setLoadingScenarios(true)
    setError('')

    Promise.all([
      fetch(`${BACKEND}/academy/scenarios`, { signal: controller.signal }).then((r) => {
        if (!r.ok) throw new Error('Unable to load scenarios.')
        return r.json()
      }),
      fetch(`${BACKEND}/academy/stats?user_id=anonymous`, { signal: controller.signal }).then((r) => {
        if (!r.ok) throw new Error('Unable to load Academy stats.')
        return r.json()
      }),
    ])
      .then(([scenarioData, statsData]) => {
        setScenarios(scenarioData)
        setStats(statsData)
        if (scenarioData.length > 0) {
          setLoadingScenarioDetail(true)
          setSelectedScenarioId(scenarioData[0].scenario_id)
        }
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setError(err.message || 'Unable to load Academy.')
      })
      .finally(() => setLoadingScenarios(false))

    return () => {
      controller.abort()
    }
  }, [])

  useEffect(() => {
    if (!selectedScenarioId) return
    const controller = new AbortController()
    setLoadingScenarioDetail(true)

    fetch(`${BACKEND}/academy/scenarios/${selectedScenarioId}?language=${encodeURIComponent(language)}`, {
      signal: controller.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error('Unable to load this scenario.')
        return r.json()
      })
      .then((data) => {
        setScenarioDetail(data)
        if (data?.language && data.language !== language) {
          setLanguage(data.language)
        }
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setError(err.message || 'Unable to load this scenario.')
      })
      .finally(() => setLoadingScenarioDetail(false))

    return () => {
      controller.abort()
    }
  }, [selectedScenarioId, language])

  const toggleFlag = (flag) => {
    setSelectedFlags((prev) => (prev.includes(flag) ? prev.filter((x) => x !== flag) : [...prev, flag]))
  }

  const selectScenario = (scenarioId) => {
    console.info('ACADEMY_SCENARIO_SELECTED', { scenarioId })
    setSelectedScenarioId(scenarioId)
    resetAttemptState()
    setError('')
  }

  const onLanguageChange = (nextLanguage) => {
    console.info('ACADEMY_LANGUAGE_CHANGED', { language: nextLanguage })
    if (nextLanguage === language) return
    setLanguage(nextLanguage)
    resetAttemptState()
    setError('')
  }

  const submitAnswer = async () => {
    if (!scenarioDetail || !answerLabel) return
    setSubmittingAttempt(true)
    setError('')
    console.info('ACADEMY_ATTEMPT_SUBMIT', {
      scenarioId: scenarioDetail.scenario_id,
      language,
      answerLabel,
      selectedRedFlags: selectedFlags,
    })
    try {
      const response = await fetch(`${BACKEND}/academy/attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario_id: scenarioDetail.scenario_id,
          language,
          user_label: answerLabel,
          selected_red_flags: selectedFlags,
          user_id: 'anonymous',
        }),
      })
      if (!response.ok) throw new Error('Could not submit answer.')
      const data = await response.json()
      setAttemptResult(data)
      await fetchStats()
    } catch (err) {
      setError(err.message || 'Submit failed.')
    } finally {
      setSubmittingAttempt(false)
    }
  }

  const playScenarioAudio = async () => {
    if (!scenarioDetail) return
    setGeneratingScenarioAudio(true)
    setVoiceMessage('')
    console.info('ACADEMY_AUDIO_REQUEST', {
      kind: 'scenario',
      scenarioId: scenarioDetail.scenario_id,
      language,
      voiceMode,
    })
    try {
      const response = await fetch(`${BACKEND}/academy/audio/scenario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario_id: scenarioDetail.scenario_id,
          language,
          voice_mode: voiceMode,
        }),
      })
      if (response.status === 503) {
        setVoiceMessage('Voice trainer is unavailable. You can still read the transcript.')
        return
      }
      if (!response.ok) throw new Error('Could not generate scenario audio.')
      const audioBlob = await response.blob()
      const audio = new Audio(URL.createObjectURL(audioBlob))
      void audio.play()
    } catch (err) {
      setVoiceMessage(
        err?.message || 'Voice trainer is unavailable. You can still read the transcript.'
      )
    } finally {
      setGeneratingScenarioAudio(false)
    }
  }

  const playFeedbackAudio = async () => {
    if (!attemptResult) return
    setGeneratingFeedbackAudio(true)
    setVoiceMessage('')
    console.info('ACADEMY_AUDIO_REQUEST', {
      kind: 'feedback',
      language,
      score: attemptResult.score,
    })
    try {
      const response = await fetch(`${BACKEND}/academy/audio/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language,
          score: attemptResult.score,
          feedback: attemptResult.feedback,
          safe_action: attemptResult.safe_action,
        }),
      })
      if (response.status === 503) {
        setVoiceMessage('Voice trainer is unavailable. You can still read the transcript.')
        return
      }
      if (!response.ok) throw new Error('Could not generate feedback audio.')
      const audioBlob = await response.blob()
      const audio = new Audio(URL.createObjectURL(audioBlob))
      void audio.play()
    } catch (err) {
      setVoiceMessage(
        err?.message || 'Voice trainer is unavailable. You can still read the transcript.'
      )
    } finally {
      setGeneratingFeedbackAudio(false)
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">ScamShield Academy</h1>
        <p className="text-sm text-stone-400 mt-1">Practice spotting scam calls before they happen.</p>
      </div>

      {loadingScenarios ? (
        <div className="text-sm text-stone-500">Loading scenarios...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="Completed Attempts" value={loadingStats ? '...' : stats?.total_attempts ?? 0} />
            <StatCard label="Accuracy" value={`${Math.round((stats?.accuracy || 0) * 100)}%`} />
            <StatCard label="Average Score" value={stats?.average_score ?? 0} />
            <StatCard label="Weakest Scam Type" value={stats?.weakest_scam_types?.[0] || '—'} />
          </div>

          <div className="mb-8">
            <h2 className="text-sm font-bold text-stone-700 uppercase tracking-widest mb-3">Scenarios</h2>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
              {scenarios.map((scenario) => {
                const active = selectedScenarioId === scenario.scenario_id
                const sourceType = getScenarioSource(scenario)
                return (
                  <button
                    key={scenario.scenario_id}
                    onClick={() => selectScenario(scenario.scenario_id)}
                    className={`bg-white rounded-2xl p-4 border text-left transition-all ${
                      active ? 'border-sage-300 shadow-card' : 'border-stone-100 hover:border-sage-200'
                    }`}
                  >
                    <p className="text-sm font-bold text-stone-800">{scenario.title}</p>
                    <p className="text-xs text-stone-400 mt-1">{scenario.scam_type}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <span className={`text-[11px] px-2 py-1 rounded-full font-semibold ${difficultyTone(scenario.difficulty)}`}>
                        {scenario.difficulty}
                      </span>
                      <span className={`text-[11px] px-2 py-1 rounded-full font-semibold ${labelTone(scenario.label)}`}>
                        {scenario.label}
                      </span>
                      <span className="text-[11px] px-2 py-1 rounded-full font-semibold bg-stone-100 text-stone-600">
                        {sourceType === 'huggingface' ? 'Public Dataset' : 'Curated Scenario'}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-100 p-4 md:p-5 mb-6">
            <div className="grid md:grid-cols-4 gap-3 items-end">
              <div>
                <p className="text-xs text-stone-500 mb-1">Language</p>
                <select
                  value={language}
                  onChange={(e) => onLanguageChange(e.target.value)}
                  disabled={englishOnly || loadingScenarioDetail}
                  className="w-full h-10 rounded-xl border border-stone-200 px-3 text-sm leading-tight text-stone-700 bg-white disabled:bg-stone-100 disabled:text-stone-500 truncate"
                >
                  {LANGUAGE_OPTIONS.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                      disabled={englishOnly && option.value !== 'en'}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
                {englishOnly && (
                  <p className="text-[11px] text-stone-400 mt-1">
                    This public dataset scenario is available in English only.
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs text-stone-500 mb-1">Voice Mode</p>
                <select
                  value={voiceMode}
                  onChange={(e) => setVoiceMode(e.target.value)}
                  disabled={generatingScenarioAudio}
                  className="w-full h-10 rounded-xl border border-stone-200 px-3 text-sm leading-tight text-stone-700 bg-white disabled:bg-stone-100 disabled:text-stone-500 truncate"
                >
                  {VOICE_MODE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={playScenarioAudio}
                disabled={generatingScenarioAudio || loadingScenarioDetail || !scenarioDetail}
                className="rounded-xl px-4 py-2.5 bg-sage-600 text-white text-sm font-semibold hover:bg-sage-700 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {generatingScenarioAudio ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
                {generatingScenarioAudio ? 'Generating audio...' : 'Play Call'}
              </button>
              {attemptResult ? (
                <button
                  onClick={playFeedbackAudio}
                  disabled={generatingFeedbackAudio}
                  className="rounded-xl px-4 py-2.5 bg-stone-800 text-white text-sm font-semibold hover:bg-stone-900 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {generatingFeedbackAudio ? <Loader2 size={15} className="animate-spin" /> : <Volume2 size={15} />}
                  {generatingFeedbackAudio ? 'Generating audio...' : 'Play Feedback'}
                </button>
              ) : (
                <div className="h-10 rounded-xl border border-dashed border-stone-200 text-xs text-stone-400 flex items-center justify-center">
                  Submit answer to enable feedback audio
                </div>
              )}
            </div>
            {voiceMessage && <p className="text-xs text-amber-700 mt-3">{voiceMessage}</p>}
          </div>

          {loadingScenarioDetail ? (
            <div className="text-sm text-stone-500 mb-6">Loading scenario...</div>
          ) : scenarioDetail ? (
            <div className="grid xl:grid-cols-3 gap-5">
              <div className="xl:col-span-2 bg-white rounded-2xl border border-stone-100 p-5 md:p-6">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <h3 className="text-base font-bold text-stone-900 mr-2">{scenarioDetail.title}</h3>
                  <span className={`text-[11px] px-2 py-1 rounded-full font-semibold ${difficultyTone(scenarioDetail.difficulty)}`}>
                    {scenarioDetail.difficulty}
                  </span>
                  <span className="text-[11px] px-2 py-1 rounded-full font-semibold bg-stone-100 text-stone-700">
                    {scenarioDetail.scam_type}
                  </span>
                  <span className="text-[11px] px-2 py-1 rounded-full font-semibold bg-stone-100 text-stone-600">
                    {getScenarioSource(scenarioDetail) === 'huggingface' ? 'Public Dataset' : 'Curated Scenario'}
                  </span>
                </div>
                {(scenarioDetail.source_dataset || getScenarioSource(scenarioDetail) === 'huggingface') && (
                  <p className="text-xs text-stone-400 mb-3">
                    Source: {scenarioDetail.source_dataset || 'BothBosu/scam-dialogue'}
                  </p>
                )}

                <div className="space-y-2 mb-6 max-h-[420px] overflow-y-auto pr-1">
                  {(scenarioDetail.transcript || []).map((line, index) => {
                    const isCaller = line.toLowerCase().startsWith('caller') || line.toLowerCase().startsWith('llamador')
                    const chunks = attemptResult
                      ? splitChunksByPhrases(line, redFlags.map((flag) => flag.phrase))
                      : [{ text: line, flagged: false }]
                    return (
                      <div
                        key={`${line}-${index}`}
                        className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm ${
                          isCaller ? 'bg-stone-100 text-stone-700' : 'bg-sage-50 text-sage-800 ml-auto'
                        }`}
                      >
                        {chunks.map((chunk, chunkIndex) => (
                          <span
                            key={`${chunk.text}-${chunkIndex}`}
                            className={chunk.flagged ? 'bg-red-100 text-red-700 rounded px-0.5' : ''}
                          >
                            {chunk.text}
                          </span>
                        ))}
                      </div>
                    )
                  })}
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-bold text-stone-700 uppercase tracking-widest mb-2">Choose Label</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {['scam', 'safe', 'unsure'].map((value) => (
                      <button
                        key={value}
                        onClick={() => setAnswerLabel(value)}
                        className={`px-3 py-2 rounded-xl text-sm font-semibold border ${
                          answerLabel === value
                            ? 'border-sage-500 bg-sage-50 text-sage-700'
                            : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                        }`}
                      >
                        {value.charAt(0).toUpperCase() + value.slice(1)}
                      </button>
                    ))}
                  </div>

                  <p className="text-xs font-bold text-stone-700 uppercase tracking-widest mb-2">Red Flag Checklist</p>
                  <div className="grid md:grid-cols-2 gap-2 mb-4">
                    {checklistOptions.map((option) => (
                      <label
                        key={option.value}
                        className="flex items-start gap-2 rounded-xl border border-stone-200 px-3 py-2.5 text-sm text-stone-700"
                      >
                        <input
                          type="checkbox"
                          checked={selectedFlags.includes(option.value)}
                          onChange={() => toggleFlag(option.value)}
                          className="mt-0.5"
                        />
                        <span>{option.value}</span>
                      </label>
                    ))}
                  </div>
                  <button
                    onClick={submitAnswer}
                    disabled={submittingAttempt || !answerLabel || loadingScenarioDetail}
                    className="rounded-xl px-4 py-2.5 bg-sage-600 text-white text-sm font-semibold hover:bg-sage-700 disabled:opacity-50"
                  >
                    {submittingAttempt ? 'Submitting...' : 'Submit Answer'}
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-stone-100 p-5 md:p-6">
                <h3 className="text-sm font-bold text-stone-700 uppercase tracking-widest mb-3">Feedback</h3>
                {!attemptResult ? (
                  <p className="text-sm text-stone-400">Submit an answer to get score and coaching feedback.</p>
                ) : (
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-stone-500">Score</span>
                      <span className="text-xl font-extrabold text-stone-900">{attemptResult.score}/100</span>
                    </div>
                    <div className="flex items-center gap-2 text-stone-700">
                      {attemptResult.correct_label ? <CheckCircle2 size={16} className="text-emerald-600" /> : <XCircle size={16} className="text-red-600" />}
                      <span>{attemptResult.correct_label ? 'Correct label' : 'Incorrect label'}</span>
                    </div>
                    <div>
                      <p className="text-xs text-stone-500 mb-1">Missed red flags</p>
                      <p className="text-stone-700">{attemptResult.missed_red_flags?.join(', ') || 'None'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-stone-500 mb-1">Incorrect red flags</p>
                      <p className="text-stone-700">{attemptResult.incorrect_red_flags?.join(', ') || 'None'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-stone-500 mb-1">Feedback</p>
                      <p className="text-stone-700">{attemptResult.feedback}</p>
                    </div>
                    <div>
                      <p className="text-xs text-stone-500 mb-1">Safe action</p>
                      <p className="text-stone-700">{attemptResult.safe_action}</p>
                    </div>
                    <div>
                      <p className="text-xs text-stone-500 mb-1">Teaching summary</p>
                      <p className="text-stone-700">{attemptResult.teaching_summary}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </>
      )}

      {error && (
        <div className="mt-4 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
          <AlertTriangle size={15} />
          {error}
        </div>
      )}
    </div>
  )
}
