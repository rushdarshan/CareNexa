export default function PrivacyPage() {
  return (
    <main className="container mx-auto px-4 py-10 max-w-4xl space-y-6">
      <h1 className="text-3xl font-bold">Privacy Policy</h1>
      <p className="text-muted-foreground">
        CareNexa is committed to protecting your privacy. This page summarizes what data is collected,
        how it is used, and your available controls.
      </p>
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Data We Process</h2>
        <p className="text-muted-foreground">Inputs you provide in AI chat, report uploads, and optional profile/activity data.</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">How We Use Data</h2>
        <p className="text-muted-foreground">To provide healthcare guidance features, improve app reliability, and maintain security logs.</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Your Controls</h2>
        <p className="text-muted-foreground">You may request deletion/export of account-linked data through support channels.</p>
      </section>
    </main>
  );
}
