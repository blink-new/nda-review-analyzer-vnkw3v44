import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Copy, Download, Eye, FileText } from 'lucide-react'
import { useToast } from '../hooks/use-toast'
import type { AnalysisResult } from '../services/ndaAnalysis'

interface RedlineViewProps {
  analysisResult: AnalysisResult
  originalText: string
}

interface RedlineChange {
  type: 'addition' | 'deletion' | 'replacement'
  originalText?: string
  newText?: string
  clauseName: string
  position: number
  reason: string
}

export function RedlineView({ analysisResult, originalText }: RedlineViewProps) {
  const [activeView, setActiveView] = useState<'redline' | 'clean'>('redline')
  const { toast } = useToast()

  // Generate redline changes from analysis result
  const generateRedlineChanges = (): RedlineChange[] => {
    const changes: RedlineChange[] = []
    
    analysisResult.clauses.forEach((clause, index) => {
      if (clause.recommendedAction === 'Remove') {
        changes.push({
          type: 'deletion',
          originalText: clause.currentLanguage,
          clauseName: clause.name,
          position: index,
          reason: clause.issue
        })
      } else if (clause.recommendedAction === 'Amend') {
        changes.push({
          type: 'replacement',
          originalText: clause.currentLanguage,
          newText: clause.suggestedLanguage,
          clauseName: clause.name,
          position: index,
          reason: clause.issue
        })
      } else if (clause.recommendedAction === 'Add') {
        changes.push({
          type: 'addition',
          newText: clause.suggestedLanguage,
          clauseName: clause.name,
          position: index,
          reason: clause.issue
        })
      }
    })
    
    return changes
  }

  const redlineChanges = generateRedlineChanges()

  // Generate redlined document with proper HTML formatting
  const generateRedlinedDocument = () => {
    let redlinedText = originalText
    const changes = generateRedlineChanges()
    
    // Sort changes by position to apply them correctly
    changes.sort((a, b) => b.position - a.position)
    
    changes.forEach((change) => {
      if (change.type === 'deletion' && change.originalText) {
        // Find and mark text for deletion
        const regex = new RegExp(escapeRegExp(change.originalText), 'gi')
        redlinedText = redlinedText.replace(regex, (match) => 
          `<span style="background-color: #fee2e2; color: #dc2626; text-decoration: line-through; padding: 2px 4px; border-radius: 3px; border: 1px solid #fecaca;" title="${change.reason}">${match}</span>`
        )
      } else if (change.type === 'replacement' && change.originalText && change.newText) {
        // Find and replace text
        const regex = new RegExp(escapeRegExp(change.originalText), 'gi')
        redlinedText = redlinedText.replace(regex, (match) => 
          `<span style="background-color: #fee2e2; color: #dc2626; text-decoration: line-through; padding: 2px 4px; border-radius: 3px; border: 1px solid #fecaca;" title="Original: ${change.reason}">${match}</span> <span style="background-color: #dbeafe; color: #2563eb; text-decoration: underline; padding: 2px 4px; border-radius: 3px; border: 1px solid #bfdbfe;" title="Replacement: ${change.reason}">${change.newText}</span>`
        )
      } else if (change.type === 'addition' && change.newText) {
        // Add new text at appropriate position
        redlinedText += `\n\n<span style="background-color: #dbeafe; color: #2563eb; text-decoration: underline; padding: 2px 4px; border-radius: 3px; border: 1px solid #bfdbfe;" title="Addition: ${change.reason}">${change.newText}</span>`
      }
    })
    
    return redlinedText
  }

  // Generate clean amended document
  const generateCleanDocument = () => {
    let cleanText = originalText
    const changes = generateRedlineChanges()
    
    // Sort changes by position to apply them correctly
    changes.sort((a, b) => b.position - a.position)
    
    changes.forEach((change) => {
      if (change.type === 'deletion' && change.originalText) {
        // Remove deleted text
        const regex = new RegExp(escapeRegExp(change.originalText), 'gi')
        cleanText = cleanText.replace(regex, '')
      } else if (change.type === 'replacement' && change.originalText && change.newText) {
        // Replace text
        const regex = new RegExp(escapeRegExp(change.originalText), 'gi')
        cleanText = cleanText.replace(regex, change.newText)
      } else if (change.type === 'addition' && change.newText) {
        // Add new text
        cleanText += `\n\n${change.newText}`
      }
    })
    
    return cleanText
  }

  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  const copyToClipboard = async (text: string) => {
    try {
      // Remove HTML tags for clipboard
      const cleanText = text.replace(/<[^>]*>/g, '')
      await navigator.clipboard.writeText(cleanText)
      toast({
        title: "Copied to clipboard",
        description: "Document has been copied successfully",
      })
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy document to clipboard",
        variant: "destructive"
      })
    }
  }

  const downloadDocument = (content: string, filename: string) => {
    const cleanContent = content.replace(/<[^>]*>/g, '')
    const blob = new Blob([cleanContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const redlinedDocument = generateRedlinedDocument()
  const cleanDocument = generateCleanDocument()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="h-5 w-5" />
          <span>Redlined NDA Document</span>
        </CardTitle>
        <CardDescription>
          View the exact changes needed with legal redline formatting - additions in blue, deletions in red and crossed out
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary of Changes */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-3">Summary of Changes</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {redlineChanges.filter(c => c.type === 'deletion').length}
              </div>
              <div className="text-sm text-red-700">Deletions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {redlineChanges.filter(c => c.type === 'addition').length}
              </div>
              <div className="text-sm text-blue-700">Additions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {redlineChanges.filter(c => c.type === 'replacement').length}
              </div>
              <div className="text-sm text-purple-700">Replacements</div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-gray-50 p-4 rounded-lg border">
          <h3 className="font-semibold text-gray-900 mb-3">Redline Legend</h3>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 bg-red-100 text-red-800 line-through text-sm rounded border border-red-200">
                Deleted text
              </span>
              <span className="text-sm text-gray-600">Text to be removed</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded underline border border-blue-200">
                Added text
              </span>
              <span className="text-sm text-gray-600">New text to be inserted</span>
            </div>
          </div>
        </div>

        {/* Document Tabs */}
        <Tabs value={activeView} onValueChange={(value) => setActiveView(value as 'redline' | 'clean')}>
          <div className="flex justify-between items-center">
            <TabsList>
              <TabsTrigger value="redline" className="flex items-center space-x-2">
                <Eye className="h-4 w-4" />
                <span>Redlined Version</span>
              </TabsTrigger>
              <TabsTrigger value="clean" className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Clean Amended Version</span>
              </TabsTrigger>
            </TabsList>
            
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(activeView === 'redline' ? redlinedDocument : cleanDocument)}
              >
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadDocument(
                  activeView === 'redline' ? redlinedDocument : cleanDocument,
                  `nda-${activeView}-version.txt`
                )}
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            </div>
          </div>

          <TabsContent value="redline" className="mt-4">
            <div className="border rounded-lg p-6 bg-white max-h-96 overflow-y-auto">
              <div 
                className="prose prose-sm max-w-none whitespace-pre-wrap font-mono text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: redlinedDocument }}
              />
            </div>
          </TabsContent>

          <TabsContent value="clean" className="mt-4">
            <div className="border rounded-lg p-6 bg-white max-h-96 overflow-y-auto">
              <div className="prose prose-sm max-w-none whitespace-pre-wrap font-mono text-sm leading-relaxed">
                {cleanDocument}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Change Details */}
        {redlineChanges.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Detailed Change Log</h3>
            <div className="space-y-3">
              {redlineChanges.map((change, index) => (
                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Badge variant={
                        change.type === 'deletion' ? 'destructive' :
                        change.type === 'addition' ? 'default' : 'secondary'
                      }>
                        {change.type.charAt(0).toUpperCase() + change.type.slice(1)}
                      </Badge>
                      <span className="font-medium text-sm">{change.clauseName}</span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">{change.reason}</p>
                  
                  {change.originalText && (
                    <div className="mb-2">
                      <div className="text-xs font-medium text-red-700 mb-1">Original:</div>
                      <div className="text-sm bg-red-50 p-2 rounded border border-red-200 line-through text-red-800">
                        "{change.originalText}"
                      </div>
                    </div>
                  )}
                  
                  {change.newText && (
                    <div>
                      <div className="text-xs font-medium text-blue-700 mb-1">
                        {change.type === 'replacement' ? 'Replacement:' : 'Addition:'}
                      </div>
                      <div className="text-sm bg-blue-50 p-2 rounded border border-blue-200 underline text-blue-800">
                        "{change.newText}"
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}