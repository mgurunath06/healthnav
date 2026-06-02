import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { apiFetch } from '../lib/api'
import ProfileSelector from './ProfileSelector'

export default function DocumentHistoryList() {
  const { getToken } = useAuth()
  const [profileId, setProfileId] = useState('')
  const [uploads, setUploads] = useState([])
  const [expanded, setExpanded] = useState(null)
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState(null)

  async function load() {
    setLoading(true)
    try {
      const token = await getToken()
      const query = profileId ? `?profile_id=${profileId}` : ''
      const data = await apiFetch(`/documents${query}`, { token })
      setUploads(data.uploads ?? [])
    } catch {
      setUploads([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId])

  async function toggle(uploadId) {
    if (expanded === uploadId) {
      setExpanded(null)
      setDetail(null)
      return
    }
    setExpanded(uploadId)
    setDetail(null)
    const token = await getToken()
    setDetail(await apiFetch(`/documents/${uploadId}`, { token }))
  }

  async function remove(uploadId) {
    const token = await getToken()
    await apiFetch(`/documents/${uploadId}`, { token, method: 'DELETE' })
    setRemoving(null)
    setExpanded(null)
    setDetail(null)
    await load()
  }

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <p className="font-mono text-xs text-warm-muted tracking-widest uppercase">
          Uploaded Documents
        </p>
        <div className="w-56">
          <ProfileSelector value={profileId} onChange={setProfileId} includeAll />
        </div>
      </div>

      {loading ? (
        <div className="h-16 bg-warm-surface border border-warm-border rounded animate-skeleton-breathe" />
      ) : uploads.length === 0 ? (
        <div className="border border-dashed border-warm-border px-6 py-8 text-center rounded">
          <p className="font-sans text-sm text-warm-muted">No documents uploaded yet. Upload a blood test or report to get started.</p>
        </div>
      ) : (
        <div className="divide-y divide-warm-border border border-warm-border rounded overflow-hidden">
          {uploads.map((upload) => (
            <div key={upload.upload_id} className="bg-warm-surface">
              <button
                onClick={() => toggle(upload.upload_id)}
                className="w-full text-left px-4 py-4 flex items-center gap-4 hover:bg-warm-elevated transition-colors duration-250"
              >
                <span className="font-mono text-xs text-accent shrink-0">{iconFor(upload.document_type)}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-sans text-sm text-warm-off-white truncate">{upload.original_filename}</p>
                  <p className="font-sans text-xs text-warm-muted truncate">
                    {[upload.profile_display_name, formatDate(upload.uploaded_at), `${upload.values_extracted} values`, `${upload.findings_extracted} findings`].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <StatusBadge status={upload.extraction_status} />
                <span className="font-mono text-xs text-warm-muted">{expanded === upload.upload_id ? 'UP' : 'DN'}</span>
              </button>

              {expanded === upload.upload_id && (
                <DocumentDetail
                  detail={detail}
                  onRemove={() => setRemoving(upload.upload_id)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {removing && (
        <DeleteModal
          onCancel={() => setRemoving(null)}
          onConfirm={() => remove(removing)}
        />
      )}
    </section>
  )
}

function DocumentDetail({ detail, onRemove }) {
  if (!detail) {
    return <div className="px-4 pb-4 font-sans text-sm text-warm-muted animate-agent-trace-pulse">Loading document details...</div>
  }
  return (
    <div className="px-4 pb-5 space-y-5 bg-warm-charcoal/40">
      <Meta detail={detail} />
      <Values values={detail.numeric_values ?? []} />
      <Findings findings={detail.findings ?? []} />
      {detail.conclusions?.length > 0 && (
        <Block title="Conclusions">
          <ul className="space-y-1.5">
            {detail.conclusions.map((item, i) => <li key={i} className="font-sans text-sm text-warm-muted">{item}</li>)}
          </ul>
        </Block>
      )}
      {detail.processing_note && <p className="font-sans text-xs text-warm-muted italic">{detail.processing_note}</p>}
      <div className="text-right">
        <button onClick={onRemove} className="font-sans text-sm text-quadrant-q1 hover:text-warm-off-white transition-colors duration-250">
          Remove from history
        </button>
      </div>
    </div>
  )
}

function Meta({ detail }) {
  const items = [
    ['Hospital/lab', detail.hospital_or_lab],
    ['Reporting doctor', detail.reporting_doctor],
    ['Referring doctor', detail.referring_doctor],
    ['Patient', detail.patient_name],
    ['Document date', detail.recorded_date],
    ['Subtype', detail.document_subtype],
  ].filter(([, value]) => value)
  if (!items.length) return null
  return (
    <Block title="Document Meta">
      <div className="grid sm:grid-cols-2 gap-3">
        {items.map(([label, value]) => (
          <div key={label}>
            <p className="font-mono text-xs text-warm-muted uppercase">{label}</p>
            <p className="font-sans text-sm text-warm-off-white">{value}</p>
          </div>
        ))}
      </div>
    </Block>
  )
}

function Values({ values }) {
  if (!values.length) return null
  return (
    <Block title="Numeric Values">
      <div className="overflow-x-auto border border-warm-border rounded">
        <table className="w-full text-left">
          <thead className="bg-warm-elevated">
            <tr>{['Name', 'Value', 'Unit', 'Range', 'Flag'].map((h) => <th key={h} className="font-mono text-xs text-warm-muted uppercase px-3 py-2">{h}</th>)}</tr>
          </thead>
          <tbody>
            {values.map((v, i) => (
              <tr key={i} className={`border-t border-warm-border ${v.is_abnormal ? 'border-l-4 border-l-quadrant-q1' : ''}`}>
                <td className="font-sans text-sm text-warm-off-white px-3 py-2">{v.name}</td>
                <td className="font-mono text-sm text-warm-off-white px-3 py-2">{v.value}</td>
                <td className="font-sans text-sm text-warm-muted px-3 py-2">{v.unit ?? '-'}</td>
                <td className="font-sans text-sm text-warm-muted px-3 py-2">{v.reference_range ?? '-'}</td>
                <td className="font-sans text-sm text-warm-muted px-3 py-2">{v.is_abnormal ? 'Abnormal' : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Block>
  )
}

function Findings({ findings }) {
  if (!findings.length) return null
  return (
    <Block title="Findings">
      <div className="space-y-2">
        {findings.map((f, i) => (
          <div key={i} className={`bg-warm-elevated border border-warm-border px-4 py-3 rounded ${f.is_abnormal ? 'border-l-4 border-l-quadrant-q1' : ''}`}>
            {f.section && <p className="font-mono text-xs text-warm-muted uppercase mb-1">{f.section}</p>}
            <p className="font-sans text-sm text-warm-off-white">{f.finding}</p>
          </div>
        ))}
      </div>
    </Block>
  )
}

function Block({ title, children }) {
  return (
    <div className="pt-4">
      <p className="font-mono text-xs text-warm-muted tracking-widest uppercase mb-3">{title}</p>
      {children}
    </div>
  )
}

function DeleteModal({ onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60">
      <div className="w-full max-w-md bg-warm-surface border border-warm-border border-t-4 border-t-quadrant-q1 rounded p-6">
        <p className="font-mono text-xs text-quadrant-q1 tracking-widest uppercase mb-3">Remove document</p>
        <p className="font-sans text-sm text-warm-muted leading-relaxed mb-6">
          This will remove this document from your health history. Extracted values like test results and findings will no longer appear in your profile or influence your health companion. The data is retained securely and cannot be recovered via the app.
        </p>
        <div className="flex justify-end gap-4">
          <button onClick={onCancel} className="font-sans text-sm text-warm-muted hover:text-warm-off-white">Keep it</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded bg-quadrant-q1 text-warm-off-white font-sans text-sm">Remove</button>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const color = status === 'success' ? 'text-quadrant-q3' : status === 'partial' ? 'text-quadrant-q2' : 'text-quadrant-q1'
  return <span className={`font-mono text-xs uppercase ${color}`}>{status}</span>
}

function iconFor(type) {
  if (type === 'blood_test') return 'LAB'
  if (type === 'imaging_report') return 'IMG'
  if (type === 'prescription') return 'RX'
  return 'DOC'
}

function formatDate(value) {
  if (!value) return null
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
