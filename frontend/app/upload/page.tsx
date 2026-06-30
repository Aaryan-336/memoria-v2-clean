"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  Upload,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  FileText,
  FileAudio,
  Image as ImageIcon,
  AlertCircle,
  HelpCircle,
} from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/components/auth/auth-provider"
import { createClient as createBrowserClient } from "@/lib/supabase/client"
import { useWorkspace } from "@/lib/workspace"
import { WorkspaceSwitcher } from "@/components/ui/workspace-switcher"
import { apiUrl } from "@/lib/api"

type UploadStatus = "idle" | "uploading" | "processing" | "success" | "error"

export default function UploadPage() {
  const { user, loading: authLoading } = useAuth()
  const { currentWorkspace } = useWorkspace()
  const router = useRouter()

  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<UploadStatus>("idle")
  const [progress, setProgress] = useState(0)
  const [statusMessage, setStatusMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0])
    }
  }

  const validateAndSetFile = (selectedFile: File) => {
    setErrorMessage("")
    const ext = selectedFile.name.split(".").pop()?.toLowerCase() || ""
    const isDoc = ["pdf", "ppt", "pptx", "png", "jpg", "jpeg", "webp"].includes(ext)
    const isAudio = ["mp3", "wav", "m4a", "webm", "ogg"].includes(ext)

    if (!isDoc && !isAudio) {
      setErrorMessage("Unsupported file type. Please upload a PDF, PPTX, image, or audio file.")
      return
    }

    const sizeLimit = isAudio ? 25 * 1024 * 1024 : 10 * 1024 * 1024
    if (selectedFile.size > sizeLimit) {
      const limitMb = isAudio ? 25 : 10
      setErrorMessage(`File exceeds size limit. Maximum size is ${limitMb}MB for this format.`)
      return
    }

    setFile(selectedFile)
    setStatus("idle")
  }

  const handleUpload = async () => {
    if (!file) return
    setStatus("uploading")
    setProgress(15)
    setStatusMessage("Uploading file to server...")
    setErrorMessage("")

    try {
      const supabase = createBrowserClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const formData = new FormData()
      formData.append("file", file)
      if (currentWorkspace?.id && currentWorkspace.id !== "personal") {
        formData.append("workspace_id", currentWorkspace.id)
      }

      // Start upload progress simulation
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 65) {
            clearInterval(interval)
            return 65
          }
          return prev + 10
        })
      }, 300)

      const response = await fetch(apiUrl("/api/upload"), {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      })

      clearInterval(interval)

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.detail || "Upload or processing failed")
      }

      setProgress(85)
      setStatus("processing")
      setStatusMessage("Extracting contents and generating notes with AI...")

      const result = await response.json()
      
      setProgress(100)
      setStatus("success")
      setStatusMessage("Success! Structured study kit is ready.")

      setTimeout(() => {
        router.push(`/notes/${result.note.id}`)
      }, 1500)

    } catch (e: any) {
      setStatus("error")
      setErrorMessage(e.message || "Failed to process file. Please try again.")
    }
  }

  const getFileIcon = () => {
    if (!file) return <Upload className="w-10 h-10 text-muted-foreground/60" />
    const ext = file.name.split(".").pop()?.toLowerCase() || ""
    if (ext === "pdf" || ext.startsWith("ppt")) return <FileText className="w-10 h-10 text-[#1A5FA0]" />
    if (["png", "jpg", "jpeg", "webp"].includes(ext)) return <ImageIcon className="w-10 h-10 text-[#A05F1A]" />
    return <FileAudio className="w-10 h-10 text-[#1AA05F]" />
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="memoria-container py-8 lg:py-12 max-w-2xl">
        {/* Header */}
        <div className="relative z-30 flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4 animate-memoria-fade-in">
          <div>
            <Link
              href="/"
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-4 transition-colors font-semibold"
            >
              <ArrowLeft className="w-4 h-4" /> Back to dashboard
            </Link>
            <h1 className="text-foreground mb-2">Upload Material</h1>
            <p className="text-muted-foreground text-sm">
              Ingest documents, slides, images, or audio recordings into your study brain.
            </p>
          </div>
          <div className="flex items-center">
            <WorkspaceSwitcher />
          </div>
        </div>

        {/* Upload Container */}
        <div className="memoria-card p-8 shadow-[var(--shadow-card)] animate-memoria-fade-in stagger-1">
          {status === "idle" && (
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-[20px] p-10 text-center cursor-pointer transition-all ${
                dragActive
                  ? "border-[var(--accent-forest)] bg-[rgba(45,106,79,0.04)]"
                  : "border-border/80 hover:border-[var(--accent-forest)] hover:bg-secondary/20"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept=".pdf,.ppt,.pptx,.png,.jpg,.jpeg,.webp,.mp3,.wav,.m4a,.webm,.ogg"
              />

              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-secondary rounded-full">
                  {getFileIcon()}
                </div>
                {file ? (
                  <div>
                    <p className="text-foreground font-bold text-base max-w-md mx-auto truncate">
                      {file.name}
                    </p>
                    <p className="text-muted-foreground text-xs mt-1">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-foreground font-semibold text-sm">
                      Drag & drop your study material, or click to browse
                    </p>
                    <p className="text-muted-foreground text-xs mt-2 leading-relaxed max-w-sm mx-auto">
                      Supports PDF, PowerPoint presentations, handwritten image notes, and audio recording uploads.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Area for Idle State */}
          {status === "idle" && file && (
            <div className="mt-6 flex gap-3 animate-memoria-scale-in">
              <button
                onClick={() => setFile(null)}
                className="flex-1 py-3 border border-border/85 text-muted-foreground hover:text-foreground hover:bg-secondary/40 font-bold text-xs rounded-full transition-all cursor-pointer"
              >
                Clear File
              </button>
              <button
                onClick={handleUpload}
                className="flex-1 py-3 text-white font-bold text-xs rounded-full transition-all cursor-pointer shadow-md hover:opacity-90"
                style={{ background: "var(--accent-forest)" }}
              >
                Start Ingestion
              </button>
            </div>
          )}

          {/* Processing / Progress States */}
          {(status === "uploading" || status === "processing") && (
            <div className="py-6 flex flex-col items-center gap-6 animate-memoria-fade-in">
              <Loader2 className="w-10 h-10 text-[var(--accent-sky)] animate-spin" />
              <div className="text-center w-full">
                <h3 className="text-foreground font-bold text-base mb-2">{statusMessage}</h3>
                <div className="w-full h-2 bg-secondary border border-border/40 rounded-full overflow-hidden max-w-md mx-auto">
                  <div
                    className="h-full bg-[var(--accent-sky)] rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-muted-foreground text-xs font-semibold mt-2 block">{progress}%</span>
              </div>
            </div>
          )}

          {/* Success State */}
          {status === "success" && (
            <div className="py-8 flex flex-col items-center gap-4 text-center animate-memoria-scale-in">
              <CheckCircle2 className="w-16 h-16 text-[var(--accent-green)]" />
              <div>
                <h3 className="text-foreground font-bold text-lg mb-1">{statusMessage}</h3>
                <p className="text-muted-foreground text-xs">Redirecting to note study guide...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {status === "error" && (
            <div className="py-4 flex flex-col items-center gap-4 text-center animate-memoria-scale-in">
              <AlertCircle className="w-14 h-14 text-[var(--accent-coral)]" />
              <div>
                <h3 className="text-foreground font-bold text-base mb-2">Ingestion Failed</h3>
                <p className="text-muted-foreground text-xs leading-relaxed max-w-md mx-auto">
                  {errorMessage}
                </p>
              </div>
              <button
                onClick={() => setStatus("idle")}
                className="mt-4 px-6 py-2.5 bg-secondary hover:bg-muted text-foreground border border-border/80 rounded-full text-xs font-bold transition-all cursor-pointer"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Tip Box */}
        <div className="mt-6 flex gap-3 items-start bg-[rgba(107,203,139,0.08)] border border-[rgba(107,203,139,0.2)] rounded-[20px] p-5 animate-memoria-fade-in stagger-2">
          <HelpCircle className="w-5 h-5 text-[var(--accent-mint)] flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-foreground font-bold text-xs uppercase tracking-wider mb-1">
              Supported Formats & Size Limits
            </h4>
            <ul className="text-muted-foreground text-xs leading-relaxed space-y-1 list-disc pl-4">
              <li>
                <strong>PDF / PowerPoint:</strong> Up to 10MB. Transcribes text layout.
              </li>
              <li>
                <strong>Image notes:</strong> Up to 10MB (PNG, JPG, WEBP). Claude OCR processes layout.
              </li>
              <li>
                <strong>Audio files:</strong> Up to 25MB (MP3, M4A, WAV). Whisper transcription.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
