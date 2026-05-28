import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/**
 * Convert markdown content to section-based HTML, render via html2canvas,
 * and export as a properly paginated PDF with Chinese support.
 */
export async function exportMarkdownToPDF(content: string, filename: string) {
  if (!content) return;

  // Split content into logical sections (by double newline or headings)
  const rawSections = content.split(/\n(?=#{1,3}\s)|(?:\n\n)/g).filter(s => s.trim());

  // Create off-screen container
  const container = document.createElement("div");
  container.style.cssText =
    "position:absolute;left:-9999px;top:0;width:760px;padding:0;font-family:'PingFang SC','Microsoft YaHei','Noto Sans SC','Noto Sans CJK SC',sans-serif;font-size:15px;line-height:1.9;color:#222;background:#fff;";
  document.body.appendChild(container);

  // Render each section into its own div
  for (const section of rawSections) {
    const div = document.createElement("div");
    div.setAttribute("data-pdf-section", "true");
    div.style.cssText = "padding:0 0 4px 0;background:#fff;";
    div.innerHTML = markdownToHtml(section);
    container.appendChild(div);
  }

  const A4_WIDTH_MM = 210;
  const A4_HEIGHT_MM = 297;
  const MARGIN_MM = 15;
  const CONTENT_WIDTH_MM = A4_WIDTH_MM - MARGIN_MM * 2;
  const CONTENT_HEIGHT_MM = A4_HEIGHT_MM - MARGIN_MM * 2;
  const SECTION_GAP_MM = 2;

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let currentY = MARGIN_MM;

  const sections = Array.from(
    container.querySelectorAll("[data-pdf-section]")
  ) as HTMLElement[];

  for (const section of sections) {
    const canvas = await html2canvas(section, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    const scaleFactor = CONTENT_WIDTH_MM / (canvas.width / 2);
    const sectionHeightMM = (canvas.height / 2) * scaleFactor;
    const remaining = A4_HEIGHT_MM - MARGIN_MM - currentY;

    // If section is too tall for one page, slice it carefully
    if (sectionHeightMM > CONTENT_HEIGHT_MM) {
      // Large section: render as full image and slice by page
      const imgData = canvas.toDataURL("image/png");
      const totalPxHeight = canvas.height;
      const pxPerMM = (canvas.width / 2) / CONTENT_WIDTH_MM;
      const pageSlicePx = Math.floor(CONTENT_HEIGHT_MM * pxPerMM * 2); // *2 for scale
      let srcY = 0;
      let first = true;

      while (srcY < totalPxHeight) {
        if (!first || currentY > MARGIN_MM + 1) {
          if (!first) pdf.addPage();
          currentY = MARGIN_MM;
        }
        first = false;

        const availableMM = A4_HEIGHT_MM - MARGIN_MM - currentY;
        const slicePx = Math.min(pageSlicePx, totalPxHeight - srcY, Math.floor(availableMM * pxPerMM * 2));

        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = slicePx;
        const ctx = sliceCanvas.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        ctx.drawImage(canvas, 0, srcY, canvas.width, slicePx, 0, 0, canvas.width, slicePx);

        const sliceHeightMM = (slicePx / 2) * scaleFactor;
        pdf.addImage(sliceCanvas.toDataURL("image/png"), "PNG", MARGIN_MM, currentY, CONTENT_WIDTH_MM, sliceHeightMM);
        currentY += sliceHeightMM + SECTION_GAP_MM;
        srcY += slicePx;
      }
    } else {
      // Normal section: check if it fits on current page
      if (sectionHeightMM > remaining && currentY > MARGIN_MM + 1) {
        pdf.addPage();
        currentY = MARGIN_MM;
      }

      const imgData = canvas.toDataURL("image/png");
      pdf.addImage(imgData, "PNG", MARGIN_MM, currentY, CONTENT_WIDTH_MM, sectionHeightMM);
      currentY += sectionHeightMM + SECTION_GAP_MM;
    }
  }

  document.body.removeChild(container);
  pdf.save(filename);
}

function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3 style="font-size:15px;font-weight:bold;margin:12px 0 6px;">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size:17px;font-weight:bold;margin:16px 0 8px;">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="font-size:20px;font-weight:bold;margin:0 0 12px;">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/---/g, '<hr style="margin:12px 0;border:none;border-top:1px solid #ddd;">')
    .replace(/\n/g, "<br/>");
}
