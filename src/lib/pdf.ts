import { jsPDF } from "jspdf";
import { autoTable, type CellHookData } from "jspdf-autotable";
import { format, parseISO } from "date-fns";
import type { CategoryReportNode, CycleReport } from "@/lib/report";

type RGB = [number, number, number];

const INK: RGB = [15, 23, 42];
const MUTED: RGB = [100, 116, 139];
const BRAND: RGB = [210, 96, 63];
const LINE: RGB = [226, 232, 240];
const GREEN: RGB = [22, 163, 74];
const RED: RGB = [220, 38, 38];
const BLUE: RGB = [37, 99, 235];

const TYPE_COLORS: Record<string, RGB> = {
  needs: [34, 197, 94],
  wants: [234, 88, 12],
  savings: [37, 99, 235],
};

type DocWithTable = jsPDF & { lastAutoTable: { finalY: number } };

const money = new Intl.NumberFormat("en-MY", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const rm = (n: number) => `RM ${money.format(n)}`;
const signedRm = (type: string, n: number) =>
  type === "income" ? `+${rm(n)}` : type === "expense" ? `-${rm(n)}` : rm(n);

type DeltaDirection = "expense" | "income";

function formatDelta(
  current: number,
  prev: number | undefined,
  direction: DeltaDirection
): { text: string; color: RGB } {
  if (prev === undefined) return { text: "", color: MUTED };
  if (prev === 0 && current > 0) return { text: "new", color: MUTED };
  const diff = current - prev;
  if (Math.abs(diff) < 0.01) return { text: "", color: MUTED };
  const sign = diff > 0 ? "+" : "-";
  const text = `${sign}${rm(Math.abs(diff))}`;
  const up = diff > 0;
  const color =
    direction === "expense" ? (up ? RED : GREEN) : up ? GREEN : RED;
  return { text, color };
}

function flattenTree(
  nodes: CategoryReportNode[]
): { name: string; amount: number; prevAmount?: number; level: number }[] {
  const out: { name: string; amount: number; prevAmount?: number; level: number }[] = [];
  const walk = (node: CategoryReportNode) => {
    out.push({
      name: node.name,
      amount: node.amount,
      prevAmount: node.prevAmount,
      level: node.level,
    });
    node.children.forEach(walk);
  };
  nodes.forEach(walk);
  return out;
}

export function generateMonthlyReportPdf(report: CycleReport): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" }) as DocWithTable;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentW = pageW - margin * 2;
  const continuationTop = margin + 30;
  let y = margin;

  // ---- Header ----
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...BRAND);
  doc.text("KiraPoket", margin, y + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...MUTED);
  doc.text("Monthly Report", pageW - margin, y + 5, { align: "right" });

  y += 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...INK);
  doc.text(report.cycleLabel, margin, y + 6);

  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  const who = report.userName ? `${report.userName} · ` : "";
  doc.text(`${who}Generated ${report.generatedDate}`, margin, y + 4);

  y += 14;
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 18;

  // ---- Summary boxes ----
  const gap = 10;
  const boxW = (contentW - gap * 2) / 3;
  const boxH = report.hasPrev ? 72 : 58;
  const summary: {
    label: string;
    value: number;
    prev?: number;
    direction: DeltaDirection;
    color: RGB;
    signed?: boolean;
  }[] = [
    { label: "INCOME", value: report.income, prev: report.prevIncome, direction: "income", color: GREEN },
    { label: "EXPENSES", value: report.expenses, prev: report.prevExpenses, direction: "expense", color: RED },
    { label: "REMAINING", value: report.net, prev: report.prevNet, direction: "income", color: report.net >= 0 ? BLUE : RED, signed: true },
  ];
  summary.forEach((box, i) => {
    const x = margin + i * (boxW + gap);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, boxW, boxH, 6, 6, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(box.label, x + 12, y + 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...box.color);
    const text =
      box.signed && box.value >= 0 ? `+${rm(box.value)}` : rm(box.value);
    doc.text(text, x + 12, y + 42);

    if (report.hasPrev) {
      const delta = formatDelta(box.value, box.prev, box.direction);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      if (delta.text) {
        doc.setTextColor(...delta.color);
        doc.text(`${delta.text} vs last`, x + 12, y + 60);
      } else {
        doc.setTextColor(...MUTED);
        doc.text("same as last", x + 12, y + 60);
      }
    }
  });
  y += boxH + 24;

  // ---- Spending split bar ----
  if (report.split.length > 0 && report.expenses > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    doc.text("Spending split", margin, y);
    y += 18;

    const barH = 16;
    let x = margin;
    report.split.forEach((slice) => {
      const w = (slice.pct / 100) * contentW;
      doc.setFillColor(...(TYPE_COLORS[slice.type] ?? MUTED));
      doc.rect(x, y, w, barH, "F");
      x += w;
    });
    y += barH + 16;

    // Legend
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    let lx = margin;
    report.split.forEach((slice) => {
      doc.setFillColor(...(TYPE_COLORS[slice.type] ?? MUTED));
      doc.circle(lx + 3, y - 3, 3, "F");
      doc.setTextColor(...INK);
      const label = `${slice.name} ${Math.round(slice.pct)}%`;
      doc.text(label, lx + 11, y);
      doc.setTextColor(...MUTED);
      const amt = `  ${rm(slice.amount)}`;
      const labelW = doc.getTextWidth(label);
      doc.text(amt, lx + 11 + labelW, y);
      lx += 11 + labelW + doc.getTextWidth(amt) + 18;
    });
    y += 36;
  }

  // ---- Category breakdown ----
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text("Spending by category", margin, y);
  y += 14;

  if (report.categoryTree.length === 0) {
    y += 14;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text("No expenses recorded in this cycle.", margin, y);
    y += 16;
  } else {
    const rows = flattenTree(report.categoryTree);
    const levels = rows.map((r) => r.level);
    const hasPrev = report.hasPrev;
    const head = hasPrev
      ? [[
          "Category",
          { content: "Amount", styles: { halign: "right" as const } },
          { content: "vs last", styles: { halign: "right" as const } },
        ]]
      : [["Category", { content: "Amount", styles: { halign: "right" as const } }]];
    const body = rows.map((r) => {
      const base: (string | { content: string; styles: { textColor: RGB } })[] = [
        r.name,
        rm(r.amount),
      ];
      if (!hasPrev) return base;
      const delta = formatDelta(r.amount, r.prevAmount, "expense");
      base.push({ content: delta.text, styles: { textColor: delta.color } });
      return base;
    });
    autoTable(doc, {
      startY: y + 6,
      margin: { top: continuationTop, left: margin, right: margin },
      theme: "plain",
      head,
      body,
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: MUTED,
        fontStyle: "bold",
        fontSize: 8,
      },
      bodyStyles: { fontSize: 9, textColor: INK },
      columnStyles: hasPrev
        ? {
            1: { halign: "right", cellWidth: 85 },
            2: { halign: "right", cellWidth: 80 },
          }
        : { 1: { halign: "right" } },
      didParseCell: (data: CellHookData) => {
        if (data.section !== "body") return;
        const level = levels[data.row.index];
        const isL1Divider = level === 1 && data.row.index > 0;

        if (data.column.index === 0) {
          data.cell.styles.cellPadding = {
            top: isL1Divider ? 10 : 3,
            right: 4,
            bottom: 3,
            left: 4 + (level - 1) * 14,
          };
        } else if (isL1Divider) {
          data.cell.styles.cellPadding = {
            top: 10,
            right: 5,
            bottom: 3,
            left: 5,
          };
        }

        if (isL1Divider) {
          data.cell.styles.lineWidth = { top: 0.5, right: 0, bottom: 0, left: 0 };
          data.cell.styles.lineColor = LINE;
        }

        if (level === 1) {
          data.cell.styles.fontStyle = "bold";
        } else if (level === 3) {
          data.cell.styles.textColor = MUTED;
          data.cell.styles.fontSize = 8;
        }
      },
    });
    const tableEndY = doc.lastAutoTable.finalY;
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.5);
    doc.line(margin, tableEndY, pageW - margin, tableEndY);
    y = tableEndY + 24;
  }

  // ---- Transactions ----
  if (y > pageH - 140) {
    doc.addPage();
    y = continuationTop;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text(`Transactions (${report.transactions.length})`, margin, y);

  if (report.transactions.length === 0) {
    y += 18;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text("No transactions in this cycle.", margin, y);
  } else {
    const types = report.transactions.map((t) => t.type);
    const dateCells: string[] = [];
    let prevDate = "";
    for (const t of report.transactions) {
      const d = format(parseISO(t.date), "d MMM");
      dateCells.push(d === prevDate ? "" : d);
      prevDate = d;
    }
    autoTable(doc, {
      startY: y + 14,
      margin: { top: continuationTop, left: margin, right: margin },
      theme: "striped",
      head: [
        [
          "",
          "Date",
          "Details",
          "Account",
          { content: "Amount", styles: { halign: "right" } },
        ],
      ],
      body: report.transactions.map((t, i) => {
        const details =
          t.note && t.type !== "income" ? `${t.label} · ${t.note}` : t.label;
        const account =
          t.type === "transfer" && t.toAccountName
            ? `${t.accountName}\n${t.toAccountName}`
            : t.accountName;
        return [
          "",
          dateCells[i],
          details,
          account,
          signedRm(t.type, t.amount),
        ];
      }),
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: MUTED,
        fontStyle: "bold",
        fontSize: 8,
      },
      bodyStyles: { fontSize: 8, textColor: INK },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles: {
        0: { cellWidth: 16 },
        1: { cellWidth: 50 },
        3: { cellWidth: 95 },
        4: { halign: "right", cellWidth: 72 },
      },
      didParseCell: (data: CellHookData) => {
        if (data.section !== "body" || data.column.index !== 4) return;
        const raw = String(data.cell.raw);
        if (raw.startsWith("+")) data.cell.styles.textColor = GREEN;
        else if (raw.startsWith("-")) data.cell.styles.textColor = RED;
        else data.cell.styles.textColor = BLUE;
      },
      didDrawCell: (data: CellHookData) => {
        if (data.section !== "body" || data.column.index !== 0) return;
        const type = types[data.row.index];
        const color = type === "income" ? GREEN : type === "expense" ? RED : BLUE;
        doc.setFillColor(color[0], color[1], color[2]);
        const cx = data.cell.x + data.cell.width / 2;
        const cy = data.cell.y + data.cell.height / 2;
        doc.circle(cx, cy, 2.5, "F");
      },
    });
  }

  // ---- Running header (pages 2+) and footer on every page ----
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    if (i > 1) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...BRAND);
      doc.text("KiraPoket", margin, margin + 4);
      const brandW = doc.getTextWidth("KiraPoket");
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...MUTED);
      doc.text(`· ${report.cycleLabel}`, margin + brandW + 6, margin + 4);
      doc.text("Monthly Report", pageW - margin, margin + 4, { align: "right" });
      doc.setDrawColor(...LINE);
      doc.setLineWidth(0.5);
      doc.line(margin, margin + 12, pageW - margin, margin + 12);
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("Generated by KiraPoket", margin, pageH - 24);
    doc.text(`Page ${i} of ${pageCount}`, pageW - margin, pageH - 24, {
      align: "right",
    });
  }

  doc.save(`kirapoket-report-${report.startStr}.pdf`);
}
