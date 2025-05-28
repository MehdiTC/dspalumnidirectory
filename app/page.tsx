"use client";
import Link from 'next/link'
import Image from 'next/image'
import { useState, useMemo, useRef, useEffect } from 'react'
import React from 'react'
import ProfileModal, { Profile } from '../components/ProfileModal'
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react'
import posthog from '../lib/posthog'
import JoinWizard from '../components/JoinWizard'
import { useRouter } from 'next/navigation'

type MemberProfile = {
  name: string
  role: string
  pledgeClass: string
  linkedinUrl?: string
  email: string
  major: string
  location: string
  company: string
  sphere?: string[]
}

// Sample member data
const memberProfiles: MemberProfile[] = [
  {
    name: "Michael Thompson",
    role: "Analyst @ Goldman Sachs",
    pledgeClass: "Fall '24",
    linkedinUrl: "https://linkedin.com/in/michaelthompson",
    email: "michael.t@example.com",
    major: "Economics",
    location: "USA",
    company: "Goldman Sachs"
  },
  {
    name: "Sarah Chen",
    role: "Product Manager @ Stripe",
    pledgeClass: "Spring '23",
    linkedinUrl: "https://linkedin.com/in/sarahchen",
    email: "sarah.chen@example.com",
    major: "Computer Science",
    location: "UAE",
    company: "Stripe"
  },
  {
    name: "James Wilson",
    role: "Investment Banking @ JPMorgan",
    pledgeClass: "Fall '22",
    linkedinUrl: "https://linkedin.com/in/jameswilson",
    email: "james.wilson@example.com",
    major: "Business",
    location: "Morocco",
    company: "JPMorgan"
  }
]

// Helper function to get initials
const getInitials = (name: string) => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
}

// Helper to get unique values for dropdowns
const getUniqueOptions = (arr: MemberProfile[], key: keyof MemberProfile): string[] => {
  // Handle array fields like 'sphere' specially
  const opts = Array.from(new Set(arr.flatMap(item => {
    const val = item[key];
    if (Array.isArray(val)) return val;
    return typeof val === 'string' ? [val] : [];
  }))).filter(Boolean);
  return opts.sort();
};

