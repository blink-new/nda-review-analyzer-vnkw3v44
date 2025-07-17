import React, { useState, useEffect } from 'react'
import { Upload, FileText, AlertTriangle, CheckCircle, XCircle, Copy, Download, Mail, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { Button } from './components/ui/button'
import { Badge } from './components/ui/badge'
import { Textarea } from './components/ui/textarea'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './components/ui/accordion'
import { Alert, AlertDescription } from './components/ui/alert'
import { Progress } from './components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs'
import { useToast } from './hooks/use-toast'
import { Toaster } from './components/ui/toaster'
import { RedlineView } from './components/RedlineView'
import { blink } from './blink/client'
import { analyzeNDA, extractTextFromFile, type AnalysisResult } from './services/ndaAnalysis'

function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('upload')
  const [documentText, setDocumentText] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisProgress, setAnalysisProgress] = useState(0)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const { toast } = useToast()

  // Auth state management
  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      setAuthLoading(state.isLoading)
    })
    return unsubscribe
  }, [])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      try {
        const extractedText = await extractTextFromFile(file)
        setDocumentText(extractedText)
        toast({
          title: "File uploaded successfully",
          description: `Extracted text from ${file.name}`,
        })
      } catch (error) {
        toast({
          title: "Error uploading file",
          description: error instanceof Error ? error.message : "Failed to process file",
          variant: "destructive"
        })
      }
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      try {
        const extractedText = await extractTextFromFile(file)
        setDocumentText(extractedText)
        toast({
          title: "File uploaded successfully",
          description: `Extracted text from ${file.name}`,
        })
      } catch (error) {
        toast({
          title: "Error uploading file",
          description: error instanceof Error ? error.message : "Failed to process file",
          variant: "destructive"
        })
      }
    }
  }

  const analyzeDocument = async () => {
    if (!documentText.trim()) {
      toast({
        title: "No document to analyze",
        description: "Please upload a document or paste text first",
        variant: "destructive"
      })
      return
    }

    setIsAnalyzing(true)
    setAnalysisProgress(0)
    setActiveTab('results')

    // Simulate progress updates
    const progressInterval = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return 90
        }
        return prev + Math.random() * 15
      })
    }, 500)

    try {
      const result = await analyzeNDA(documentText)
      setAnalysisResult(result)
      setAnalysisProgress(100)
      
      toast({
        title: "Analysis complete",
        description: `Recommendation: ${result.recommendation.replace(/_/g, ' ')}`,
      })
    } catch (error) {
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Failed to analyze document",
        variant: "destructive"
      })
      setActiveTab('upload')
    } finally {
      setIsAnalyzing(false)
      clearInterval(progressInterval)
    }
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'High': return 'bg-red-100 text-red-800 border-red-200'
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'Low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'SIGN': return 'bg-green-100 text-green-800 border-green-200'
      case 'DO_NOT_SIGN': return 'bg-red-100 text-red-800 border-red-200'
      case 'SIGN_WITH_AMENDMENTS': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getRecommendationIcon = (recommendation: string) => {
    switch (recommendation) {
      case 'SIGN': return <CheckCircle className="h-5 w-5" />
      case 'DO_NOT_SIGN': return <XCircle className="h-5 w-5" />
      case 'SIGN_WITH_AMENDMENTS': return <AlertTriangle className="h-5 w-5" />
      default: return null
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Copied to clipboard",
        description: "Text has been copied successfully",
      })
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy text to clipboard",
        variant: "destructive"
      })
    }
  }

  // Show loading screen while auth is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Show sign-in prompt if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="bg-blue-600 p-3 rounded-lg w-fit mx-auto mb-4">
              <FileText className="h-8 w-8 text-white" />
            </div>
            <CardTitle className="text-2xl">NDA Review Analyzer</CardTitle>
            <CardDescription>
              Sign in to analyze your Non-Disclosure Agreements with AI
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => blink.auth.login()} 
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              Sign In to Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">NDA Review Analyzer</h1>
                <p className="text-sm text-gray-600">Smart legal document analysis for non-lawyers</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user.email}</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => blink.auth.logout()}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload">Upload & Analyze</TabsTrigger>
            <TabsTrigger value="results" disabled={!analysisResult && !isAnalyzing}>Analysis Results</TabsTrigger>
            <TabsTrigger value="redline" disabled={!analysisResult}>Redlined Document</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Upload Your NDA</CardTitle>
                <CardDescription>
                  Upload your Non-Disclosure Agreement in PDF, DOCX, or paste the text directly
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* File Upload */}
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
                    isDragOver 
                      ? 'border-blue-400 bg-blue-50' 
                      : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <Upload className={`h-12 w-12 mx-auto mb-4 ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`} />
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    Drag and drop your NDA here
                  </p>
                  <p className="text-sm text-gray-600 mb-4">
                    Supports PDF, DOCX, and TXT files
                  </p>
                  <input
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload">
                    <Button variant="outline" className="cursor-pointer">
                      Choose File
                    </Button>
                  </label>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500">Or paste text directly</span>
                  </div>
                </div>

                {/* Text Input */}
                <div>
                  <Textarea
                    placeholder="Paste your NDA text here..."
                    value={documentText}
                    onChange={(e) => setDocumentText(e.target.value)}
                    className="min-h-[200px] resize-none"
                  />
                </div>

                <Button
                  onClick={analyzeDocument}
                  disabled={!documentText.trim() || isAnalyzing}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    'Analyze NDA'
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            {isAnalyzing && (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                      <span className="text-lg font-medium">Analyzing your NDA with AI...</span>
                    </div>
                    <Progress value={analysisProgress} className="w-full" />
                    <p className="text-sm text-gray-600">
                      Checking clauses against oneNDA playbook standards
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {analysisResult && (
              <>
                {/* Executive Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <span>Executive Summary</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Recommendation */}
                    <div className="flex items-center space-x-4">
                      <Badge className={`px-4 py-2 text-lg font-medium ${getRecommendationColor(analysisResult.recommendation)}`}>
                        <span className="flex items-center space-x-2">
                          {getRecommendationIcon(analysisResult.recommendation)}
                          <span>{analysisResult.recommendation.replace(/_/g, ' ')}</span>
                        </span>
                      </Badge>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-700">Risk Score:</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                analysisResult.riskScore <= 3 ? 'bg-green-500' :
                                analysisResult.riskScore <= 6 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${analysisResult.riskScore * 10}%` }}
                            ></div>
                          </div>
                          <span className="text-lg font-bold">{analysisResult.riskScore}/10</span>
                        </div>
                      </div>
                    </div>

                    {/* Key Concerns */}
                    {analysisResult.keyConcerns.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Key Concerns</h3>
                        <ul className="space-y-2">
                          {analysisResult.keyConcerns.map((concern, index) => (
                            <li key={index} className="flex items-start space-x-2">
                              <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                              <span className="text-gray-700">{concern}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Detailed Analysis */}
                {analysisResult.clauses.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Detailed Clause Analysis</CardTitle>
                      <CardDescription>
                        Click on each clause to see detailed recommendations
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Accordion type="single" collapsible className="w-full">
                        {analysisResult.clauses.map((clause) => (
                          <AccordionItem key={clause.id} value={clause.id}>
                            <AccordionTrigger className="text-left">
                              <div className="flex items-center space-x-3">
                                <Badge className={getRiskColor(clause.riskLevel)}>
                                  {clause.riskLevel}
                                </Badge>
                                <span className="font-medium">{clause.name}</span>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="space-y-4">
                              <Alert>
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                  <strong>Issue:</strong> {clause.issue}
                                </AlertDescription>
                              </Alert>

                              <div className="space-y-3">
                                <div>
                                  <h4 className="font-medium text-red-700 mb-2">❌ Current Language:</h4>
                                  <div className="bg-red-50 p-3 rounded border border-red-200">
                                    <p className="text-sm italic">"{clause.currentLanguage}"</p>
                                  </div>
                                </div>

                                <div>
                                  <h4 className="font-medium text-blue-700 mb-2">✅ Recommended Action: {clause.recommendedAction}</h4>
                                  <div className="bg-blue-50 p-3 rounded border border-blue-200">
                                    <p className="text-sm">"{clause.suggestedLanguage}"</p>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="mt-2"
                                      onClick={() => copyToClipboard(clause.suggestedLanguage)}
                                    >
                                      <Copy className="h-4 w-4 mr-1" />
                                      Copy Language
                                    </Button>
                                  </div>
                                </div>

                                <div>
                                  <h4 className="font-medium text-gray-700 mb-2">🎯 Why This Matters:</h4>
                                  <p className="text-sm text-gray-600">{clause.whyItMatters}</p>
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </CardContent>
                  </Card>
                )}

                {/* Email Template */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Mail className="h-5 w-5" />
                      <span>Copy-Ready Email Response</span>
                    </CardTitle>
                    <CardDescription>
                      Send this to your counterparty to request amendments
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-50 p-4 rounded-lg border">
                      <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                        {analysisResult.emailTemplate}
                      </pre>
                    </div>
                    <div className="flex space-x-2 mt-4">
                      <Button
                        variant="outline"
                        onClick={() => copyToClipboard(analysisResult.emailTemplate)}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Email
                      </Button>
                      <Button variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Export Report
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="redline" className="space-y-6">
            {analysisResult && (
              <RedlineView 
                analysisResult={analysisResult} 
                originalText={documentText}
              />
            )}
          </TabsContent>
        </Tabs>
      </main>
      
      <Toaster />
    </div>
  )
}

export default App