import { useRef, useState } from 'react'
import { useAuth, useUser } from '@clerk/clerk-react'
import { API_BASE } from '../lib/api'
import ProfileSelector from './ProfileSelector'

const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png'])

const DOC_TYPES = [
  { value: 'blood_test',     label: 'Blood test' },
  { value: 'prescription',   label: 'Prescription' },
  { value: 'imaging_report', label: 'Imaging report' },
  { value: 'other',          label: 'Other' },
]

// ── Root ──────────────────────────────────────────────────────────────────────

export default function DocumentUpload() {
  const { getToken } = useAuth()
  const { user } = useUser()
  const fileInputRef = useRef(null)

  const [phase, setPhase]       = useState('idle')  // idle | disclosure_modal | uploading | result
  const [file, setFile]         = useState(null)
  const [docType, setDocType]   = useState('')
  const [profileId, setProfileId] = useState('')
  const [fileError, setFileError] = useState('')
  const [result, setResult]     = useState(null)
  const [duplicate, setDuplicate] = useState(null)

  function openDisclosure() {
    setPhase('disclosure_modal')
  }

  function closeDisclosure() {
    setPhase('idle')
  }

  function confirmDisclosure() {
    setPhase('idle')
    fileInputRef.current?.click()
  }

  function onFileChange(e) {
    const picked = e.target.files?.[0]
    e.target.value = ''
    if (!picked) return

    setFileError('')

    if (!ALLOWED_TYPES.has(picked.type)) {
      setFileError('Unsupported file type. Please choose a PDF, JPEG, or PNG.')
      setFile(null)
      return
    }
    if (picked.size > MAX_BYTES) {
      setFileError('File is too large. Maximum size is 10 MB.')
      setFile(null)
      return
    }
    setFile(picked)
  }

  async function onUpload(forceReupload = false) {
    if (!file || !docType) return
    setPhase('uploading')
    setDuplicate(null)

    try {
      const token = await getToken()
      const form = new FormData()
      form.append('file', file)
      form.append('document_type', docType)
      if (profileId) form.append('profile_id', profileId)
      if (forceReupload) form.append('force_reupload', 'true')

      const resp = await fetch(`${API_BASE}/documents/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })

      const data = await resp.json().catch(() => ({}))
      if (resp.ok && data.duplicate_detected) {
        setDuplicate(data.existing_upload)
        setPhase('idle')
        return
      }

      setResult(resp.ok
        ? { ...data, _filename: file.name }
        : { status: 'failed', _clientError: data.detail ?? 'Upload failed.' }
      )
    } catch {
      setResult({ status: 'failed', _clientError: 'Network error. Please try again.' })
    }

    setPhase('result')
  }

  function onReset() {
    setPhase('idle')
    setFile(null)
    setDocType('')
    setProfileId('')
    setFileError('')
    setResult(null)
    setDuplicate(null)
  }

  if (phase === 'result') {
    return <ResultView result={result} user={user} onReset={onReset} />
  }

  return (
    <>
      {phase === 'disclosure_modal' && (
        <DisclosureModal onCancel={closeDisclosure} onConfirm={confirmDisclosure} />
      )}
      {duplicate && (
        <DuplicateModal
          existing={duplicate}
          onCancel={() => setDuplicate(null)}
          onConfirm={() => onUpload(true)}
        />
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png"
        className="hidden"
        onChange={onFileChange}
      />

      <div className="bg-warm-surface rounded-2xl border border-warm-border p-6">
        <p className="font-mono text-xs text-warm-muted tracking-widest uppercase mb-5">
          Upload Document
        </p>

        {phase === 'uploading' ? (
          <UploadingState />
        ) : (
          <IdleContent
            file={file}
            docType={docType}
            profileId={profileId}
            fileError={fileError}
            onTrigger={openDisclosure}
            onTypeChange={setDocType}
            onProfileChange={setProfileId}
            onUpload={onUpload}
            onChangeFile={() => fileInputRef.current?.click()}
          />
        )}
      </div>
    </>
  )
}

// ── Disclosure Modal ──────────────────────────────────────────────────────────

function DisclosureModal({ onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-warm-surface border border-warm-border rounded-2xl shadow-matte w-full max-w-md p-7">
        <p className="font-mono text-xs text-accent tracking-widest uppercase mb-3">
          Before you upload
        </p>
        <p className="font-sans text-sm text-warm-muted leading-relaxed mb-6">
          Your file is processed immediately and never stored. We extract health values to
          personalise your experience, then permanently delete the file. Extracted values
          (e.g. HbA1c, haemoglobin) are saved to your profile.
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-warm-border text-warm-muted font-sans text-sm
                       hover:border-warm-off-white hover:text-warm-off-white transition-colors duration-250"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-accent text-white font-sans text-sm font-medium
                       hover:bg-accent/90 transition-colors duration-250"
          >
            I understand, choose file
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Idle Content ──────────────────────────────────────────────────────────────

function IdleContent({ file, docType, profileId, fileError, onTrigger, onTypeChange, onProfileChange, onUpload, onChangeFile }) {
  const canUpload = !!file && !!docType

  if (!file) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-8 border-2 border-dashed border-warm-border rounded-xl">
        <p className="font-sans text-xs text-warm-muted">
          Blood test · Prescription · Imaging report
        </p>
        <button
          onClick={onTrigger}
          className="px-5 py-2.5 rounded-lg bg-accent text-white font-sans text-sm font-medium
                     hover:bg-accent/90 transition-colors duration-250"
        >
          Upload a document
        </button>
        {fileError && (
          <p className="font-sans text-xs text-red-400 text-center max-w-xs">{fileError}</p>
        )}
        <p className="font-sans text-xs text-warm-muted">PDF, JPEG, PNG — max 10 MB</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Selected file chip */}
      <div className="flex items-center gap-3 bg-warm-elevated border border-warm-border rounded-lg px-4 py-3">
        <span className="text-sm shrink-0">
          {file.type === 'application/pdf' ? '📄' : '🖼️'}
        </span>
        <span className="font-sans text-sm text-warm-off-white truncate flex-1">{file.name}</span>
        <button
          onClick={onChangeFile}
          className="font-sans text-xs text-warm-muted hover:text-warm-off-white
                     transition-colors duration-250 shrink-0"
        >
          Change
        </button>
      </div>

      {/* Document type */}
      <div>
        <label className="font-mono text-xs text-warm-muted tracking-widest uppercase block mb-2">
          Document type
        </label>
        <select
          value={docType}
          onChange={(e) => onTypeChange(e.target.value)}
          className="w-full bg-warm-elevated border border-warm-border rounded-lg px-4 py-2.5
                     font-sans text-sm text-warm-off-white focus:outline-none focus:border-accent
                     transition-colors duration-250 cursor-pointer"
        >
          <option value="" disabled>Select a type…</option>
          {DOC_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <ProfileSelector value={profileId} onChange={onProfileChange} />

      {/* Upload */}
      <button
        onClick={() => onUpload(false)}
        disabled={!canUpload}
        className="w-full px-5 py-2.5 rounded-lg bg-accent text-white font-sans text-sm font-medium
                   hover:bg-accent/90 transition-colors duration-250
                   disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Extract health values
      </button>
    </div>
  )
}

// ── Uploading State ───────────────────────────────────────────────────────────

function UploadingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-10">
      <div className="h-px w-48 bg-accent animate-agent-trace-pulse" />
      <p className="font-sans text-sm text-warm-muted animate-agent-trace-pulse">
        Extracting health values from your document…
      </p>
    </div>
  )
}

function DuplicateModal({ existing, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60">
      <div className="bg-warm-surface border border-warm-border rounded w-full max-w-md p-7">
        <p className="font-mono text-xs text-accent tracking-widest uppercase mb-3">
          Duplicate detected
        </p>
        <p className="font-sans text-sm text-warm-muted leading-relaxed mb-6">
          Looks like you&apos;ve uploaded this file before - {existing.original_filename} on {formatDate(existing.uploaded_at)}. Do you want to upload it again?
        </p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="font-sans text-sm text-warm-muted hover:text-warm-off-white">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 rounded border border-accent text-accent font-sans text-sm">
            Upload Anyway
          </button>
        </div>
      </div>
    </div>
  )
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Result View ───────────────────────────────────────────────────────────────

function nameMatchStatus(patientName, user) {
  if (!patientName || !user) return null
  const doc   = patientName.toLowerCase()
  const first = (user.firstName ?? '').toLowerCase()
  const last  = (user.lastName  ?? '').toLowerCase()
  if ((first && doc.includes(first)) || (last && doc.includes(last))) return 'match'
  return 'mismatch'
}

function ResultView({ result, user, onReset }) {
  const failed    = result?.status === 'failed'
  const meta      = result?.document_meta ?? {}
  const nameStatus = nameMatchStatus(meta.patient_name, user)

  return (
    <div className="bg-warm-surface rounded-2xl border border-warm-border p-6">
      <p className="font-mono text-xs text-warm-muted tracking-widest uppercase mb-5">
        Upload Result
      </p>

      {failed ? (
        <div className="rounded-xl bg-warm-elevated border border-warm-border px-5 py-4">
          <p className="font-sans text-sm text-warm-off-white leading-relaxed">
            We couldn&apos;t extract values from this document. Try a clearer image or a
            text-based PDF.
          </p>
          {result._clientError && (
            <p className="font-sans text-xs text-warm-muted mt-2">{result._clientError}</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">

          {/* Summary */}
          <div className="rounded-xl bg-warm-elevated border border-warm-border px-5 py-4 space-y-1.5">
            <p className="font-sans text-sm text-warm-off-white">
              Extracted from <span className="font-medium">{result._filename}</span>. File has been discarded.
            </p>
            {meta.document_date && (
              <p className="font-sans text-xs text-warm-muted">Report date: {meta.document_date}</p>
            )}
            {meta.hospital_or_lab && (
              <p className="font-sans text-xs text-warm-muted">{meta.hospital_or_lab}</p>
            )}
            {result.processing_note && (
              <p className="font-sans text-xs text-warm-muted italic">{result.processing_note}</p>
            )}
          </div>

          {/* Patient */}
          {meta.patient_name && (
            <div className="rounded-xl bg-warm-elevated border border-warm-border px-5 py-4">
              <p className="font-mono text-xs text-warm-muted tracking-widest uppercase mb-2">Patient</p>
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-sans text-sm text-warm-off-white">{meta.patient_name}</span>
                {(meta.patient_age || meta.patient_sex) && (
                  <span className="font-sans text-xs text-warm-muted">
                    {[meta.patient_age, meta.patient_sex].filter(Boolean).join(' · ')}
                  </span>
                )}
                {nameStatus === 'match' && (
                  <span className="font-sans text-xs text-green-400 bg-green-400/10 border border-green-400/20 rounded-full px-2 py-0.5">
                    Matches your profile
                  </span>
                )}
                {nameStatus === 'mismatch' && (
                  <span className="font-sans text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-full px-2 py-0.5">
                    ⚠️ Different from your profile
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Doctors */}
          {(meta.reporting_doctor || meta.referring_doctor) && (
            <div className="rounded-xl bg-warm-elevated border border-warm-border px-5 py-4">
              <p className="font-mono text-xs text-warm-muted tracking-widest uppercase mb-2">Doctors</p>
              <div className="space-y-1">
                {meta.reporting_doctor && (
                  <p className="font-sans text-sm text-warm-off-white">
                    <span className="text-warm-muted text-xs mr-2">Reporting</span>
                    {meta.reporting_doctor}
                  </p>
                )}
                {meta.referring_doctor && (
                  <p className="font-sans text-sm text-warm-off-white">
                    <span className="text-warm-muted text-xs mr-2">Referring</span>
                    {meta.referring_doctor}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Conclusions */}
          {result.conclusions?.length > 0 && (
            <div className="rounded-xl bg-warm-elevated border border-warm-border px-5 py-4">
              <p className="font-mono text-xs text-warm-muted tracking-widest uppercase mb-3">
                Conclusions
              </p>
              <ul className="space-y-1.5">
                {result.conclusions.map((c, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-accent shrink-0" />
                    <span className="font-sans text-sm text-warm-off-white leading-snug">{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Findings */}
          {result.findings?.length > 0 && (
            <div>
              <p className="font-mono text-xs text-warm-muted tracking-widest uppercase mb-3">Findings</p>
              <div className="space-y-2">
                {result.findings.map((f, i) => (
                  <div
                    key={i}
                    className={`rounded-lg border px-4 py-3 ${
                      f.is_abnormal
                        ? 'border-yellow-500/30 bg-yellow-500/5'
                        : 'border-warm-border bg-warm-elevated'
                    }`}
                  >
                    {f.section && (
                      <p className="font-mono text-xs text-warm-muted tracking-wide uppercase mb-1">
                        {f.section}
                      </p>
                    )}
                    <p className="font-sans text-sm text-warm-off-white leading-snug">
                      {f.is_abnormal && <span className="mr-1.5" title="Abnormal">⚠️</span>}
                      {f.finding}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Numeric values table */}
          {result.numeric_values?.length > 0 && (
            <div>
              <p className="font-mono text-xs text-warm-muted tracking-widest uppercase mb-3">
                Lab Values
              </p>
              <div className="overflow-x-auto rounded-xl border border-warm-border">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-warm-border bg-warm-elevated">
                      {['Name', 'Value', 'Unit', 'Reference range', ''].map((h, i) => (
                        <th
                          key={i}
                          className="font-mono text-xs text-warm-muted tracking-widest uppercase
                                     px-4 py-3 whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.numeric_values.map((v, i) => (
                      <tr
                        key={i}
                        className="border-b border-warm-border last:border-0
                                   odd:bg-transparent even:bg-warm-elevated/30"
                      >
                        <td className="font-sans text-sm text-warm-off-white px-4 py-3">{v.name}</td>
                        <td className="font-mono text-sm text-warm-off-white px-4 py-3">{v.value}</td>
                        <td className="font-sans text-sm text-warm-muted px-4 py-3">{v.unit ?? '—'}</td>
                        <td className="font-sans text-sm text-warm-muted px-4 py-3">
                          {v.reference_range ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-center w-8">
                          {v.is_abnormal === true && <span title="Abnormal value">⚠️</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Conditions */}
          {result.conditions_mentioned?.length > 0 && (
            <div className="rounded-xl bg-warm-elevated border border-warm-border px-5 py-4">
              <p className="font-mono text-xs text-warm-muted tracking-widest uppercase mb-3">
                Conditions Mentioned
              </p>
              <div className="flex flex-wrap gap-2">
                {result.conditions_mentioned.map((c, i) => (
                  <span
                    key={i}
                    className="font-sans text-xs text-warm-off-white bg-accent/10 border border-accent/20 rounded-full px-3 py-1"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>
      )}

      <button
        onClick={onReset}
        className="mt-5 font-sans text-sm text-warm-muted hover:text-warm-off-white
                   transition-colors duration-250"
      >
        Upload another document
      </button>
    </div>
  )
}