// Helper to convert pledge class to sortable number (e.g., Fall '24 -> 2024.2, Spring '24 -> 2024.1)
const pledgeClassToNumber = (pc: string): number => {
  const match = pc.match(/(Fall|Spring) '\d{2}/);
  if (!match) return 0;
  const [season, year] = pc.split(" '");
  const y = parseInt('20' + year, 10);
  return y + (season === 'Fall' ? 0.2 : 0.1);
};

// Multi-select component
function MultiSelect({
  options,
  selected,
  setSelected,
  placeholder,
  inputClassName
}: {
  options: string[];
  selected: string[];
  setSelected: (opts: string[]) => void;
  placeholder: string;
  inputClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const filtered = useMemo(() =>
    options.filter(opt =>
      opt.toLowerCase().includes(search.toLowerCase()) && !selected.includes(opt)
    ), [options, search, selected]);

  return (
    <div className={`relative w-full sm:w-48 ${inputClassName || ''}`} ref={ref}>
      <div
        className="flex items-center px-3 py-2 border border-gray-200 rounded-md bg-white cursor-pointer min-h-[40px] hover:border-gray-300 transition"
        onClick={() => setOpen(v => !v)}
      >
        <input
          className="flex-1 bg-transparent outline-none text-sm"
          placeholder={placeholder}
          value={search}
          onChange={e => setSearch(e.target.value)}
          onFocus={() => setOpen(true)}
        />
        <svg className="w-4 h-4 text-gray-400 ml-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </div>
      {open && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
          {filtered.length === 0 && <div className="px-4 py-2 text-gray-400 text-sm">No options</div>}
          {filtered.map(opt => (
            <div
              key={opt}
              className="px-4 py-2 text-sm hover:bg-gray-50 cursor-pointer"
              onClick={() => {
                setSelected([...selected, opt]);
                setSearch('');
              }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
      {/* Tags */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selected.map(opt => (
            <span key={opt} className="flex items-center bg-[#012169]/10 text-[#012169] text-xs px-2 py-1 rounded-full">
              {opt}
              <button
                className="ml-1 text-[#012169] hover:text-red-500 focus:outline-none"
                onClick={e => {
                  e.stopPropagation();
                  setSelected(selected.filter(o => o !== opt));
                }}
                aria-label={`Remove ${opt}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Home() {
  // Filtering state
  const [search, setSearch] = useState('');
  const [spheres, setSpheres] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [sortChron, setSortChron] = useState(true);

  // Modal state
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editProfile, setEditProfile] = useState<Profile | null>(null);
  const [pendingEditProfile, setPendingEditProfile] = useState<Profile | null>(null);

  // Directory data
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [errorProfiles, setErrorProfiles] = useState<string | null>(null);

  const supabase = useSupabaseClient();
  const user = useUser();

  // Join Directory state
  const [joinWizardOpen, setJoinWizardOpen] = useState(false);

  const router = useRouter();

  // Fetch profiles from Supabase
  async function fetchProfiles() {
    setLoadingProfiles(true);
    setErrorProfiles(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProfiles(data || []);
    } catch (err: any) {
      setErrorProfiles(err.message || 'Failed to load profiles.');
    } finally {
      setLoadingProfiles(false);
    }
  }

  useEffect(() => {
    fetchProfiles();
  }, []);

  // Filtering logic
  const filteredProfiles = useMemo(() => {
    let filtered = profiles.filter(member => {
      const searchString = [
        member.name,
        member.role,
        member.company,
        member.pledgeClass,
        member.email,
        member.location,
        (member.sphere || []).join(' ')
      ].join(' ').toLowerCase();
      const matchesSearch = searchString.includes(search.toLowerCase());
      const matchesSpheres = spheres.length === 0 || (member.sphere || []).some((s: string) => spheres.includes(s));
      const matchesLocations = locations.length === 0 || locations.includes(member.location);
      return matchesSearch && matchesSpheres && matchesLocations;
    });
    filtered = filtered.sort((a, b) => {
      const aNum = pledgeClassToNumber(a.pledgeClass);
      const bNum = pledgeClassToNumber(b.pledgeClass);
      return sortChron ? bNum - aNum : aNum - bNum;
    });
    return filtered;
  }, [search, spheres, locations, sortChron, profiles]);

  // Track search/filter usage
  useEffect(() => {
    if (search || spheres.length > 0 || locations.length > 0) {
      posthog.capture('used_search', { search, spheres, locations });
    }
  }, [search, spheres, locations]);

  // Dropdown options
  const sphereOptions = useMemo(() => getUniqueOptions(profiles as MemberProfile[], 'sphere').flat().filter(Boolean), [profiles]);
  const locationOptions = useMemo(() => getUniqueOptions(profiles as MemberProfile[], 'location'), [profiles]);

  // Clear all
  const clearAll = () => {
    setSearch('');
    setSpheres([]);
    setLocations([]);
    setSortChron(true);
  };

  // Modal open/close handlers
  const handleCardClick = (profile: Profile) => {
    setSelectedProfile(profile);
    setModalOpen(true);
  };
  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedProfile(null);
  };

  // Find the logged-in user's profile
  const myProfile = useMemo(() => {
    if (!user) return null;
    return profiles.find((p) => p.user_id === user.id) || null;
  }, [profiles, user]);

  // Open edit profile flow after modal closes
  useEffect(() => {
    if (!modalOpen && pendingEditProfile) {
      const timer = setTimeout(() => {
        setEditProfile(pendingEditProfile);
        setPendingEditProfile(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [modalOpen, pendingEditProfile]);

  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative h-[32vh] min-h-[340px] flex items-center border-b border-gray-100 overflow-hidden">
        {/* Background image with overlay */}
        <div className="absolute inset-0 w-full h-full">
        <Image
            src="/dukeChapel.png"
            alt="Duke campus background"
            fill
            style={{ objectFit: 'cover' }}
          priority
        />
          <div className="absolute inset-0 bg-[#012169]/80" aria-hidden="true" />
        </div>
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-center h-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-md overflow-hidden">
            <Image
                  src="/dspLogo2.png"
                  alt="Delta Sigma Pi logo"
                  width={70}
                  height={70}
                  className="object-cover object-center max-w-full max-h-full"
                  priority
                />
              </div>
              <h1 className="text-lg font-semibold text-white tracking-tight">
                Delta Sigma Pi — Duke University
              </h1>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              {/* Only show View Profile in header if user has a profile */}
              {user && myProfile && (
                <button
                  className="px-3 sm:px-5 py-2 text-sm sm:text-base font-bold border-2 border-[#012169] text-[#012169] bg-white rounded-md shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#012169] whitespace-nowrap"
                  onClick={() => setEditProfile(myProfile)}
                >
                  View Profile
                </button>
              )}
              {user ? (
                <button
                  onClick={() => supabase.auth.signOut()}
                  className="px-3 sm:px-4 py-2 text-sm font-semibold border-2 border-[#012169] text-[#012169] bg-white rounded-md shadow-sm hover:shadow-md transition whitespace-nowrap"
                >
                  Log out
                </button>
              ) : (
                <Link
                  href="/login"
                  className="px-3 sm:px-5 py-2 text-sm sm:text-base font-bold border-2 border-[#012169] text-[#012169] bg-white rounded-md shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#012169] whitespace-nowrap"
                >
                  Sign in
                </Link>
              )}
              {/* Join Directory button opens JoinWizard */}
              <button
                className="px-3 sm:px-5 py-2 text-sm sm:text-base font-bold border-2 border-[#012169] text-[#012169] bg-white rounded-md shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#012169] disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                onClick={() => {
                  if (!user) {
                    router.push('/login');
                  } else {
                    setJoinWizardOpen(true);
                  }
                }}
                disabled={!!myProfile}
              >
                {user ? 'Join Directory' : 'Sign in to Join'}
              </button>
            </div>
          </div>

          {/* Hero Content */}
          <div className="max-w-3xl">
            <h2 className="text-5xl sm:text-6xl font-extrabold font-sans tracking-tight text-white mb-4 drop-shadow-[0_2px_8px_rgba(1,33,105,0.5)]">
              DSP Alumni Directory
            </h2>
            <p className="text-2xl font-medium font-sans text-white/90 drop-shadow-[0_1px_4px_rgba(1,33,105,0.4)]">
              Connect with Duke DSP alumni across industries and generations.
            </p>
          </div>
        </div>
      </section>

      {/* Directory Section */}
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Directory Toolbar */}
          <div className="flex flex-col gap-2 mb-8 border-b border-gray-100 pb-6">
            <div className="flex flex-row items-center justify-between gap-4 flex-wrap">
              <span className="text-sm font-medium text-gray-600 uppercase tracking-wide">Filters & Search</span>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 w-full md:w-auto">
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search name, role, company, major…"
                  className="h-10 w-48 sm:w-64 px-3 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#012169] placeholder-gray-400 bg-white transition"
                />
                <MultiSelect
                  options={sphereOptions}
                  selected={spheres}
                  setSelected={setSpheres}
                  placeholder="Sphere"
                  inputClassName="h-10 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#012169] placeholder-gray-400"
                />
                <MultiSelect
                  options={locationOptions}
                  selected={locations}
                  setSelected={setLocations}
                  placeholder="Location"
                  inputClassName="h-10 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#012169] placeholder-gray-400"
                />
                <div className="flex items-center">
                  <button
                    className="flex items-center h-10 px-3 text-sm font-medium border border-gray-300 rounded-md bg-white hover:bg-gray-50 transition focus:outline-none focus:ring-1 focus:ring-[#012169]"
                    onClick={() => setSortChron(v => !v)}
                  >
                    <span className="mr-1">Sort by Class</span>
                    <svg className={`w-4 h-4 text-[#012169] transition-transform ${sortChron ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                  </button>
                </div>
                <button
                  onClick={clearAll}
                  className="h-10 px-3 text-sm font-medium text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition focus:outline-none focus:ring-1 focus:ring-[#012169]"
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>

          {/* Member Grid */}
          {loadingProfiles ? (
            <div className="text-center text-gray-500 py-12">Loading profiles…</div>
          ) : errorProfiles ? (
            <div className="text-center text-red-500 py-12">{errorProfiles}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredProfiles.map((member, index) => (
                <div
                  key={member.id || index}
                  className="relative group p-6 hover:bg-gray-50 transition-colors border border-gray-100 cursor-pointer"
                  onClick={() => handleCardClick(member)}
                  tabIndex={0}
                  role="button"
                  aria-label={`View profile for ${member.name}`}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleCardClick(member); }}
                >
                  <div className="flex items-start space-x-4">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {member.profile_picture_url ? (
                        <img
                          src={member.profile_picture_url}
                          alt={member.name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-[#012169]"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-[#012169] flex items-center justify-center text-white text-sm font-medium">
                          {getInitials(member.name)}
                        </div>
                      )}
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-medium text-gray-900">{member.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{member.role} @ {member.company}</p>
                      <p className="text-sm text-gray-500 mt-1">{member.pledgeClass}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {(member.sphere || []).map((s: string) => (
                          <span key={s} className="px-2 py-0.5 bg-[#012169]/10 text-[#012169] text-xs rounded-full font-medium">{s}</span>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{member.location}</p>
                    </div>
                    {/* LinkedIn Icon */}
                    {member.linkedinUrl && (
                      <div className="flex-shrink-0">
                        <Link
                          href={member.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => posthog.capture('clicked_linkedin', { user_id: member.user_id, url: member.linkedinUrl })}
                          className="text-gray-400 hover:text-[#012169]"
                        >
                          <svg 
                            className="w-5 h-5" 
                            fill="currentColor" 
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                          </svg>
                        </Link>
                      </div>
                    )}
                  </div>
                  {/* Edit Profile button in bottom right */}
                  {user && member.user_id === user.id && (
                    <button
                      className="absolute bottom-3 right-3 px-2 py-1 text-xs font-semibold border border-[#012169] text-[#012169] bg-white rounded hover:bg-[#012169]/10 transition z-10"
                      onClick={e => {
                        e.stopPropagation();
                        setPendingEditProfile(member);
                        setModalOpen(false);
                      }}
                    >
                      Edit Profile
                    </button>
                  )}
                </div>
              ))}
              {filteredProfiles.length === 0 && (
                <div className="col-span-full text-center text-gray-400 py-12 text-lg">
                  {user ? 'No profiles found matching your filters.' : 'Sign in to view profiles!'}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
      {/* View Profile Modal */}
      <ProfileModal
        open={modalOpen}
        onClose={handleModalClose}
        profile={selectedProfile}
        onEdit={() => {
          fetchProfiles();
        }}
      />
      {/* Edit Profile Modal */}
      <ProfileModal
        open={!!editProfile}
        onClose={() => {
          setEditProfile(null);
          fetchProfiles();
        }}
        profile={editProfile}
        onEdit={() => {
          setEditProfile(null);
          fetchProfiles();
        }}
      />
      {/* Join Directory Modal */}
      <JoinWizard
        open={joinWizardOpen}
        onClose={() => setJoinWizardOpen(false)}
        onSuccess={() => {
          setJoinWizardOpen(false);
          fetchProfiles();
        }}
      />
    </main>
  )
}
