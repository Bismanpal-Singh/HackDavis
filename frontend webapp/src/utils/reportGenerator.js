import { jsPDF } from 'jspdf'

function fmt(ts) {
  return new Date(ts).toLocaleString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  })
}

function fmtDuration(s) {
  if (s < 60) return `${s} seconds`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

function getDuration(entries) {
  if (!entries?.length) return 0
  return Math.round(entries[entries.length - 1].timestamp - entries[0].timestamp)
}

function relTime(ts, startTs) {
  const diff = ts - startTs
  const m = Math.floor(diff / 60)
  const s = Math.floor(diff % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export function downloadCallReport(call) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const claude = call.latest_claude_result
  const isScam = claude?.is_scam ?? call.is_scam ?? false
  const duration = getDuration(call.transcript_entries)
  const startTs = call.transcript_entries?.[0]?.timestamp
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 48
  const contentW = pageW - margin * 2
  let y = margin

  // ── helpers ──────────────────────────────────────────────────────────────
  const addText = (text, opts = {}) => {
    const {
      size = 10, bold = false, color = [30, 30, 30],
      align = 'left', lineHeight = 1.4, maxWidth = contentW,
    } = opts
    doc.setFontSize(size)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setTextColor(...color)
    const lines = doc.splitTextToSize(String(text), maxWidth)
    const x = align === 'center' ? pageW / 2 : margin
    doc.text(lines, x, y, { align })
    y += lines.length * size * lineHeight
    return lines.length * size * lineHeight
  }

  const addSpacer = (h = 8) => { y += h }

  const addDivider = (color = [220, 215, 210]) => {
    doc.setDrawColor(...color)
    doc.setLineWidth(0.5)
    doc.line(margin, y, pageW - margin, y)
    y += 10
  }

  const checkPage = (needed = 60) => {
    if (y + needed > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage()
      y = margin
    }
  }

  const addBadge = (label, bgRgb, textRgb) => {
    doc.setFillColor(...bgRgb)
    doc.setDrawColor(...bgRgb)
    doc.roundedRect(margin, y - 12, doc.getTextWidth(label) + 16, 18, 4, 4, 'F')
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...textRgb)
    doc.text(label, margin + 8, y)
    y += 14
  }

  // ── Header banner ─────────────────────────────────────────────────────────
  doc.setFillColor(isScam ? 239 : 78, isScam ? 68 : 132, isScam ? 68 : 74)
  doc.rect(0, 0, pageW, 72, 'F')

  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('ScamShield', margin, 32)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Incident Report', margin, 48)

  doc.setFontSize(9)
  doc.setTextColor(255, 255, 255, 0.8)
  doc.text(`Generated ${new Date().toLocaleString()}`, pageW - margin, 48, { align: 'right' })

  y = 90

  // ── Verdict ───────────────────────────────────────────────────────────────
  addBadge(
    isScam ? `⚠  SCAM DETECTED — ${claude?.scam_type || 'Unknown Type'}` : '✓  NO SCAM DETECTED',
    isScam ? [254, 226, 226] : [240, 253, 244],
    isScam ? [185, 28, 28] : [21, 128, 61],
  )
  addSpacer(14)

  // ── Call details ──────────────────────────────────────────────────────────
  addText('CALL DETAILS', { size: 8, bold: true, color: [120, 113, 108] })
  addSpacer(6)

  const details = [
    ['Caller Number', call.caller_phone || 'Unknown'],
    ['Date & Time', fmt(call.created_at)],
    ['Duration', fmtDuration(duration)],
    ['Peak Risk Score', `${call.max_score} / 100`],
    ...(claude?.confidence != null ? [['AI Confidence', `${claude.confidence}%`]] : []),
    ...(claude?.matched_known_script ? [['Script Match', 'Matches a known scam script']] : []),
  ]

  details.forEach(([label, value]) => {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(80, 70, 60)
    doc.text(label + ':', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(30, 30, 30)
    doc.text(value, margin + 130, y)
    y += 16
  })
  addSpacer(4)
  addDivider()

  // ── Detected patterns ─────────────────────────────────────────────────────
  if (call.matched_categories?.length) {
    addText('DETECTED PATTERNS', { size: 8, bold: true, color: [120, 113, 108] })
    addSpacer(6)
    addText(call.matched_categories.join('  ·  '), { size: 9, color: [146, 64, 14] })
    addSpacer(4)
    addDivider()
  }

  // ── Flagged phrases ───────────────────────────────────────────────────────
  const flagged = claude?.flagged_phrases?.length ? claude.flagged_phrases : (call.flagged_phrases || [])
  if (flagged.length) {
    addText('FLAGGED PHRASES', { size: 8, bold: true, color: [120, 113, 108] })
    addSpacer(6)
    flagged.forEach(p => {
      doc.setFontSize(9)
      doc.setFillColor(254, 226, 226)
      doc.roundedRect(margin, y - 10, doc.getTextWidth(`"${p}"`) + 12, 16, 3, 3, 'F')
      doc.setTextColor(185, 28, 28)
      doc.setFont('helvetica', 'bold')
      doc.text(`"${p}"`, margin + 6, y)
      y += 20
    })
    addSpacer(2)
    addDivider()
  }

  // ── AI Analysis ───────────────────────────────────────────────────────────
  if (claude?.explanation) {
    addText('AI ANALYSIS', { size: 8, bold: true, color: [120, 113, 108] })
    addSpacer(6)
    addText(claude.explanation, { size: 9, color: [40, 40, 40], lineHeight: 1.6 })
    addSpacer(4)
    addDivider()
  }

  // ── Transcript ────────────────────────────────────────────────────────────
  if (call.transcript_entries?.length) {
    checkPage(40)
    addText('CALL TRANSCRIPT', { size: 8, bold: true, color: [120, 113, 108] })
    addSpacer(8)

    call.transcript_entries.forEach((entry, i) => {
      checkPage(30)
      const scoreEntry = call.score_history?.find(s => s.timestamp === entry.timestamp)
      const score = scoreEntry?.score ?? 0
      const highlight = score >= 30

      if (highlight) {
        const lines = doc.splitTextToSize(entry.text, contentW - 50)
        const blockH = lines.length * 10 * 1.4 + 12
        doc.setFillColor(254, 242, 242)
        doc.roundedRect(margin, y - 10, contentW, blockH, 4, 4, 'F')
      }

      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(160, 150, 140)
      doc.text(startTs ? relTime(entry.timestamp, startTs) : `${i}`, margin + 4, y)

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(highlight ? [180, 30, 30] : [40, 40, 40])
      const lines = doc.splitTextToSize(entry.text, contentW - 50)
      doc.text(lines, margin + 40, y)
      y += lines.length * 9 * 1.4 + 8
    })

    addSpacer(4)
    addDivider()
  }

  // ── FTC filing section ────────────────────────────────────────────────────
  checkPage(80)
  addText('REPORTING THIS INCIDENT', { size: 8, bold: true, color: [120, 113, 108] })
  addSpacer(6)
  addText(
    'This report can be submitted to the following agencies. Include this document as an attachment.',
    { size: 9, color: [80, 70, 60], lineHeight: 1.6 }
  )
  addSpacer(8)

  const agencies = [
    ['FTC (Federal Trade Commission)', 'reportfraud.ftc.gov'],
    ['FBI Internet Crime Complaint Center', 'ic3.gov'],
    ['CISA (Cybersecurity & Infrastructure)', 'cisa.gov/report'],
  ]
  agencies.forEach(([name, url]) => {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(40, 40, 40)
    doc.text(name, margin, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(22, 101, 163)
    doc.text(url, margin + 230, y)
    y += 18
  })

  // ── Footer ────────────────────────────────────────────────────────────────
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    const footerY = doc.internal.pageSize.getHeight() - 24
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(160, 150, 140)
    doc.text('Generated by ScamShield · HackDavis 2026 · scam-shield.biz', margin, footerY)
    doc.text(`Page ${i} of ${pageCount}`, pageW - margin, footerY, { align: 'right' })
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  const callerSlug = (call.caller_phone || 'unknown').replace(/\D/g, '')
  const dateSlug = new Date(call.created_at).toISOString().slice(0, 10)
  doc.save(`ScamShield_Report_${callerSlug}_${dateSlug}.pdf`)
}
