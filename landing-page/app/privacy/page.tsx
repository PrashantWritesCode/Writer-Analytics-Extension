export default function PrivacyPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16">
      {/* Header */}
      <h1 className="text-4xl font-extrabold text-teal-600 mb-8">
        Privacy Policy – Writer Analytics
      </h1>

      {/* Content */}
      <section className="space-y-6 text-gray-700 text-lg leading-relaxed">
        <p>
          <strong>Writer Analytics</strong> values your privacy. Here’s how we handle your data:
        </p>

        <ul className="list-disc list-inside space-y-3">
          <li>
            We <span className="font-semibold">do not collect, store, or share</span> any personal data.
          </li>
          <li>
            All story statistics (reads, votes, comments, engagement rate) are processed 
            <span className="font-semibold"> locally in your browser</span>.
          </li>
          <li>
            No information is transmitted to external servers.
          </li>
          <li>
            This extension is <span className="italic">independent</span> and not affiliated with, 
            sponsored, or endorsed by Wattpad or Webnovel.
          </li>
        </ul>
      </section>
    </main>
  );
}
