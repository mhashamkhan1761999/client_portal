'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect } from 'react'

export default function TiptapEditor({
  content,
  onChange,
}: {
  content: string
  onChange: (val: string) => void
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none text-white',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    // If you need to avoid SSR hydration mismatch, use immediatelyRender directly if supported by your tiptap version
    immediatelyRender: false,
  })

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [content])

  if (!editor) return null

  return (
    <div className="bg-[#1e1e1e] text-white border border-gray-700 rounded p-3 min-h-[200px]">
      <EditorContent editor={editor} />
    </div>
  )
}
