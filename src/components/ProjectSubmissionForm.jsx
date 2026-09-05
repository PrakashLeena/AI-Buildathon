import React, { useState } from 'react';
import Turnstile from './Turnstile';

export default function ProjectSubmissionForm({ 
  registrationId, 
  participantEmail, 
  participantName, 
  hasExistingSubmission 
}) {
  const [formData, setFormData] = useState({
    problem: '',
    solution: '',
    ai_usage: '',
    technical_brief: '',
    impact: '',
    roadmap: '',
    demo_video: '',
    source_repo: '',
    hosted_prototype: '',
    ai_usage_statement: ''
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  // Overwrite & OTP states
  const [isOverwriteFlow, setIsOverwriteFlow] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [otpToken, setOtpToken] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: participantEmail,
          captchaToken,
          mode: 'project_submission'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send OTP.');
      }
      setOtpToken(data.otpToken);
      setOtpSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // If they have an existing submission and haven't triggered overwrite flow
    if (hasExistingSubmission && !isOverwriteFlow) {
      setIsOverwriteFlow(true);
      return;
    }

    if (isOverwriteFlow && !otpSent) {
      // Must send OTP first
      return;
    }

    if (isOverwriteFlow && otpSent && !otp) {
      setError('Please enter the verification code.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        registrationId,
        participantEmail,
        isOverwrite: isOverwriteFlow,
        otp: isOverwriteFlow ? otp : undefined,
        otpToken: isOverwriteFlow ? otpToken : undefined,
        ...formData
      };

      const res = await fetch('/api/project-submissions/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          // Conflict: Submission was added by another tab or request
          setIsOverwriteFlow(true);
        }
        throw new Error(data.error || 'Failed to submit project.');
      }

      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-50 text-green-800 p-6 rounded-lg text-center shadow">
        <h2 className="text-2xl font-bold mb-2">Success!</h2>
        <p>Your project submission has been saved successfully.</p>
        <p className="mt-4 text-sm">Thank you, {participantName}, for your submission.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-xl shadow-lg border border-gray-100 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Project Submission Form</h2>
        <p className="text-gray-600">Submitting as: <span className="font-semibold">{participantEmail}</span> ({participantName})</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md text-sm border border-red-200">
          {error}
        </div>
      )}

      {/* Section 1: Project Brief */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-800 border-b pb-2">Section 1: Project Brief</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Problem *</label>
          <textarea required name="problem" value={formData.problem} onChange={handleInputChange} rows={3}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50 p-3 text-gray-900"
            placeholder="Describe the core problem your project addresses..." />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Solution *</label>
          <textarea required name="solution" value={formData.solution} onChange={handleInputChange} rows={3}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50 p-3 text-gray-900"
            placeholder="Explain how your working solution solves the problem..." />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">AI usage *</label>
          <textarea required name="ai_usage" value={formData.ai_usage} onChange={handleInputChange} rows={3}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50 p-3 text-gray-900"
            placeholder="Describe how AI was utilized in the general scope of this project..." />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Technical Brief *</label>
          <textarea required name="technical_brief" value={formData.technical_brief} onChange={handleInputChange} rows={3}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50 p-3 text-gray-900"
            placeholder="Detail your technical architecture, frameworks, and tools used..." />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Impact *</label>
          <textarea required name="impact" value={formData.impact} onChange={handleInputChange} rows={3}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50 p-3 text-gray-900"
            placeholder="What is the measurable or expected impact of this solution?..." />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Roadmap *</label>
          <textarea required name="roadmap" value={formData.roadmap} onChange={handleInputChange} rows={3}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50 p-3 text-gray-900"
            placeholder="Outline future plans, milestones, and next steps..." />
        </div>
      </div>

      {/* Section 2: Links & Statements */}
      <div className="space-y-4 pt-4">
        <h3 className="text-xl font-semibold text-gray-800 border-b pb-2">Section 2: Links & Statements</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Demo Video *</label>
          <input required type="url" name="demo_video" value={formData.demo_video} onChange={handleInputChange}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50 p-3 text-gray-900"
            placeholder="Enter unlisted YouTube video URL (Max 3 mins showcasing a walkthrough)" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Source Repository *</label>
          <input required type="url" name="source_repo" value={formData.source_repo} onChange={handleInputChange}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50 p-3 text-gray-900"
            placeholder="Enter public GitHub or GitLab URL containing source code, README, and setup instructions" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hosted Prototype *</label>
          <input required type="url" name="hosted_prototype" value={formData.hosted_prototype} onChange={handleInputChange}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50 p-3 text-gray-900"
            placeholder="Enter live URL for judges to try and evaluate your solution" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">AI Usage Statement *</label>
          <textarea required name="ai_usage_statement" value={formData.ai_usage_statement} onChange={handleInputChange} rows={3}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-gray-50 p-3 text-gray-900"
            placeholder="Briefly describe how Qoder was specifically used during the development of your solution" />
        </div>
      </div>

      {isOverwriteFlow && (
        <div className="mt-8 bg-yellow-50 p-6 rounded-lg border border-yellow-200">
          <h3 className="text-lg font-bold text-yellow-800 mb-2">Overwrite Existing Submission</h3>
          <p className="text-sm text-yellow-700 mb-4">
            You already have an existing submission. Do you want to overwrite it?
          </p>

          {!otpSent ? (
            <div className="space-y-4">
              <Turnstile onVerify={(token) => setCaptchaToken(token)} />
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={loading || !captchaToken}
                className="w-full sm:w-auto px-4 py-2 bg-yellow-600 text-white font-medium rounded shadow hover:bg-yellow-700 disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Verification Code'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Verification Code *</label>
                <input required type="text" value={otp} onChange={(e) => setOtp(e.target.value)}
                  className="w-full max-w-xs rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 text-gray-900"
                  placeholder="6-digit code" maxLength={6} />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="pt-6">
        <button
          type="submit"
          disabled={loading || (isOverwriteFlow && (!otpSent || otp.length < 6))}
          className="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 font-medium text-lg disabled:opacity-50"
        >
          {loading ? 'Processing...' : (isOverwriteFlow ? 'Verify & Overwrite Submission' : 'Submit Project')}
        </button>
      </div>
    </form>
  );
}
