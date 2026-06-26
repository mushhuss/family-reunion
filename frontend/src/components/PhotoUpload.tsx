// Drag-and-drop / file-picker upload component.
//
// Thumbnail strategy (runs entirely in the browser before upload):
//   Photos  → generateThumb: Canvas-resizes to max 1200px wide, exports 82% JPEG.
//             Returns the original File if: (a) already < 300KB, or (b) canvas can't decode
//             the format (e.g. HEIC on Chrome). Returns null if the image fails to load at all.
//   Videos  → captureVideoThumb: Creates a hidden <video> with preload="metadata", seeks to
//             1s (or halfway), captures that frame to canvas. The 15s timeout handles codecs
//             that never fire onseeked. The `settled` flag prevents double-resolve between
//             the timeout path and the onseeked path.
//
// The upload itself uses XMLHttpRequest (not fetch) because only XHR exposes upload.progress
// events. Progress resets to 0 between retry attempts. Retries are handled in api.ts.
//
// The drop zone is locked (opacity-50, pointer-events-none) during upload to prevent
// concurrent submissions from the same session.
import { useCallback, useRef, useState } from 'react'
import { Upload, Video, CloudUpload, ImageDown } from 'lucide-react'
import { uploadWithProgress } from '../lib/api'

interface Props {
  year: string
  onUploaded: () => void
}

const VIDEO_TYPES = new Set(['video/mp4', 'video/quicktime'])

// Generate a 1200px-wide JPEG preview from an image file.
// Returns null if the file can't be canvas-decoded (HEIC on Chrome, etc.).
// Generate a 1200px-wide JPEG preview from an image file.
// Returns null if the file can't be canvas-decoded (HEIC on Chrome, etc.).
// Returns original file unchanged if it's already small (< 300KB) or already fits within 1200px.
async function generateThumb(file: File): Promise<File | null> {
  return new Promise(resolve => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const MAX = 1200
      const scale = Math.min(1, MAX / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)

      if (scale === 1 && file.size < 300_000) { resolve(file); return }

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)

      canvas.toBlob(blob => {
        if (!blob || blob.size >= file.size) { resolve(file); return }
        const stem = file.name.replace(/\.[^.]+$/, '')
        resolve(new File([blob], `${stem}_thumb.jpg`, { type: 'image/jpeg', lastModified: file.lastModified }))
      }, 'image/jpeg', 0.82)
    }

    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(null) }
    img.src = objectUrl
  })
}

// Capture a thumbnail frame from a video file using a hidden <video> element.
// Seeks to 1s (or halfway for very short clips) then draws to canvas → JPEG.
// preload="metadata" means the browser downloads only enough to seek — not the full video.
// `settled` flag prevents double-resolve if the 15s timeout fires after onseeked already resolved.
async function captureVideoThumb(file: File): Promise<File | null> {
  return new Promise(resolve => {
    const video = document.createElement('video')
    const objectUrl = URL.createObjectURL(file)
    let settled = false

    const finish = (result: File | null) => {
      if (settled) return
      settled = true
      URL.revokeObjectURL(objectUrl)
      resolve(result)
    }

    // Fallback — if seeking never fires (e.g. unsupported codec), give up after 15s
    const timeout = setTimeout(() => finish(null), 15_000)

    video.muted = true
    video.playsInline = true
    video.preload = 'metadata'

    video.onloadedmetadata = () => {
      video.currentTime = Math.min(1, video.duration / 2)
    }

    video.onseeked = () => {
      clearTimeout(timeout)
      try {
        const MAX = 1200
        const scale = Math.min(1, MAX / Math.max(video.videoWidth, video.videoHeight))
        const w = Math.round(video.videoWidth * scale)
        const h = Math.round(video.videoHeight * scale)
        if (w === 0 || h === 0) { finish(null); return }

        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        canvas.getContext('2d')!.drawImage(video, 0, 0, w, h)

        canvas.toBlob(blob => {
          if (!blob) { finish(null); return }
          const stem = file.name.replace(/\.[^.]+$/, '')
          finish(new File([blob], `${stem}_thumb.jpg`, { type: 'image/jpeg', lastModified: file.lastModified }))
        }, 'image/jpeg', 0.82)
      } catch {
        finish(null)
      }
    }

    video.onerror = () => { clearTimeout(timeout); finish(null) }
    video.src = objectUrl
  })
}

