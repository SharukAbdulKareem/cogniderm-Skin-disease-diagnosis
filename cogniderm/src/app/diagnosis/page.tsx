// pages/diagnosis.js

"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DiagnosisPage() {
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);

      // Create a preview of the image
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsLoading(true);
    setResult(null);
    setConfidence(null);

    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch("http://localhost:5000/predict", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();
      setResult(data.result);
      setConfidence(data.confidence);
    } catch (error) {
      console.error("Error:", error);
      setResult("Error occurred during prediction");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-center text-purple-600">
        Skin Disease Detection
      </h1>
      <div className="grid md:grid-cols-2 gap-8">
        {/* Image Upload Card */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-purple-400">Upload Image</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col items-center space-y-4">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Selected Image"
                    className="rounded-lg w-full h-auto"
                  />
                ) : (
                  <div className="w-full h-64 bg-gray-100 flex items-center justify-center rounded-lg">
                    <span className="text-gray-500">No image selected</span>
                  </div>
                )}
                <Input
                  type="file"
                  onChange={handleFileChange}
                  accept="image/*"
                  className="text-purple-700 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                />
                <Button
                  type="submit"
                  disabled={!file || isLoading}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {isLoading ? "Analyzing..." : "Upload and Predict"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Analysis Results Card */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-purple-400">Analysis Results</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                {/* Loading Spinner */}
                <svg
                  className="animate-spin h-10 w-10 text-purple-600"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.372 0 0 5.372 0 12h4z"
                  ></path>
                </svg>
              </div>
            ) : result ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-purple-300">Result:</h3>
                <p className="text-purple-100">{result}</p>
                {confidence !== null && (
                  <p className="text-purple-400">
                    Confidence: {(confidence * 100).toFixed(2)}%
                  </p>
                )}
              </div>
            ) : (
              <div className="text-gray-500">
                Upload an image to see the analysis results.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
