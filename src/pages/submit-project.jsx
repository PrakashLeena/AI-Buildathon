import React, { useState } from 'react';
import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ProjectSubmissionForm from '../components/ProjectSubmissionForm';

export default function SubmitProjectPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [verifiedData, setVerifiedData] = useState(null); // { registrationId, participantName, hasExistingSubmission }

  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/project-submissions/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to verify email.');
      }

      setVerifiedData({
        registrationId: data.registrationId,
        participantName: data.participantName,
        participantEmail: email,
        hasExistingSubmission: data.hasExistingSubmission
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Head>
        <title>Submit Final Project - AI Buildathon</title>
        <meta name="description" content="Submit your final project for the AI Buildathon." />
      </Head>

      <Header />

      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {!verifiedData ? (
            <div className="bg-white p-8 rounded-xl shadow border border-gray-100">
              <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">Project Submission Portal</h1>
              <p className="text-gray-600 mb-8 text-center">
                Welcome to the final project submission portal. Please enter the email address you registered with to continue.
              </p>

              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6 border border-red-200 text-center">
                  {error}
                </div>
              )}

              <form onSubmit={handleVerifyEmail} className="max-w-md mx-auto space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Registered Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-3 text-gray-900"
                    placeholder="name@example.com"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 font-medium disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Continue'}
                </button>
              </form>
            </div>
          ) : (
            <ProjectSubmissionForm {...verifiedData} />
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