export default function PhotoUpload({ year, onUploaded }: Props) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const [preparingLabel, setPreparingLabel] = useState('')
  const [progress, setProgress] = useState(0)
  const [fileIdx, setFileIdx] = useState(0)
  const [fileTotal, setFileTotal] = useState(0)
  const [currentFileName, setCurrentFileName] = useState('')
  const [uploadedName, setUploadedName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [failedFiles, setFailedFiles] = useState<File[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploaderName, setUploaderName] = useState('')
  const [caption, setCaption] = useState('')

  const handleFiles = useCallback(
    async (files: FileList | File[] | null) => {
      if (!files || files.length === 0) return
      const fileArr = Array.from(files as FileList)
      setError(null)
      setFailedFiles([])
      setUploading(true)
      setFileTotal(fileArr.length)

      try {
        for (let i = 0; i < fileArr.length; i++) {
          const file = fileArr[i]
          setFileIdx(i + 1)
          setCurrentFileName(file.name)
          setProgress(0)

          // Generate thumbnail before uploading — image resize or video frame capture
          let thumb: File | null = null
          if (VIDEO_TYPES.has(file.type)) {
            setPreparing(true)
            setPreparingLabel('Capturing preview frame…')
            thumb = await captureVideoThumb(file)
            setPreparing(false)
          } else {
            setPreparing(true)
            setPreparingLabel('Generating preview…')
            thumb = await generateThumb(file)
            setPreparing(false)
          }

          await uploadWithProgress(
            file,
            year,
            setProgress,
            uploaderName.trim() || undefined,
            caption.trim() || undefined,
            thumb,
          )
          setUploadedName(file.name)
        }
        setCaption('')
        onUploaded()
      } catch (err) {
        setFailedFiles(fileArr)
        setError(err instanceof Error ? err.message : 'Upload failed')
      } finally {
        setUploading(false)
        setPreparing(false)
        setPreparingLabel('')
        setProgress(0)
        setFileIdx(0)
        setFileTotal(0)
        if (inputRef.current) inputRef.current.value = ''
      }
    },
    [year, caption, uploaderName, onUploaded],
  )

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (!uploading) handleFiles(e.dataTransfer.files)
  }

  const truncate = (name: string, max = 36) =>
    name.length > max ? name.slice(0, max - 1) + '…' : name

  return (
    <>
      {/* ── Progress modal ── */}
      {uploading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl flex flex-col items-center gap-4">
            <div className={`flex h-16 w-16 items-center justify-center rounded-full bg-reunion-100 ${preparing ? '' : 'animate-pulse'}`}>
              {preparing
                ? <ImageDown className="h-8 w-8 text-reunion-500" />
                : <CloudUpload className="h-8 w-8 text-reunion-600" />
              }
            </div>

            <div className="text-center">
              <p className="font-semibold text-gray-800 text-lg leading-tight">
                {preparing ? preparingLabel : 'Uploading your memories…'}
              </p>
              {fileTotal > 1 && (
                <p className="text-sm text-gray-500 mt-1">File {fileIdx} of {fileTotal}</p>
              )}
            </div>

            <p className="text-sm text-gray-500 font-medium text-center">{truncate(currentFileName)}</p>

            {preparing ? (
              <p className="text-xs text-gray-400 text-center">Original stays full quality — just making a fast preview</p>
            ) : (
              <div className="w-full">
                <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-reunion-500 transition-all duration-150 ease-linear"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-1.5 text-right text-xs text-gray-400">{progress}%</p>
              </div>
            )}

            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-center leading-relaxed">
              Keep this page open until the upload finishes
            </p>
          </div>
        </div>
      )}

      {/* ── Drop zone (locked during upload) ── */}
      <div className={`rounded-2xl border-2 border-dashed border-reunion-300 bg-reunion-50 p-4 sm:p-8 ${uploading ? 'opacity-50 pointer-events-none select-none' : ''}`}>
        <div className="mb-3 flex flex-col gap-2 sm:mb-4 sm:gap-3">
          <input
            type="text"
            placeholder="Your name (optional)"
            value={uploaderName}
            onChange={e => setUploaderName(e.target.value)}
            className="flex-1 rounded-lg border border-reunion-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-reunion-400 bg-white"
          />
          <input
            type="text"
            placeholder="Caption (optional)"
            value={caption}
            onChange={e => setCaption(e.target.value)}
            className="flex-1 rounded-lg border border-reunion-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-reunion-400 bg-white"
          />
        </div>

        <div
          className={`flex flex-col items-center gap-3 rounded-xl p-6 transition-colors cursor-pointer sm:gap-4 sm:p-8 ${
            dragging ? 'bg-reunion-100 border-reunion-500' : 'hover:bg-reunion-100/50'
          }`}
          onDragOver={e => { e.preventDefault(); if (!uploading) setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => !uploading && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,video/mp4,video/quicktime"
            multiple
            disabled={uploading}
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
          />

          <Upload className="h-10 w-10 text-reunion-400" />

          <div className="text-center">
            <p className="font-medium text-gray-700">Drop files here or click to browse</p>
            <p className="mt-1 text-sm text-gray-500">Photos (JPG, PNG, WEBP, HEIC) up to 20 MB</p>
            <p className="flex items-center justify-center gap-1 mt-0.5 text-sm text-gray-500">
              <Video className="h-3.5 w-3.5" /> Videos (MP4, MOV) up to 500 MB
            </p>
            <p className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700 leading-relaxed">
              Have a large video that won't upload? Send it to <span className="font-semibold">Yunus</span> directly and he'll add it for you.
            </p>
          </div>
        </div>

        {uploadedName && !uploading && !error && (
          <p className="mt-3 text-center text-sm text-green-600">✓ {uploadedName} uploaded!</p>
        )}
        {error && (
          <div className="mt-3 text-center">
            <p className="text-sm text-red-500">{error}</p>
            {failedFiles.length > 0 && (
              <button
                onClick={() => handleFiles(failedFiles)}
                className="mt-2 text-sm text-reunion-600 underline"
              >
                Try again
              </button>
            )}
          </div>
        )}
      </div>
    </>
  )
}
