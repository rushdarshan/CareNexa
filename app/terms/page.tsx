export default function TermsPage() {
  return (
    <main className="container mx-auto px-4 py-10 max-w-4xl space-y-6">
      <h1 className="text-3xl font-bold">Terms of Service</h1>
      <p className="text-muted-foreground">
        By using CareNexa, you agree to these terms. The platform provides informational support and is
        not a substitute for professional medical diagnosis or emergency care.
      </p>
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Medical Disclaimer</h2>
        <p className="text-muted-foreground">Always consult qualified professionals for diagnosis and treatment decisions.</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Acceptable Use</h2>
        <p className="text-muted-foreground">Do not misuse services, attempt abuse, or submit unlawful content.</p>
      </section>
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Service Availability</h2>
        <p className="text-muted-foreground">Features may change or be temporarily unavailable during maintenance or incidents.</p>
      </section>
    </main>
  );
}
