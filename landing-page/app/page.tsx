"use client";
import { useRef, useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Activity, MessageSquare, Award, DownloadCloud } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export default function LandingPage() {
  const emailRef = useRef<HTMLInputElement | null>(null);
  const instagramRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const scrollToWaitlist = () => {
    const el = document.getElementById("waitlist-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });

      setTimeout(() => {
        if (emailRef.current) {
          emailRef.current.classList.add("animate-bounce");
          setTimeout(() => {
            emailRef.current?.classList.remove("animate-bounce");
          }, 1000);
        }
      }, 600);
    }
  };

  const handleJoinWaitlist = async () => {
    if (!emailRef.current?.value) {
      setMessage("⚠️ Please enter your email");
      return;
    }

    if (!instagramRef.current?.value) {
      setMessage("⚠️ Please enter your Instagram (author/page ID)");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase.from("waitlist").insert([
        {
          email: emailRef.current.value,
          instagram: instagramRef.current.value,
        },
      ]);

      if (error) {
        if (
          error.message &&
          (error.message.includes("duplicate key") ||
            error.message.includes("already exists"))
        ) {
          setMessage("⚠️ You’re already on the waitlist.");
        } else {
          setMessage("❌ Something went wrong. Please try again.");
          console.error("Supabase insert error:", error.message);
        }
      } else {
        setMessage("✅ You’ve joined the waitlist! Thank you 🚀");
        emailRef.current.value = "";
        instagramRef.current.value = "";
      }
    } catch (err: unknown) {
      setMessage("❌ Something went wrong. Please try again.");
      if (err instanceof Error) {
        console.error("Supabase insert error:", err.message);
      } else {
        console.error("Supabase insert error:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-800 flex flex-col">
      {/* Hero Section */}
      <header className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white py-20 px-6 text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-4">
          Turn Your Stories Into Insights
        </h1>
        <p className="text-lg md:text-2xl max-w-2xl mx-auto mb-8">
          See which parts of your stories readers love most — with clear, simple
          analytics built just for authors.
        </p>
        <Button
          onClick={scrollToWaitlist}
          className="bg-indigo-600 text-white font-bold px-8 py-3 rounded-full shadow-lg hover:bg-indigo-700 transition"
        >
          Join the Waitlist
        </Button>
      </header>

      {/* Problem & Solution */}
      <section className="py-16 px-6 max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-6">Why Writers Will Love This</h2>
        <p className="text-lg mb-4">
          Many authors publish stories but don’t know which parts connect most
          with readers.
        </p>
        <p className="text-lg">
          We help you see paragraph-level insights, top commented moments, and
          easy engagement metrics in a clear, visual way.
        </p>
      </section>

      {/* Features */}
      <section className="py-16 px-6 bg-gray-50">
        <h2 className="text-3xl font-bold text-center mb-10">Key Features</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <Card className="shadow-md hover:shadow-xl transition border border-gray-200 rounded-xl bg-white">
            <CardContent className="p-6 text-center flex flex-col items-center">
              <MessageSquare className="w-12 h-12 text-indigo-600 mb-4" />
              <h3 className="font-semibold text-lg mb-2">✨ Top Moments</h3>
              <p className="text-gray-600">
                Discover which paragraphs spark the most comments.
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-md hover:shadow-xl transition border border-gray-200 rounded-xl bg-white">
            <CardContent className="p-6 text-center flex flex-col items-center">
              <Activity className="w-12 h-12 text-green-600 mb-4" />
              <h3 className="font-semibold text-lg mb-2">
                📊 Engagement Rate
              </h3>
              <p className="text-gray-600">
                Track how reads, votes, and comments interact together.
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-md hover:shadow-xl transition border border-gray-200 rounded-xl bg-white">
            <CardContent className="p-6 text-center flex flex-col items-center">
              <Award className="w-12 h-12 text-yellow-500 mb-4" />
              <h3 className="font-semibold text-lg mb-2">🏅 Visual Insights</h3>
              <p className="text-gray-600">
                Beautiful, easy-to-read charts and metrics at a glance.
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-md hover:shadow-xl transition border border-gray-200 rounded-xl bg-white">
            <CardContent className="p-6 text-center flex flex-col items-center">
              <DownloadCloud className="w-12 h-12 text-pink-600 mb-4" />
              <h3 className="font-semibold text-lg mb-2">⬇ Export Data</h3>
              <p className="text-gray-600">
                Download shareable snapshots of your story performance.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Waitlist CTA */}
      <section id="waitlist-section" className="py-20 px-6 text-center">
        <h2 className="text-3xl font-bold mb-6">We’re Launching Soon 🚀</h2>
        <p className="text-lg mb-6">
          Be the first to try Writer Analytics.{" "}
          <span className="font-semibold">
            Join hundreds of authors already on the waitlist.
          </span>
        </p>
        <div className="flex flex-col gap-4 justify-center max-w-md mx-auto">
          <input
            ref={emailRef}
            type="email"
            placeholder="Enter your email"
            className="px-4 py-3 border rounded-lg flex-1 focus:ring-2 focus:ring-indigo-500 outline-none transition"
          />
          <input
            ref={instagramRef}
            type="text"
            placeholder="Enter your author/page Instagram ID"
            className="px-4 py-3 border rounded-lg flex-1 focus:ring-2 focus:ring-pink-500 outline-none transition"
          />
          <Button
            onClick={handleJoinWaitlist}
            disabled={loading}
            className="bg-indigo-600 text-white font-bold px-6 py-3 rounded-lg shadow hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {loading ? "Joining..." : "Join Waitlist"}
          </Button>
        </div>
        {message && <p className="text-sm mt-3">{message}</p>}
      </section>

      {/* Footer */}
      <footer className="py-6 text-center text-gray-500 text-sm border-t">
        © {new Date().getFullYear()} Writer Analytics · Independent tool for
        authors. Not affiliated with or endorsed by any platform.
      </footer>
    </div>
  );
}
