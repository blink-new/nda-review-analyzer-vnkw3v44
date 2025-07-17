import { blink } from '../blink/client'

export interface AnalysisResult {
  recommendation: 'SIGN' | 'DO_NOT_SIGN' | 'SIGN_WITH_AMENDMENTS'
  riskScore: number
  keyConcerns: string[]
  clauses: ClauseAnalysis[]
  emailTemplate: string
}

export interface ClauseAnalysis {
  id: string
  name: string
  issue: string
  currentLanguage: string
  recommendedAction: 'Remove' | 'Amend' | 'Add'
  suggestedLanguage: string
  whyItMatters: string
  riskLevel: 'High' | 'Medium' | 'Low'
}

const NDA_ANALYSIS_PROMPT = `
You are an expert legal analyst specializing in Non-Disclosure Agreements (NDAs). Analyze the provided NDA document against the oneNDA playbook standards and provide a comprehensive analysis.

ANALYSIS FRAMEWORK:

NON-NEGOTIABLE TERMS (Red Flags - High Risk):
- Marking requirements for confidential info
- Personal data provisions
- Residuals clauses
- Removal of sharing rights
- Copying/reverse engineering permissions
- Removal of disclosure by law provisions
- Inability to destroy/return data
- Exclusion of injunctive relief
- Indemnities
- Liquidated damages/penalties
- Additional warranties
- Liability limitations
- Non-solicitation clauses
- Assignment without consent

NEGOTIABLE TERMS (Yellow Flags - Medium Risk):
- Governing law
- Jurisdiction
- Purpose definition
- Term duration
- Definition scope

ANALYSIS REQUIREMENTS:
1. Identify problematic clauses with specific quotes
2. Assess risk level for each issue
3. Provide clear recommendations in plain English
4. Generate copy-ready amendment language
5. Create an overall risk score (1-10)
6. Make a clear SIGN/DON'T SIGN/AMEND recommendation

Respond in JSON format with the following structure:
{
  "recommendation": "SIGN" | "DO_NOT_SIGN" | "SIGN_WITH_AMENDMENTS",
  "riskScore": number (1-10),
  "keyConcerns": ["concern1", "concern2", ...],
  "clauses": [
    {
      "id": "unique_id",
      "name": "Clause Name",
      "issue": "Plain English explanation of the problem",
      "currentLanguage": "Exact quote from the document",
      "recommendedAction": "Remove" | "Amend" | "Add",
      "suggestedLanguage": "Proposed replacement text",
      "whyItMatters": "Why this matters for non-lawyers",
      "riskLevel": "High" | "Medium" | "Low"
    }
  ],
  "emailTemplate": "Professional email template for requesting amendments"
}

Focus on practical, actionable advice that non-lawyers can understand and implement.
`

export async function analyzeNDA(documentText: string): Promise<AnalysisResult> {
  try {
    const { object } = await blink.ai.generateObject({
      prompt: `${NDA_ANALYSIS_PROMPT}\n\nNDA DOCUMENT TO ANALYZE:\n\n${documentText}`,
      schema: {
        type: 'object',
        properties: {
          recommendation: {
            type: 'string',
            enum: ['SIGN', 'DO_NOT_SIGN', 'SIGN_WITH_AMENDMENTS']
          },
          riskScore: {
            type: 'number',
            minimum: 1,
            maximum: 10
          },
          keyConcerns: {
            type: 'array',
            items: { type: 'string' }
          },
          clauses: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                issue: { type: 'string' },
                currentLanguage: { type: 'string' },
                recommendedAction: {
                  type: 'string',
                  enum: ['Remove', 'Amend', 'Add']
                },
                suggestedLanguage: { type: 'string' },
                whyItMatters: { type: 'string' },
                riskLevel: {
                  type: 'string',
                  enum: ['High', 'Medium', 'Low']
                }
              },
              required: ['id', 'name', 'issue', 'currentLanguage', 'recommendedAction', 'suggestedLanguage', 'whyItMatters', 'riskLevel']
            }
          },
          emailTemplate: { type: 'string' }
        },
        required: ['recommendation', 'riskScore', 'keyConcerns', 'clauses', 'emailTemplate']
      }
    })

    return object as AnalysisResult
  } catch (error) {
    console.error('Error analyzing NDA:', error)
    throw new Error('Failed to analyze NDA. Please try again.')
  }
}

export async function extractTextFromFile(file: File): Promise<string> {
  try {
    // For PDF and DOCX files, we'll use Blink's data extraction
    if (file.type === 'application/pdf' || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const extractedText = await blink.data.extractFromBlob(file)
      return extractedText
    }
    
    // For text files, read directly
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = reject
      reader.readAsText(file)
    })
  } catch (error) {
    console.error('Error extracting text from file:', error)
    throw new Error('Failed to extract text from file. Please try again or paste the text directly.')
  }
}