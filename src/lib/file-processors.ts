import { supabase } from "@/integrations/supabase/client";

/**
 * Extract text from a plain text file (.txt, .md)
 */
export async function extractTextFromPlain(file: File): Promise<string> {
  return await file.text();
}

/**
 * Extract text from a PDF using pdf.js
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  // Use the bundled worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(" ");
    pages.push(pageText);
  }

  const text = pages.join("\n\n");

  // If PDF has very little text, it might be scanned — use OCR
  if (text.trim().length < 50 && pdf.numPages > 0) {
    return await extractTextViaOCR(file);
  }

  return text;
}

/**
 * Extract text from a DOCX using mammoth
 */
export async function extractTextFromDOCX(file: File): Promise<string> {
  const mammoth = await import("mammoth");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

/**
 * Extract text from an image using server-side OCR (Gemini vision)
 */
export async function extractTextViaOCR(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const base64 = btoa(
    new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
  );

  const { data, error } = await supabase.functions.invoke("extract-text", {
    body: {
      fileData: base64,
      mimeType: file.type,
      fileName: file.name,
    },
  });

  if (error) throw new Error(error.message || "OCR extraction failed");
  return data.text || "";
}

const ARCHIVE_ENTRY_EXTENSIONS = ["txt", "md", "pdf", "docx", "doc", "png", "jpg", "jpeg", "gif", "bmp", "webp", "tiff"] as const;

const ARCHIVE_ENTRY_MIME_TYPES: Record<string, string> = {
  txt: "text/plain",
  md: "text/plain",
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  doc: "application/msword",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  bmp: "image/bmp",
  webp: "image/webp",
  tiff: "image/tiff",
};

function getFileExtension(fileName: string): string {
  return fileName.toLowerCase().split(".").pop() || "";
}

function isSupportedArchiveEntry(fileName: string): boolean {
  return ARCHIVE_ENTRY_EXTENSIONS.includes(getFileExtension(fileName) as (typeof ARCHIVE_ENTRY_EXTENSIONS)[number]);
}

function getArchiveEntryMimeType(fileName: string): string {
  return ARCHIVE_ENTRY_MIME_TYPES[getFileExtension(fileName)] || "application/octet-stream";
}

function createFileFromUint8Array(bytes: Uint8Array, fileName: string): File {
  const normalizedBytes = new Uint8Array(bytes.byteLength);
  normalizedBytes.set(bytes);
  return new File([normalizedBytes.buffer], fileName, { type: getArchiveEntryMimeType(fileName) });
}

async function loadSevenZip() {
  const { default: SevenZipFactory } = await import("7z-wasm/7zz.umd.js");
  return SevenZipFactory({
    locateFile: (path) => (path === "7zz.wasm" ? "/wasm/7zz.wasm" : path),
    print: () => undefined,
    printErr: () => undefined,
  });
}

/**
 * Extract files from a ZIP archive
 */
export async function extractFilesFromZIP(file: File): Promise<File[]> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(file);
  const files: File[] = [];

  for (const [name, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    if (name.startsWith("__MACOSX") || name.startsWith(".")) continue;

    const normalizedName = name.split("/").pop() || name;
    if (!isSupportedArchiveEntry(normalizedName)) continue;

    const bytes = await entry.async("uint8array");
    files.push(createFileFromUint8Array(bytes, normalizedName));
  }

  return files;
}

/**
 * Extract files from a 7z archive in the browser using the UMD build of 7z-wasm.
 * This avoids the package's ESM top-level await issue and the unavailable server-side 7z binary.
 */
export async function extractFilesFrom7Z(file: File): Promise<File[]> {
  const sevenZip = await loadSevenZip();
  const archivePath = `/${file.name}`;
  const outputDir = "/extracted";

  sevenZip.FS.mkdir(outputDir);
  sevenZip.FS.writeFile(archivePath, new Uint8Array(await file.arrayBuffer()));

  try {
    sevenZip.callMain(["x", archivePath, `-o${outputDir}`, "-y"]);

    const files: File[] = [];

    const walkDirectory = (dirPath: string) => {
      for (const entry of sevenZip.FS.readdir(dirPath)) {
        if (entry === "." || entry === "..") continue;
        if (entry.startsWith("__MACOSX") || entry.startsWith(".")) continue;

        const fullPath = `${dirPath}/${entry}`;
        const stat = sevenZip.FS.stat(fullPath);

        if (sevenZip.FS.isDir(stat.mode)) {
          walkDirectory(fullPath);
          continue;
        }

        if (!isSupportedArchiveEntry(entry)) continue;
        const bytes = sevenZip.FS.readFile(fullPath, { encoding: "binary" });
        files.push(createFileFromUint8Array(bytes, entry));
      }
    };

    walkDirectory(outputDir);

    if (files.length === 0) {
      throw new Error("No supported files found in 7z archive");
    }

    return files;
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "7z extraction failed");
  }
}

