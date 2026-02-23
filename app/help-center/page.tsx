import Link from "next/link";

export default function HelpCenterPage() {
  return (
    <main className="container mx-auto px-4 py-10 max-w-4xl space-y-6">
      <h1 className="text-3xl font-bold">Help Center</h1>
      <p className="text-muted-foreground">Find quick guidance for using CareNexa features.</p>
      <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
        <li>Camera and microphone setup for VR Doctor</li>
        <li>How to run AI analysis and understand results</li>
        <li>How to upload patient reports for extraction</li>
      </ul>
      <p>
        Need direct support? Visit <Link className="text-primary underline" href="/contact">Contact</Link>.
      </p>
    </main>
  );
}
