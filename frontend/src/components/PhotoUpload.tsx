import { useCallback, useRef, useState } from 'react'
import { Upload, Loader2, Video } from 'lucide-react'
import { uploadMedia } from '../lib/api'

interface Props {
  year: string
  onUploaded: () => void
}

export default function PhotoUpload({ year, onUploaded }: Props) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadedName, setUploadedName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [failedFiles, setFailedFiles] = useState<File[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploaderName, setUploaderName] = useState('')
  const [caption, setCaption] = useState('')

  const handleFiles = useCallback(
    async (files: FileList | File[] | null) => {
      if (!files || files.length === 0) return
      setError(null)
      setFailedFiles([])
      setUploading(true)
      try {
        for (const file of Array.from(files as FileList)) {
          await uploadMedia(file, year, uploaderName.trim() || undefined, caption.trim() || undefined)
          setUploadedName(file.name)
        }
        setCaption('')
        onUploaded()
      } catch (err) {
        setFailedFiles(Array.from(files as FileList))
        setError(err instanceof Error ? err.message : 'Upload failed')
      } finally {
        setUploading(false)
        if (inputRef.current) inputRef.current.value = ''
      }
    },
    [year, caption, uploaderName, onUploaded],
  )

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div className="rounded-2xl border-2 border-dashed border-reunion-300 bg-reunion-50 p-4 sm:p-8">
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
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,video/mp4,video/quicktime"
          multiple
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />

        {uploading ? (
          <Loader2 className="h-10 w-10 animate-spin text-reunion-500" />
        ) : (
          <Upload className="h-10 w-10 text-reunion-400" />
        )}

        <div className="text-center">
          <p className="font-medium text-gray-700">
            {uploading ? 'Uploading…' : 'Drop files here or click to browse'}
          </p>
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
  )
}