/**
 * Check if a file is an archive (zip or 7z)
 */
export function isArchiveFile(file: File): boolean {
  const ext = getFileExtension(file.name);
  return ext === "zip" || ext === "7z" || file.type === "application/zip" || file.type === "application/x-zip-compressed" || file.type === "application/x-7z-compressed";
}

/**
 * Extract files from any supported archive
 */
export async function extractFilesFromArchive(file: File): Promise<File[]> {
  const ext = getFileExtension(file.name);
  if (ext === "7z" || file.type === "application/x-7z-compressed") {
    return extractFilesFrom7Z(file);
  }
  return extractFilesFromZIP(file);
}

/**
 * Process a single file and return extracted text
 */
export async function processFile(file: File): Promise<string> {
  const ext = file.name.toLowerCase().split(".").pop() || "";
  const type = file.type;

  if (ext === "txt" || ext === "md" || type === "text/plain") {
    return extractTextFromPlain(file);
  }

  if (ext === "pdf" || type === "application/pdf") {
    return extractTextFromPDF(file);
  }

  if (ext === "docx" || type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return extractTextFromDOCX(file);
  }

  if (type.startsWith("image/")) {
    return extractTextViaOCR(file);
  }

  throw new Error(`Unsupported file type: ${ext || type}`);
}

/**
 * Process potentially multiple files (handles ZIP extraction)
 */
/**
 * Natural sort comparator for file names (handles numeric sequences)
 */
function naturalSort(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * Clean extracted text: remove common non-essay artifacts
 * (page numbers, headers/footers, form fields, watermarks, etc.)
 */
function cleanExtractedText(text: string): string {
  return text
    // Remove standalone page numbers like "1", "- 2 -", "Page 3", "第3頁"
    .replace(/^[\s]*[-–—]?\s*\d+\s*[-–—]?\s*$/gm, '')
    .replace(/^[\s]*(Page|page|PAGE|p\.?)\s*\d+\s*$/gm, '')
    .replace(/^[\s]*第\s*\d+\s*[頁页]\s*$/gm, '')
    // Remove common header/footer patterns
    .replace(/^[\s]*(CONFIDENTIAL|DRAFT|DO NOT DISTRIBUTE|©.*|Copyright.*|All rights reserved.*)$/gmi, '')
    // Remove repeated dashes/underscores used as separators (5+ chars)
    .replace(/^[\s]*[-_=]{5,}[\s]*$/gm, '')
    // Remove lines that are only whitespace
    .replace(/^\s+$/gm, '')
    // Collapse 3+ consecutive blank lines into 2
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Count words accurately for mixed CJK + Latin text
 */
export function countWords(text: string): number {
  if (!text.trim()) return 0;
  // Count CJK characters (each is a "word")
  const cjkMatches = text.match(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u{20000}-\u{2a6df}\u{2a700}-\u{2b73f}\u{2b740}-\u{2b81f}\u3000-\u303f\uff00-\uffef]/gu);
  const cjkCount = cjkMatches ? cjkMatches.length : 0;
  // Remove CJK chars, then count Latin words by whitespace
  const withoutCjk = text.replace(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff\u{20000}-\u{2a6df}\u{2a700}-\u{2b73f}\u{2b740}-\u{2b81f}\u3000-\u303f\uff00-\uffef]/gu, ' ');
  const latinWords = withoutCjk.split(/\s+/).filter(w => w.length > 0);
  return cjkCount + latinWords.length;
}

/**
 * Process potentially multiple files (handles ZIP extraction)
 * Files are sorted by name for correct ordering.
 */
export async function processFiles(files: File[]): Promise<{ text: string; fileNames: string[] }> {
  // Sort files by name naturally so pages/parts appear in order
  const sorted = [...files].sort((a, b) => naturalSort(a.name, b.name));

  const results: { name: string; text: string }[] = [];

  for (const file of sorted) {
    const ext = file.name.toLowerCase().split(".").pop() || "";

    if (isArchiveFile(file)) {
      const extracted = await extractFilesFromArchive(file);
      // Sort extracted files too
      extracted.sort((a, b) => naturalSort(a.name, b.name));
      for (const f of extracted) {
        const text = cleanExtractedText(await processFile(f));
        if (text.trim()) {
          results.push({ name: f.name, text });
        }
      }
    } else {
      const text = cleanExtractedText(await processFile(file));
      if (text.trim()) {
        results.push({ name: file.name, text });
      }
    }
  }

  return {
    text: results.map(r => r.text).join("\n\n"),
    fileNames: results.map(r => r.name),
  };
}
