import type { Account, Category, Transaction } from "@/lib/types";

function escapeField(value: string): string {
  if (/[",\n\r]/.test(value) || value !== value.trim()) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function toRow(fields: string[]): string {
  return fields.map((f) => escapeField(f)).join(",");
}

const HEADERS = [
  "Date",
  "Time",
  "Type",
  "Amount",
  "Account",
  "To Account",
  "Category",
  "Subcategory",
  "Note",
];

export function transactionsToCsv(
  transactions: Transaction[],
  accounts: Account[],
  categories: Category[]
): string {
  const accountMap = new Map(accounts.map((a) => [a.id, a]));
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  const rows = transactions.map((t) => {
    const category = t.categoryId ? categoryMap.get(t.categoryId) : null;
    const parent = category?.parentId ? categoryMap.get(category.parentId) : null;
    const signedAmount =
      t.type === "expense" ? -t.amount : t.amount;
    return toRow([
      t.date,
      t.time ?? "",
      t.type,
      signedAmount.toFixed(2),
      accountMap.get(t.accountId)?.name ?? "",
      t.toAccountId ? accountMap.get(t.toAccountId)?.name ?? "" : "",
      category?.name ?? "",
      parent?.name ?? "",
      t.note ?? "",
    ]);
  });

  return [toRow(HEADERS), ...rows].join("\r\n");
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
