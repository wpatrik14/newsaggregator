"use client"

import { useEffect, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ApiStatusBanner() {
  const [openAiKeyStatus, setOpenAiKeyStatus] = useState<"checking" | "valid" | "invalid" | "error">("checking")
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  const checkApiStatus = async () => {
    try {
      setIsChecking(true)
      setOpenAiKeyStatus("checking")

      // Check OpenAI API key status
      const openAiResponse = await fetch("/api/check-openai")
      const openAiData = await openAiResponse.json()

      if (openAiData.available) {
        setOpenAiKeyStatus("valid")
        setStatusMessage("OpenAI API key is valid and working correctly.")
      } else {
        setOpenAiKeyStatus("invalid")
        setStatusMessage(openAiData.message || "OpenAI API key is invalid or not working correctly.")
      }

      console.log("OpenAI API status:", openAiData)
    } catch (error) {
      console.error("Error checking API status:", error)
      setOpenAiKeyStatus("error")
      setStatusMessage("Error checking OpenAI API status. Please try again.")
    } finally {
      setIsChecking(false)
    }
  }

  useEffect(() => {
    checkApiStatus()
  }, [])

  if (openAiKeyStatus === "checking") {
    return (
      <Alert className="mb-4">
        <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-t-2 border-primary" />
        <AlertTitle>Checking OpenAI API Status</AlertTitle>
        <AlertDescription>Verifying that your OpenAI API key is working correctly...</AlertDescription>
      </Alert>
    )
  }

  if (openAiKeyStatus === "valid") {
    return (
      <Alert variant="success" className="mb-4 bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-100">
        <CheckCircle className="h-4 w-4" />
        <AlertTitle>OpenAI API Connected</AlertTitle>
        <AlertDescription>{statusMessage}</AlertDescription>
      </Alert>
    )
  }

  if (openAiKeyStatus === "invalid" || openAiKeyStatus === "error") {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>OpenAI API Issue Detected</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>{statusMessage}</p>
          <Button variant="outline" size="sm" onClick={checkApiStatus} disabled={isChecking} className="mt-2">
            {isChecking ? "Checking..." : "Check API Status"}
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return null
}
