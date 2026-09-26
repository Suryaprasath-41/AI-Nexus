'use client'

import { useState, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Files as FilesIcon, Upload, FileText, Image as ImageIcon, FileCode, Trash2, Download } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface FileItem { id: string; name: string; size: number; type: string; uploadedAt: string }

export function FilesView() {
  const [files, setFiles] = useState<FileItem[]>([
    // demo entries to illustrate the UI
    { id: '1', name: 'research-notes.md', size: 24580, type: 'text/markdown', uploadedAt: new Date(Date.now() - 86400000).toISOString() },
    { id: '2', name: 'dataset.csv', size: 184320, type: 'text/csv', uploadedAt: new Date(Date.now() - 172800000).toISOString() },
    { id: '3', name: 'architecture.png', size: 524288, type: 'image/png', uploadedAt: new Date(Date.now() - 259200000).toISOString() },
  ])
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function addFiles(list: FileList | null) {
    if (!list) return
    const arr = Array.from(list).slice(0, 10)
    const newFiles: FileItem[] = arr.map((f, i) => ({
      id: `local-${Date.now()}-${i}`,
      name: f.name,
      size: f.size,
      type: f.type || 'application/octet-stream',
      uploadedAt: new Date().toISOString(),
    }))
    setFiles((prev) => [...newFiles, ...prev])
    toast.success(`Added ${arr.length} file${arr.length > 1 ? 's' : ''}`)
  }

  function fmtSize(n: number) {
    if (n < 1024) return `${n} B`
    if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`
    return `${(n / 1048576).toFixed(1)} MB`
  }

  function iconFor(type: string) {
    if (type.startsWith('image/')) return ImageIcon
    if (type.includes('code') || type.includes('javascript') || type.includes('json')) return FileCode
    return FileText
  }

  return (
    <div className="h-full overflow-y-auto custom-scroll">
      <div className="max-w-4xl mx-auto p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><FilesIcon className="h-6 w-6 text-primary" /> Files</h1>
          <p className="text-sm text-muted-foreground mt-1">Upload files to attach to your conversations. Files are processed securely.</p>
        </div>

        {/* Upload zone */}
        <Card
          className={cn('p-8 glass border-dashed border-2 text-center transition-colors cursor-pointer', dragging && 'border-primary bg-primary/5')}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }}
          onClick={() => inputRef.current?.click()}
        >
          <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
          <div className="h-12 w-12 rounded-xl bg-primary/15 flex items-center justify-center mx-auto mb-3">
            <Upload className="h-6 w-6 text-primary" />
          </div>
          <p className="font-medium">Drop files here or click to upload</p>
          <p className="text-xs text-muted-foreground mt-1">Max 25MB per file (Pro plan). Images, documents, code, data files.</p>
        </Card>

        {/* File list */}
        <div className="space-y-2">
          {files.length === 0 ? (
            <Card className="p-8 text-center glass">
              <FileText className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No files uploaded yet.</p>
            </Card>
          ) : (
            files.map((f) => {
              const Icon = iconFor(f.type)
              return (
                <Card key={f.id} className="p-3.5 glass flex items-center gap-3 hover:border-primary/30 transition-colors">
                  <div className="h-10 w-10 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{f.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span>{fmtSize(f.size)}</span>
                      <span>·</span>
                      <span>{new Date(f.uploadedAt).toLocaleDateString()}</span>
                      <Badge variant="outline" className="h-4 text-[9px]">{f.type.split('/')[1] || 'file'}</Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toast.info('Download coming soon')}><Download className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setFiles((p) => p.filter((x) => x.id !== f.id))}><Trash2 className="h-3.5 w-3.5" /></Button>
                </Card>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
