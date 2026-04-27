import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

export interface L3InsightInput {
  name: string;
  budget: number;
  spent: number;
}

export interface CategoryInsightInput {
  name: string;
  type: "needs" | "wants" | "savings";
  budget: number;
  budgetedSpent: number;
  unbudgetedSpent: number;
  pctUsed: number;
  subcategories: L3InsightInput[];
}

export interface TransactionNoteInput {
  date: string;
  amount: number;
  categoryName: string;
  note: string;
}

export interface SpendingInsights {
  summary: string;
  dos: string[];
  donts: string[];
}

export function hashInsightInput(
  categories: CategoryInsightInput[],
  totalIncome: number,
  totalSpent: number,
  transactionNotes?: TransactionNoteInput[]
): string {
  return JSON.stringify({ categories, totalIncome, totalSpent, transactionNotes });
}

export async function getSpendingInsights(
  categories: CategoryInsightInput[],
  daysLeft: number,
  totalIncome: number,
  totalSpent: number,
  transactionNotes?: TransactionNoteInput[]
): Promise<SpendingInsights> {
  const summary = categories
    .map((c) => {
      const catTotalSpent = c.budgetedSpent + c.unbudgetedSpent;
      let line = `- ${c.name} (${c.type}): total spent RM${catTotalSpent.toFixed(2)}`;
      if (c.budget > 0) {
        line += ` | budget limit RM${c.budget.toFixed(2)}, spent RM${c.budgetedSpent.toFixed(2)} against planned subcategories (${c.pctUsed.toFixed(0)}% of limit used)`;
      }
      if (c.unbudgetedSpent > 0) {
        line += ` | RM${c.unbudgetedSpent.toFixed(2)} in spending outside your plan`;
      }
      if (c.subcategories.length > 0) {
        const sorted = [...c.subcategories].sort((a, b) => b.spent - a.spent);
        const l3Lines = sorted.map((s, i) => {
          let l3 = `    · ${s.name}${i === 0 ? " [largest]" : ""}: spent RM${s.spent.toFixed(2)}`;
          if (s.budget > 0) {
            const diff = s.budget - s.spent;
            l3 += ` / RM${s.budget.toFixed(2)} limit (${diff < 0 ? `over by RM${Math.abs(diff).toFixed(2)}` : `RM${diff.toFixed(2)} left`})`;
          } else {
            l3 += ` (outside your plan)`;
          }
          return l3;
        });
        line += "\n" + l3Lines.join("\n");
      }
      return line;
    })
    .join("\n");

  const notesSection =
    transactionNotes && transactionNotes.length > 0
      ? `\nNotable transactions (expenses with notes):\n${transactionNotes
          .map((t) => `- ${t.date} | RM${t.amount.toFixed(2)} | ${t.categoryName} | ${t.note}`)
          .join("\n")}\n`
      : "";

  const prompt = `You are a personal finance advisor for a Malaysian user tracking their monthly salary cycle expenses.

Current cycle data (${daysLeft} days remaining):
- Total income: RM${totalIncome.toFixed(2)}
- Total spent so far: RM${totalSpent.toFixed(2)}
- Remaining: RM${(totalIncome - totalSpent).toFixed(2)}

Category breakdown (only categories with budget or spending):
${summary}
${notesSection}
Based on this data, provide:
1. A short summary (2-3 sentences) of the user's overall financial situation this cycle.
2. Between 2 and 4 practical "Do" tips tailored to their spending patterns.
3. Between 2 and 4 "Don't" tips tailored to their spending patterns.

Prioritise every tip by absolute RM impact — a RM800 unplanned spend is far more important than a RM10 budget overrun. Only include lower-impact tips if they are still genuinely actionable.
Be specific — reference actual category names and amounts where relevant. Always name the [largest] subcategory when discussing a category.
Keep each tip concise (1-2 sentences max). Use a friendly, direct tone.
Do NOT use technical labels like "subcategories" or "limit" in your response — speak naturally as a financial advisor would. Refer to spending outside the plan as "unplanned spending".
Write in English but it's okay to include common Malaysian terms like "makan", "duit", etc naturally if it fits.

Respond ONLY with valid JSON in this exact format, no markdown:
{"summary":"...","dos":["...","..."],"donts":["...","..."]}
dos and donts must each have between 2 and 4 items.`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim();
  // strip markdown code fences if model wraps the response
  const text = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  return JSON.parse(text) as SpendingInsights;
}
