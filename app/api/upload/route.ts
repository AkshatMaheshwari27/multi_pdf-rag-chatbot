import { NextRequest, NextResponse } from "next/server";
import { MAX_PDF_FILES } from "@/lib/pdf/constants";
import { processPdfFile } from "@/lib/pdf/parse";
import type { PdfUploadResponse } from "@/lib/pdf/types";

// pdf-parse relies on Node.js APIs (Buffer, filesystem-adjacent bits of
// pdfjs-dist), so this route must run in the Node.js runtime, not the Edge.
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Request must be multipart/form-data." }, { status: 400 });
  }

  const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File);

  if (files.length === 0) {
    return NextResponse.json(
      { error: "No files were provided. Attach one or more PDFs under the 'files' field." },
      { status: 400 }
    );
  }

  if (files.length > MAX_PDF_FILES) {
    return NextResponse.json(
      { error: `Too many files. Maximum allowed per upload is ${MAX_PDF_FILES}, received ${files.length}.` },
      { status: 400 }
    );
  }

  const results = await Promise.all(
    files.map(async (file) => {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return processPdfFile(file.name || "unnamed.pdf", buffer);
    })
  );

  const response: PdfUploadResponse = { count: results.length, results };

  return NextResponse.json(response);
}
