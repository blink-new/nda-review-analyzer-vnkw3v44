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
You are an expert legal analyst specializing in Non-Disclosure Agreements (NDAs). Analyze the provided NDA document against the comprehensive oneNDA playbook standards and provide a detailed analysis.

COMPREHENSIVE oneNDA PLAYBOOK:

NON-NEGOTIABLE TERMS (Red Flags - High Risk):
These terms are either deliberately excluded from oneNDA or are baseline requirements that should not be compromised:

1. DEFINITION OF CONFIDENTIAL INFO (Baseline)
   - Issue: Overly specific definition limiting confidential information to specific types
   - oneNDA Rationale: Broad definition allows parties to share information without concern about whether it fits the definition, reducing risk of inadvertent disclosure
   - Action: Use broad definition covering all confidential information

2. MARKED OR IDENTIFIED (Deliberately excluded)
   - Issue: Requires confidential information to be marked as 'Confidential'
   - oneNDA Rationale: Disproportionately onerous for business to manage marking requirements
   - Action: Remove marking requirements entirely

3. PERSONAL DATA (Deliberately excluded)
   - Issue: Includes personal data handling clauses
   - oneNDA Rationale: Personal data subject to regulatory requirements not suitable for NDA
   - Action: Remove personal data clauses, handle separately

4. RESIDUALS (Deliberately excluded)
   - Issue: Allows use of confidential information retained in unaided memory for competitive purposes
   - oneNDA Rationale: Creates potential for abuse and competitive harm
   - Action: Remove residuals clause entirely

5. SHARING WITH REPRESENTATIVES (Baseline)
   - Issue: Removes right to share on need-to-know basis or disclaims liability for personnel
   - oneNDA Rationale: Parties need to share with representatives/advisors; each party should be responsible for their personnel
   - Action: Restore sharing rights with need-to-know basis

6. COPYING & REVERSE ENGINEERING (Deliberately excluded)
   - Issue: Allows copying or reverse engineering of confidential information
   - oneNDA Rationale: Not aligned with NDA purpose
   - Action: Remove all copying/reverse engineering permissions

7. DISCLOSURE BY LAW OR COURT ORDER (Baseline)
   - Issue: Removes ability to comply with legal/regulatory obligations
   - oneNDA Rationale: Disclosure should be acceptable if required by law
   - Action: Restore legal disclosure exceptions

8. RETURN/DESTRUCTION OF DATA (Baseline)
   - Issue: States cannot destroy or erase confidential information
   - oneNDA Rationale: Obligation to destroy/erase at discloser's request is fair
   - Action: Restore destruction/return obligations

9. INJUNCTIVE RELIEF (Baseline)
   - Issue: Excludes right to seek injunctive/equitable relief
   - oneNDA Rationale: Common law right that courts decide appropriateness
   - Action: Restore injunctive relief rights

10. INDEMNITY (Deliberately excluded)
    - Issue: Includes indemnification clauses
    - oneNDA Rationale: Overly onerous for NDA purposes
    - Action: Remove indemnification clauses

11. LIQUIDATED DAMAGES/PENALTIES (Deliberately excluded)
    - Issue: Includes predetermined penalties for breach
    - oneNDA Rationale: Overly onerous and potentially unenforceable
    - Action: Remove liquidated damages provisions

12. WARRANTIES & REPRESENTATIONS (Deliberately excluded)
    - Issue: Includes additional warranties beyond standard scope
    - oneNDA Rationale: Overly onerous for NDA purposes
    - Action: Remove additional warranties

13. LIABILITY (Deliberately excluded)
    - Issue: Limits or excludes liability for breaches
    - oneNDA Rationale: Receiver should remain liable for acts/omissions
    - Action: Remove liability limitations

14. NON-SOLICITATION (Deliberately excluded)
    - Issue: Includes employee non-solicitation clauses
    - oneNDA Rationale: Overly onerous for NDA purposes
    - Action: Remove non-solicitation clauses

15. ASSIGNMENT (Deliberately excluded)
    - Issue: Allows assignment without consent
    - oneNDA Rationale: Inappropriate, especially if receiver acquired by competitor
    - Action: Require consent for assignment

NEGOTIABLE TERMS (Yellow Flags - Medium Risk):
These are variable terms subject to business discretion:

1. GOVERNING LAW (Variable)
   - Issue: Alternative country's law governs agreement
   - oneNDA Rationale: Variable term at your discretion
   - Action: Consider convenience and familiarity

2. JURISDICTION (Variable)
   - Issue: Courts of another country have jurisdiction
   - oneNDA Rationale: Variable term at your discretion
   - Action: Consider cost and convenience

3. PURPOSE (Variable)
   - Issue: Limited definition of purpose
   - oneNDA Rationale: Variable term, but ensure broad enough for intended discussions
   - Action: Ensure purpose covers all intended uses

ANALYSIS REQUIREMENTS:
1. Identify problematic clauses with specific quotes from the document
2. Assess risk level based on oneNDA playbook (High for non-negotiable, Medium for negotiable)
3. Provide clear recommendations using oneNDA rationale
4. Generate copy-ready amendment language
5. Create overall risk score: 1-3 (Low - minor negotiable issues), 4-6 (Medium - multiple negotiable issues), 7-10 (High - non-negotiable issues present)
6. Make clear recommendation: SIGN (1-3 score), SIGN_WITH_AMENDMENTS (4-6 score), DO_NOT_SIGN (7-10 score)

Focus on practical, actionable advice that non-lawyers can understand and implement, using the specific oneNDA rationale for each issue.

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
      "whyItMatters": "Why this matters for non-lawyers (include oneNDA rationale)",
      "riskLevel": "High" | "Medium" | "Low"
    }
  ],
  "emailTemplate": "Professional email template for requesting amendments"
}
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
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('network') || error.message.includes('fetch')) {
        throw new Error('Network error occurred. Please check your connection and try again.')
      } else if (error.message.includes('rate limit')) {
        throw new Error('Too many requests. Please wait a moment and try again.')
      } else if (error.message.includes('authentication')) {
        throw new Error('Authentication error. Please sign in again.')
      }
    }
    
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