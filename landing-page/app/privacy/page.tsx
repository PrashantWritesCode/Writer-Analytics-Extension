export default function PrivacyPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16">
      {/* Header */}
      <h1 className="text-4xl font-extrabold text-teal-600 mb-10">
        Privacy Policy – Writer Analytics
      </h1>

      {/* Content */}
      <section className="space-y-6 text-gray-700 text-lg leading-relaxed">
        <p>
          <strong>Writer Analytics</strong> respects your privacy and is built with a
          <span className="font-semibold"> privacy-first approach</span>.
          This policy explains what data is processed and how it is used.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-8">
          What data we process
        </h2>

        <ul className="list-disc list-inside space-y-3">
          <li>
            Story engagement statistics such as <strong>reads, votes, comments</strong>,
            and chapter-level metrics.
          </li>
          <li>
            These statistics are used only to generate analytics and insights for writers.
          </li>
        </ul>

        <h2 className="text-2xl font-bold text-gray-900 mt-8">
          What we do not collect
        </h2>

        <ul className="list-disc list-inside space-y-3">
          <li>No story content (chapters, paragraphs, or text)</li>
          <li>No passwords or sensitive personal information</li>
          <li>No selling or sharing of user data with third parties</li>
        </ul>

        <h2 className="text-2xl font-bold text-gray-900 mt-8">
          How data is handled
        </h2>

        <ul className="list-disc list-inside space-y-3">
          <li>
            <strong>Story Analytics:</strong> All analytics are processed
            <span className="font-semibold"> locally in your browser</span>.
          </li>
          <li>
            <strong>Chapter Analytics (Beta):</strong> Engagement statistics may be stored
            to build historical trends over time.
            <br />
            <span className="italic">
              Story content is never uploaded or stored.
            </span>
          </li>
        </ul>

        <h2 className="text-2xl font-bold text-gray-900 mt-8">
          Usage telemetry
        </h2>

        <ul className="list-disc list-inside space-y-3">
          <li>
            Anonymous usage events (such as feature usage or refresh actions) may be logged
            to improve reliability and product quality.
          </li>
          <li>
            These events do <strong>not</strong> include personal user data and cannot
            identify you.
          </li>
        </ul>

        <h2 className="text-2xl font-bold text-gray-900 mt-8">
          Authentication (Beta features only)
        </h2>

        <ul className="list-disc list-inside space-y-3">
          <li>
            Optional login is used to enable early-access features such as
            <strong> Chapter Analytics</strong>.
          </li>
          <li>
            Authentication is handled securely via a trusted provider.
          </li>
          <li>
            No personal data is sold, shared, or used for advertising.
          </li>
        </ul>

        <h2 className="text-2xl font-bold text-gray-900 mt-8">
          Data ownership
        </h2>

        <p>
          You remain the owner of your data at all times.
          Writer Analytics exists only to help you better understand reader engagement.
        </p>

        <h2 className="text-2xl font-bold text-gray-900 mt-8">
          Independence
        </h2>

        <p className="italic">
          Writer Analytics is an independent tool and is not affiliated with, sponsored by,
          or endorsed by Wattpad or Webnovel.
        </p>
      </section>
    </main>
  );
}
