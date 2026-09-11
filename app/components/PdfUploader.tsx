"use client";

import { useState, type ChangeEvent } from "react";
import { MAX_PDF_FILES } from "@/lib/pdf/constants";
import type { PdfExtractionResult, PdfUploadResponse } from "@/lib/pdf/types";

export default function PdfUploader() {
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<PdfExtractionResult[] | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  function handleFilesSelected(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    setResults(null);

    if (selected.length > MAX_PDF_FILES) {
      setError(`You selected ${selected.length} files. Maximum allowed is ${MAX_PDF_FILES}.`);
      setFiles(selected.slice(0, MAX_PDF_FILES));
      return;
    }

    setError(null);
    setFiles(selected);
  }

  async function handleUpload() {
    if (files.length === 0) {
      setError("Select at least one PDF file first.");
      return;
    }

    setIsUploading(true);
    setError(null);
    setResults(null);

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data: PdfUploadResponse | { error: string } = await response.json();

      if (!response.ok) {
        const message = "error" in data ? data.error : "Upload failed.";
        throw new Error(message);
      }

      setResults((data as PdfUploadResponse).results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong during upload.");
    } finally {
      setIsUploading(false);
    }
  }

  function toggleExpanded(filename: string) {
    setExpanded((prev) => ({ ...prev, [filename]: !prev[filename] }));
  }

  return (
    <div className="flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-lg border border-black/[.08] p-6 dark:border-white/[.145]">
        <label htmlFor="pdf-input" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Select PDF files (up to {MAX_PDF_FILES})
        </label>
        <input
          id="pdf-input"
          type="file"
          accept="application/pdf,.pdf"
          multiple
          onChange={handleFilesSelected}
          className="text-sm text-zinc-600 file:mr-4 file:rounded-full file:border-0 file:bg-black file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-[#383838] dark:text-zinc-400 dark:file:bg-white dark:file:text-black dark:hover:file:bg-[#ccc]"
        />

        {files.length > 0 && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {files.length} file{files.length === 1 ? "" : "s"} selected
          </p>
        )}

        <button
          type="button"
          onClick={handleUpload}
          disabled={isUploading || files.length === 0}
          className="mt-2 w-fit rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-[#ccc]"
        >
          {isUploading ? "Extracting text..." : "Upload & Extract Text"}
        </button>
      </div>

      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {results && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
            Results ({results.length})
          </h2>

          {results.map((result) => (
            <div
              key={result.filename}
              className="rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-black dark:text-zinc-50">{result.filename}</p>

                {result.status === "success" && (
                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800 dark:bg-green-950 dark:text-green-300">
                    {result.numPages} page{result.numPages === 1 ? "" : "s"}
                  </span>
                )}
                {result.status === "duplicate" && (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                    Already processed
                  </span>
                )}
                {result.status === "error" && (
                  <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800 dark:bg-red-950 dark:text-red-300">
                    Failed
                  </span>
                )}
              </div>

              {result.status === "error" && (
                <p className="mt-2 text-sm text-red-700 dark:text-red-300">{result.error}</p>
              )}

              {result.status === "duplicate" && (
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {result.message} (document id {result.documentId})
                </p>
              )}

              {result.status === "success" && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(result.filename)}
                    className="text-sm font-medium text-zinc-950 underline underline-offset-2 dark:text-zinc-50"
                  >
                    {expanded[result.filename] ? "Hide extracted text" : "Show extracted text"}
                  </button>

                  {expanded[result.filename] && (
                    <div className="mt-3 flex max-h-96 flex-col gap-3 overflow-y-auto">
                      {result.pages.map((page) => (
                        <div key={page.page} className="rounded-md bg-zinc-50 p-3 dark:bg-zinc-900">
                          <p className="mb-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                            Page {page.page}
                          </p>
                          <p className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                            {page.text.trim() || "(no extractable text on this page)"}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
