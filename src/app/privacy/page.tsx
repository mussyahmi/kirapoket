import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy · KiraPoket",
};

const SECTIONS = [
  {
    title: "1. Who We Are",
    body: `KiraPoket is a personal expense tracking application for Malaysian users, built and operated by an individual developer. For any privacy-related enquiries, contact us at mussyahmi31@gmail.com.`,
  },
  {
    title: "2. What We Collect",
    body: `When you sign in with Google, we receive your name, email address, and profile photo from your Google account. As you use the app, we store the financial data you enter: accounts, transactions, categories, budgets, debts, and salary cycle settings. If you use the AI assistant, your conversations with it are saved to your account so you can return to them, until you delete them. We also maintain an activity log of significant actions (e.g. creating a transaction, inviting a partner) for debugging and audit purposes.

We do not collect payment card details, identity documents, or any sensitive personal data beyond what you voluntarily enter.`,
  },
  {
    title: "3. How We Use Your Data",
    body: `Your data is used solely to provide the KiraPoket service, displaying your spending summaries, budgets, and insights. We do not sell, rent, or share your data with third parties for marketing or advertising.

The AI assistant sends a summary of your finances to Gemini, Google's AI service, so it can answer questions about them. That summary is more than category totals: it includes your account names and balances, your salary cycle, your largest transactions for the current cycle with their dates, amounts, categories and any notes you wrote on them, the merchant or description text you enter often, the names of people recorded in your debts and what is owed, and any notes you have written for the assistant. It is sent only when you send a message. KiraPoket currently uses the free tier of the Gemini API, under which Google may use what is sent to improve their services, so treat the assistant as less private than the rest of the app. If you would rather none of this leave the app, do not use the assistant: every other part of KiraPoket works without it.`,
  },
  {
    title: "4. Who Can See Your Data",
    body: `Your data is private to your account by default. The only exceptions are:

• Partner view, if you invite a partner, they gain read-only access to your financial data for as long as the partnership is active. You can revoke this at any time in Settings.
• Developer access, as the developer, we have administrative access to the Firebase database for the purposes of maintenance, debugging, and support. We access individual user data only when necessary and do not browse it casually.
• Infrastructure, your data is stored on Google Firebase (Firestore), hosted on Google Cloud infrastructure in the asia-southeast1 region. Google processes your data as a subprocessor under their standard terms.`,
  },
  {
    title: "5. Data Security",
    body: `All data is transmitted over HTTPS (TLS). Data at rest is encrypted by Google Cloud. Firestore Security Rules are in place to ensure users can only read and write their own data through the app, administrative access is restricted to service account credentials that are never exposed client-side.`,
  },
  {
    title: "6. Data Retention",
    body: `We retain your data for as long as your account is active. If you delete your account via Settings → Delete Account, all your data (accounts, transactions, categories, budgets, debts, assistant conversations, activity logs, and profile) is permanently deleted from Firestore. This action is irreversible.`,
  },
  {
    title: "7. Your Rights (PDPA 2010)",
    body: `Under Malaysia's Personal Data Protection Act 2010, you have the right to:

• Access the personal data we hold about you.
• Correct inaccurate or incomplete data.
• Request deletion of your data.
• Withdraw consent to the processing of your personal data (which will require account deletion).

To exercise any of these rights, email us at mussyahmi31@gmail.com.`,
  },
  {
    title: "8. Third-Party Services",
    body: `KiraPoket uses the following third-party services, each governed by their own privacy policies:

• Google Firebase (Auth, Firestore, Hosting), data storage and authentication
• Google Gemini API, the AI assistant
• Google Sign-In, authentication`,
  },
  {
    title: "9. Changes to This Policy",
    body: `We may update this policy from time to time. Significant changes will be noted in the app changelog. Continued use of KiraPoket after changes are posted constitutes your acceptance of the updated policy.`,
  },
  {
    title: "10. Contact",
    body: `For any questions or concerns about this privacy policy or your personal data, contact us at mussyahmi31@gmail.com.`,
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-[34em] px-6 py-12 space-y-12">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Privacy Policy
        </h1>
        <p className="text-sm text-muted-foreground">
          Effective date: 29 October 2026 &nbsp;·&nbsp; KiraPoket
        </p>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">
        KiraPoket is built in Malaysia and is committed to protecting your
        personal data in accordance with the{" "}
        <span className="font-medium text-foreground">
          Personal Data Protection Act 2010 (PDPA)
        </span>
        . This policy explains what data we collect, how we use it, and your
        rights as a user.
      </p>

      <div className="space-y-8">
        {SECTIONS.map(({ title, body }) => (
          <section key={title} className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            <div className="space-y-3">
              {body.split("\n\n").map((para, i) => (
                <p
                  key={i}
                  className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line"
                >
                  {para}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="text-xs text-muted-foreground pt-4 border-t border-border">
        KiraPoket &copy; {new Date().getFullYear()}
      </p>
    </div>
  );
}
