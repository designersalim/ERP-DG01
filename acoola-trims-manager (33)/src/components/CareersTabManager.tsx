import React, { useState } from 'react';
import { 
  Briefcase, Plus, Trash2, Calendar, MapPin, GraduationCap, 
  Clock, DollarSign, Download, Eye, EyeOff, FileText, CheckCircle, Search, UserCheck
} from 'lucide-react';
import { JobOpportunity, JobApplication } from '../types';

interface CareersTabManagerProps {
  jobOpportunities: JobOpportunity[];
  jobApplications: JobApplication[];
  onAddJobOpportunity: (job: JobOpportunity) => void;
  onDeleteJobOpportunity: (id: string) => void;
  onDeleteJobApplication: (id: string) => void;
  canEdit?: boolean;
}

export default function CareersTabManager({
  jobOpportunities = [],
  jobApplications = [],
  onAddJobOpportunity,
  onDeleteJobOpportunity,
  onDeleteJobApplication,
  canEdit = true
}: CareersTabManagerProps) {
  const [activeSubTab, setActiveSubTab] = useState<'positions' | 'applications'>('positions');
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Job Post State
  const [title, setTitle] = useState('');
  const [dept, setDept] = useState('Merchandising');
  const [deadline, setDeadline] = useState('');
  const [education, setEducation] = useState('');
  const [experience, setExperience] = useState('');
  const [additionalRequirements, setAdditionalRequirements] = useState('');
  const [responsibilities, setResponsibilities] = useState('');
  const [skills, setSkills] = useState('');
  const [benefits, setBenefits] = useState('');
  const [workplace, setWorkplace] = useState('Factory Floor');
  const [employmentStatus, setEmploymentStatus] = useState('Full-time');
  const [jobLocation, setJobLocation] = useState('Tonghi Industrial Area, Gazipur');

  // Application view state
  const [selectedApp, setSelectedApp] = useState<JobApplication | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !deadline) {
      alert("Please fill out Title and Application deadline!");
      return;
    }

    const newJob: JobOpportunity = {
      id: `JOB-${Date.now()}`,
      title,
      dept,
      deadline,
      education,
      experience,
      additionalRequirements,
      responsibilities: responsibilities || 'Maintain quality operations alignment.',
      skills,
      benefits,
      workplace,
      employmentStatus,
      jobLocation,
      createdAt: new Date().toISOString()
    };

    onAddJobOpportunity(newJob);
    setShowAddModal(false);

    // Reset Form
    setTitle('');
    setDeadline('');
    setEducation('');
    setExperience('');
    setAdditionalRequirements('');
    setResponsibilities('');
    setSkills('');
    setBenefits('');
  };

  const filteredJobs = jobOpportunities.filter(j => 
    j.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    j.dept.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredApps = jobApplications.filter(a =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper to download base64 CV
  const triggerDownloadCv = (app: JobApplication) => {
    if (!app.cvFileData) {
      alert("No CV Document attached with this application.");
      return;
    }
    const link = document.createElement('a');
    link.href = app.cvFileData;
    link.download = app.cvFileName || `${app.name.replace(/\s+/g, '_')}_Resume.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 text-left" id="careers-erp-viewport">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 relative overflow-hidden shadow-lg border border-slate-800">
        <div className="relative z-10 space-y-2">
          <span className="text-[10px] bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
            Talent Acquisition Suite
          </span>
          <h1 className="text-2xl font-black uppercase tracking-tight">Careers &amp; Recruiting Dashboard</h1>
          <p className="text-xs text-slate-350 max-w-xl font-bold">
            Post new structural positions, manage criteria parameters, review automated candidate submissions, and download resume documents instantly.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-10 flex items-center justify-center">
          <Briefcase className="w-48 h-48 rotate-12" />
        </div>
      </div>

      {/* Sub Tabs Toggle & Action Headers */}
      <div className="sm:flex justify-between items-center bg-white border border-slate-150 p-3.5 rounded-2xl gap-4 shadow-xs">
        <div className="flex gap-2.5">
          <button
            onClick={() => { setActiveSubTab('positions'); setSearchQuery(''); }}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all ${
              activeSubTab === 'positions'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-50 text-slate-500 hover:text-slate-800'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>Open Vacancies ({jobOpportunities.length})</span>
          </button>
          <button
            onClick={() => { setActiveSubTab('applications'); setSearchQuery(''); }}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all ${
              activeSubTab === 'applications'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-50 text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Candidate Registries ({jobApplications.length})</span>
          </button>
        </div>

        <div className="mt-3 sm:mt-0 flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${activeSubTab}...`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 text-xs font-bold pl-9 pr-3 py-2.5 rounded-xl border border-slate-150 text-slate-800 focus:bg-white focus:outline-slate-950"
            />
          </div>
          {activeSubTab === 'positions' && canEdit && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-4.5 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer shrink-0 uppercase tracking-wider transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Post Job</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table views */}
      {activeSubTab === 'positions' ? (
        <div className="bg-white border border-slate-150 rounded-2xl overflow-hidden shadow-xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-150 text-slate-450 uppercase font-black text-[10px] tracking-widest">
                <th className="p-4">Post Profile Details</th>
                <th className="p-4">Department</th>
                <th className="p-4">Setup Info</th>
                <th className="p-4">Deadline Date</th>
                <th className="p-4 text-rose-600 text-right">Delete Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 font-bold text-slate-705">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400 font-bold">
                    No active job vacancy listings recorded yet. Click 'Post Job' above to launch hiring!
                  </td>
                </tr>
              ) : (
                filteredJobs.map(job => (
                  <tr key={job.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-4">
                      <div className="text-sm font-black text-slate-900 uppercase">{job.title}</div>
                      <div className="text-[10px] text-slate-450 tracking-wide mt-0.5">ID: {job.id} • Created: {new Date(job.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="p-4 uppercase text-slate-705 font-extrabold">{job.dept}</td>
                    <td className="p-4 text-xs font-medium text-slate-600 space-y-0.5">
                      <div>Status: <span className="font-extrabold text-indigo-600">{job.employmentStatus || 'Full-time'}</span></div>
                      <div>Workplace: <span className="font-bold text-slate-900">{job.workplace || 'Onsite'}</span></div>
                      <div>Location: <span className="text-slate-500">{job.jobLocation || 'Factory Floor'}</span></div>
                    </td>
                    <td className="p-4 text-red-500 font-extrabold">{job.deadline}</td>
                    <td className="p-4 text-right">
                      {canEdit && (
                        <button
                          onClick={() => {
                            if (confirm(`Are you absolutely sure you want to remove the job opening for: ${job.title}?`)) {
                              onDeleteJobOpportunity(job.id);
                            }
                          }}
                          className="bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white p-2 rounded-xl transition-all cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Applications Tab */
        <div className="bg-white border border-slate-150 rounded-2xl overflow-hidden shadow-xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-150 text-slate-450 uppercase font-black text-[10px] tracking-widest">
                <th className="p-4">Applicant Data</th>
                <th className="p-4">Target Position</th>
                <th className="p-4">Date Applied</th>
                <th className="p-4">CV Document Spec</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 font-bold text-slate-705">
              {filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400 font-bold">
                    No submitted job applications archived yet. Active website career apply submissions will reflect here in real-time.
                  </td>
                </tr>
              ) : (
                filteredApps.map(app => (
                  <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-4 space-y-1">
                      <div className="text-sm font-black text-slate-900">{app.name}</div>
                      <div className="text-[11px] text-slate-500 font-bold">Email: {app.email}</div>
                      <div className="text-[11px] text-emerald-600">Tel: {app.phone}</div>
                    </td>
                    <td className="p-4">
                      <span className="text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-100 rounded px-2 py-1 uppercase">{app.jobTitle}</span>
                      <div className="text-[9px] text-slate-400 mt-1">Job ID Link: {app.jobId}</div>
                    </td>
                    <td className="p-4 text-slate-500 font-medium">{new Date(app.createdAt).toLocaleString()}</td>
                    <td className="p-4 font-mono text-[11px] text-slate-600">
                      {app.cvFileName ? (
                        <span className="text-emerald-600 font-black flex items-center gap-1.5 bg-emerald-50 p-1.5 rounded-lg border border-emerald-200/40 w-fit">
                          <CheckCircle className="w-3.5 h-3.5" />
                          {app.cvFileName.length > 25 ? app.cvFileName.substring(0, 22) + '...' : app.cvFileName}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium italic">No file uploaded</span>
                      )}
                    </td>
                    <td className="p-4 text-right space-x-1">
                      <button
                        onClick={() => setSelectedApp(app)}
                        className="bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-750 px-3 py-1.5 rounded-xl uppercase tracking-wider text-[10px] font-black cursor-pointer inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>

                      {app.cvFileData && (
                        <button
                          onClick={() => triggerDownloadCv(app)}
                          className="bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 px-3 py-1.5 rounded-xl uppercase tracking-wider text-[10px] font-black cursor-pointer inline-flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Get CV</span>
                        </button>
                      )}

                      {canEdit && (
                        <button
                          onClick={() => {
                            if (confirm(`Permantly discard candidates file and application from ${app.name}?`)) {
                              onDeleteJobApplication(app.id);
                            }
                          }}
                          className="bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white p-2 rounded-xl cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Inspect Application Modal Dialog */}
      {selectedApp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border rounded-3xl w-full max-w-lg p-6 shadow-2xl relative animate-fade-in text-left">
            <button
              onClick={() => setSelectedApp(null)}
              className="absolute top-4 right-4 text-slate-450 hover:text-slate-750 cursor-pointer p-1"
            >
              <XIcon className="w-5 h-5" />
            </button>

            <div className="space-y-4">
              <div className="border-b pb-3 text-left">
                <span className="text-[9px] font-black uppercase text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded border border-indigo-200/30">
                  Candidate Dossier Detail
                </span>
                <h2 className="text-lg font-black text-slate-900 mt-1 uppercase tracking-tight">
                  {selectedApp.name}
                </h2>
                <p className="text-[11px] text-slate-500 font-bold">
                  Applying for position: <span className="text-emerald-700 font-extrabold">{selectedApp.jobTitle}</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs text-slate-705 font-bold bg-slate-50 p-3.5 rounded-2xl border">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Email Contact</span>
                  <p className="text-slate-800 font-extrabold">{selectedApp.email}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Mobile Number</span>
                  <p className="text-slate-800 font-extrabold">{selectedApp.phone}</p>
                </div>
                <div className="col-span-2 pt-2 border-t border-slate-200 mt-2">
                  <span className="text-[10px] text-slate-400 block uppercase">Cover Letter / Cover Statement</span>
                  <p className="text-slate-800 font-medium whitespace-pre-wrap leading-relaxed mt-1">{selectedApp.coverLetter || 'No cover letter attached.'}</p>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t">
                {selectedApp.cvFileData && (
                  <button
                    onClick={() => triggerDownloadCv(selectedApp)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4.5 py-2.5 rounded-xl text-xs uppercase tracking-wider cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download CV Doc</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedApp(null)}
                  className="bg-slate-100 hover:bg-slate-200 px-4.5 py-2.5 rounded-xl text-xs font-black uppercase cursor-pointer"
                >
                  Close Dossier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Post Position Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center z-[999] p-4 text-left">
          <div className="bg-white border rounded-3xl w-full max-w-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-4">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-slate-450 hover:text-slate-705 cursor-pointer p-1"
            >
              <XIcon className="w-5 h-5" />
            </button>

            <div className="border-b pb-3 text-left">
              <span className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-300/30">
                Job Posting Creation Utility
              </span>
              <h2 className="text-base font-black text-slate-900 uppercase tracking-tight mt-1">
                Post New Job Opportunity
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Provide parameters for all 10 structural segments to guide prospective candidates.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-bold text-slate-705">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase">Job Title / Vacancy Name *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    className="w-full bg-slate-50 border rounded-xl p-2.5 mt-1 text-slate-800 font-extrabold focus:bg-white"
                    placeholder="e.g. Senior Accessories Merchandiser"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase">Operating Department / Squad *</label>
                  <select
                    value={dept}
                    onChange={e => setDept(e.target.value)}
                    className="w-full bg-slate-50 border rounded-xl p-2.5 mt-1 text-slate-800 focus:bg-white cursor-pointer"
                  >
                    <option value="Merchandising">Merchandising (মার্কেট/কন্ট্যাক্টস)</option>
                    <option value="Production Unit">Production Unit (প্রোডাকশন ফ্লোর)</option>
                    <option value="AQ Department">AQ Department (কোয়ালিটি কন্ট্রোল)</option>
                    <option value="Store & Logistics">Store &amp; Logistics (ইনভেন্টরি)</option>
                    <option value="Accounts & Finance">Accounts &amp; Finance (হিসাবরক্ষণ)</option>
                    <option value="Maintenance Department">Maintenance Department (মেইনটেন্যান্স)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase">Workplace Type *</label>
                  <select
                    value={workplace}
                    onChange={e => setWorkplace(e.target.value)}
                    className="w-full bg-slate-50 border rounded-xl p-2.5 mt-1 text-slate-800 focus:bg-white cursor-pointer"
                  >
                    <option value="Onsite Home Office">Onsite (হেড অফিস)</option>
                    <option value="Factory Floor">Factory Floor (কারখানা ফ্লোর)</option>
                    <option value="Remote Operations">Remote (দূরবর্তী কাজ)</option>
                    <option value="Hybrid Schedule">Hybrid Schedule (হাইব্রিড)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 uppercase">Employment Status *</label>
                  <select
                    value={employmentStatus}
                    onChange={e => setEmploymentStatus(e.target.value)}
                    className="w-full bg-slate-50 border rounded-xl p-2.5 mt-1 text-slate-800 focus:bg-white cursor-pointer"
                  >
                    <option value="Full-time">Full-time (স্থায়ী)</option>
                    <option value="Contractual">Contractual (চুক্তিভিত্তিক)</option>
                    <option value="Part-time">Part-time (খন্ডকালীন)</option>
                    <option value="Apprenticeship">Apprenticeship (ইন্টার্নশিপ)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 uppercase">Application Deadline *</label>
                  <input
                    type="date"
                    required
                    value={deadline}
                    onChange={e => setDeadline(e.target.value)}
                    className="w-full bg-slate-50 border rounded-xl p-2.5 mt-1 text-slate-800 focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] text-slate-450 uppercase">Job Location / Station address *</label>
                  <input
                    type="text"
                    required
                    value={jobLocation}
                    onChange={e => setJobLocation(e.target.value)}
                    className="w-full bg-slate-50 border rounded-xl p-2 mt-1 text-slate-800 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-450 uppercase">Educational Requirements * (e.g. Graduate/Diploma)</label>
                    <textarea
                      required
                      value={education}
                      onChange={e => setEducation(e.target.value)}
                      placeholder="e.g. Bachelor degree in garments manufacturing from NIFT or textile college."
                      className="w-full bg-slate-50 border rounded-xl p-2 h-16 mt-0.5 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-450 uppercase">Required Experience * (e.g. years, context)</label>
                    <textarea
                      required
                      value={experience}
                      onChange={e => setExperience(e.target.value)}
                      placeholder="e.g. At least 3 years active merch operation tracking satin care ribbon manufacturing."
                      className="w-full bg-slate-50 border rounded-xl p-2 h-16 mt-0.5 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-450 uppercase">Additional Requirements (অন্যান্য প্রয়োজনীয়তা)</label>
                    <textarea
                      value={additionalRequirements}
                      onChange={e => setAdditionalRequirements(e.target.value)}
                      placeholder="e.g. Good mastery over standard Pantone design matching and communication."
                      className="w-full bg-slate-50 border rounded-xl p-2 h-16 mt-0.5 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-450 uppercase">Responsibilities &amp; Context </label>
                    <textarea
                      value={responsibilities}
                      onChange={e => setResponsibilities(e.target.value)}
                      placeholder="e.g. Inspect print layout errors, review test specimen bands, ensure minimal wastage."
                      className="w-full bg-slate-50 border rounded-xl p-2 h-16 mt-0.5 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-450 uppercase">Skills &amp; Expertise </label>
                    <textarea
                      value={skills}
                      onChange={e => setSkills(e.target.value)}
                      placeholder="e.g. Heat transfer operating machinery, standard ERP entry logistics handling."
                      className="w-full bg-slate-50 border rounded-xl p-2 h-16 mt-0.5 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-450 uppercase">Compensation &amp; Other Benefits</label>
                    <textarea
                      value={benefits}
                      onChange={e => setBenefits(e.target.value)}
                      placeholder="e.g. BDT 45,000 monthly, mobile allowance, dual annual festival bonuses."
                      className="w-full bg-slate-50 border rounded-xl p-2 h-16 mt-0.5 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 px-5 py-2.5 rounded-xl uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-6 py-2.5 rounded-xl uppercase tracking-wider"
                >
                  Publish Opening
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple internal X icon representation
function XIcon({ className = "w-5 h-5" }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
