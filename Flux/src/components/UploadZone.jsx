import { useCallback, useState } from 'react'

export default function UploadZone({ onFileSelected }) {
  const [dragging, setDragging] = useState(false)

  const handleFile = useCallback((file) => {
    if (!file) return
    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file.')
      return
    }
    if (file.size > 20_971_520) {
      alert('File size must be under 20MB.')
      return
    }
    onFileSelected(file)
  }, [onFileSelected])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }, [handleFile])

  const onDragOver  = (e) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = ()  => setDragging(false)

  const onInputChange = (e) => handleFile(e.target.files[0])

  return (
    <div className="relative group">
      {/* Ambient glow */}
      <div className="absolute -inset-0.5 primary-gradient rounded-xl blur opacity-20 group-hover:opacity-40 transition-opacity duration-1000 animate-pulse-glow" />

      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl py-20 px-6 transition-all duration-300 ${
          dragging
            ? 'border-primary bg-primary/5 drag-active'
            : 'border-outline-variant/30 bg-surface-container-low hover:bg-surface-container/50'
        }`}
      >
        {/* Icon */}
        <div className={`bg-surface-container-highest p-4 rounded-full mb-6 transition-transform duration-300 ${dragging ? 'scale-110' : 'group-hover:scale-105'}`}>
          <span className="material-symbols-outlined text-4xl text-primary">
            {dragging ? 'download' : 'cloud_upload'}
          </span>
        </div>

        <h3 className="text-2xl font-headline font-bold mb-2 text-on-surface">
          {dragging ? 'Drop it here!' : 'Drag & Drop Knowledge'}
        </h3>
        <p className="text-on-surface-variant mb-8 text-center max-w-md">
          Supported formats: <span className="text-on-surface font-medium">PDF</span> — Max file size: 20MB per document.
        </p>

        {/* Upload button */}
        <label className="btn-primary flex items-center gap-3 cursor-pointer">
          <span className="material-symbols-outlined">upload_file</span>
          Choose a PDF to Begin
          <input
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={onInputChange}
          />
        </label>

        {/* Drag hint */}
        <p className="mt-4 text-xs text-on-surface-variant">or drag and drop anywhere above</p>
      </div>
    </div>
  )
}
